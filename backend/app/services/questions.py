"""Quiz, short-answer and flashcard generation (Milestone 2).

Two generators share one output shape (``Draft``):

* ``llm_drafts``   – asks Ollama for JSON items and validates them strictly: the
  schema must parse, an MCQ answer must be one of exactly four options, and the
  ``evidence`` quote must actually occur in the source chunk.  Anything that fails
  is dropped rather than shown to the student.
* ``rule_drafts``  – a transparent, offline generator.  It finds *definitional
  sentences* ("Backpropagation is the algorithm that …", "ReLU (rectified linear
  unit) outputs …") and turns them into flashcards, short-answer prompts and
  cloze-style multiple choice with distractors drawn from other concepts in the
  same scope.  It is also used to top up when the LLM returns too few items.

Every draft carries the chunk it came from and a verbatim ``evidence`` span, so a
question can always be traced back to the student's own notes.
"""
from __future__ import annotations

import json
import math
import random
import re
import unicodedata
from collections import Counter
from dataclasses import dataclass, field

import httpx
from pydantic import BaseModel, ValidationError
from sqlalchemy.orm import Session, joinedload

from ..models import Chunk, Document
from .llm import OllamaClient, _STOPWORDS
from .search import search_chunks

KINDS = ("mcq", "short", "flashcard")


@dataclass
class Draft:
    chunk: Chunk
    kind: str
    prompt: str
    answer: str
    evidence: str
    concept: str
    options: list[str] = field(default_factory=list)
    explanation: str | None = None
    difficulty: int = 2
    generator: str = "rules"


# --------------------------------------------------------------------------- #
# Chunk selection
# --------------------------------------------------------------------------- #

def _scope_query(db: Session, subject: str | None, document_ids: list[int] | None):
    q = db.query(Chunk).join(Document).options(joinedload(Chunk.document)).filter(Document.status == "ready")
    if subject:
        q = q.filter(Document.subject == subject)
    if document_ids:
        q = q.filter(Chunk.document_id.in_(document_ids))
    return q


def scope_chunks(db: Session, subject: str | None, document_ids: list[int] | None, limit: int = 400) -> list[Chunk]:
    return _scope_query(db, subject, document_ids).order_by(Chunk.document_id, Chunk.index).limit(limit).all()


def select_chunks(
    db: Session,
    *,
    subject: str | None,
    document_ids: list[int] | None,
    topic: str | None,
    n: int,
    rng: random.Random,
) -> list[Chunk]:
    """Pick the chunks to write questions from.

    With a topic we take the most relevant passages (semantic search).  Without one
    we spread the picks evenly across every document in scope so a set covers the
    whole material rather than the first few pages.
    """
    if topic:
        hits = search_chunks(db, topic, k=max(n * 2, 6), document_ids=document_ids, subject=subject)
        ids = [h.chunk_id for h in hits]
        if ids:
            by_id = {c.id: c for c in _scope_query(db, subject, document_ids).filter(Chunk.id.in_(ids)).all()}
            return [by_id[i] for i in ids if i in by_id][: n * 2]
    pool = [c for c in scope_chunks(db, subject, document_ids) if c.char_count >= 160]
    if not pool:
        pool = scope_chunks(db, subject, document_ids)
    if len(pool) <= n:
        return pool
    by_doc: dict[int, list[Chunk]] = {}
    for c in pool:
        by_doc.setdefault(c.document_id, []).append(c)
    picked: list[Chunk] = []
    per_doc = max(1, math.ceil(n / len(by_doc)))
    for chunks in by_doc.values():
        if len(chunks) <= per_doc:
            picked.extend(chunks)
            continue
        stride = len(chunks) / per_doc
        for i in range(per_doc):
            lo, hi = int(i * stride), max(int(i * stride), int((i + 1) * stride) - 1)
            picked.append(chunks[rng.randint(lo, hi)])
    rng.shuffle(picked)
    return picked[:n]


# --------------------------------------------------------------------------- #
# Rule-based generator
# --------------------------------------------------------------------------- #

_SENT_RE = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9\"'(])")
_WORD = r"[A-Za-z][A-Za-z0-9\-']*"
_STRONG_VERBS = r"is|are|refers to|means|describes|denotes"
_VERBS = (
    _STRONG_VERBS
    + r"|measures|computes|outputs|converts|updates|uses|combines|accumulates|stores|applies|"
    r"standardi[sz]es|normali[sz]es|penali[sz]es|minimi[sz]es|maximi[sz]es|happens?|occurs?|zeroes|caps|"
    r"scales|produces|returns|learns|predicts|represents|captures|reduces|prevents|allows|lets|enables|"
    r"requires|controls|determines|defines|indicates|estimates|trains|maps|transforms|encodes|decodes|"
    r"detects|slides|downsamples|interleaves|retrieves|embeds|calls|decides|plans|executes|evaluates|"
    r"generates|runs|ends|works|involves|consists|contains|includes|provides|gives|takes|makes|holds|keeps"
)
_DEF_RE = re.compile(
    rf"^(?:(?:A|An|The)\s+)?(?P<term>{_WORD}(?:\s+{_WORD}){{0,4}}?)(?P<alias>\s*\([^)]{{2,60}}\))?\s+"
    rf"(?:\w+ly\s+)?(?P<verb>{_VERBS})\b",
)
_BAD_TERM_WORDS = frozenset(
    "it this that these those they there here which what who when where why how we you i he she one "
    "some many most all each every any such other another both few several our your their its his her "
    "and or but yet so if because at for in on with by as from into over under among between through "
    "without within after before during since although though unlike like surely however thus hence "
    "then also still even only just not no "
    "common same main key important typical usual general specific certain simple following above below "
    "slide slides note notes lecture lectures lecturer section chapter example examples figure table page "
    "translation translations".split()
)
_BAD_TERM_END = frozenset(
    "that which who and or of the a an to in on for with by as at from is are instead also then often "
    "usually sometimes typically generally "
    # a term should not end in a verb ("Ethical evaluation considers" + "ends ...")
    "considers asks requires includes means says makes takes gives shows uses needs helps keeps holds lets "
    "allows runs works calls has does".split()
)
_BAD_TERM_INNER = frozenset("a an the of".split())
_HEADING_LINE = re.compile(r"^[^\n.!?:;,]{3,60}$")


_TRAILING_HEADING = re.compile(r"(?<=[.!?])\s+([A-Z][^\n.!?:;,]{2,59})\n(?=[A-Z])")


def _drop_heading_lines(text: str) -> str:
    """Remove short title-like lines (no terminal punctuation) that PDFs leave inline.

    PyMuPDF sometimes glues a heading onto the end of the previous paragraph's last
    line ("... is applied. Gradient descent\nGradient descent updates ..."), so a
    capitalised, unpunctuated tail of a line followed by a newline is dropped too.
    """
    text = _TRAILING_HEADING.sub(lambda m: "\n" if len(m.group(1).split()) <= 8 else m.group(0), text)
    out: list[str] = []
    prev = ""
    for line in text.split("\n"):
        stripped = line.strip()
        is_heading = (
            bool(_HEADING_LINE.match(stripped))
            and len(stripped.split()) <= 8
            and (not prev or prev[-1] in ".!?")
        )
        out.append("" if is_heading else line)
        if stripped:
            prev = "" if is_heading else stripped
    return "\n".join(out)


def _sentences(chunk: Chunk) -> list[str]:
    body = chunk.text
    if chunk.heading and body.startswith(chunk.heading):
        body = body[len(chunk.heading):]
    body = _drop_heading_lines(body)
    body = re.sub(r"\n\s*[\-•\*]\s+", ". ", body)  # bullets become sentences
    body = re.sub(r"(?<=[.!?:;])\n\s*\n", " ", body)
    body = re.sub(r"\n\s*\n", ". ", body).replace("\n", " ")
    body = re.sub(r"\s+", " ", body)
    out = []
    for raw in _SENT_RE.split(body):
        s = raw.strip().lstrip("-•* ").strip()
        s = re.sub(r"^\d+\.\s+", "", s)  # numbered list marker
        s = re.sub(r"\.{2}(?!\.)", ".", s)
        if 40 <= len(s) <= 360 and s[-1] in ".!?":
            out.append(s)
    return out


def _norm(s: str) -> str:
    s = unicodedata.normalize("NFKC", s).lower()
    return re.sub(r"[^a-z0-9 ]", "", re.sub(r"\s+", " ", s)).strip()


def _content_terms(text: str) -> set[str]:
    return {t for t in re.findall(r"[a-z0-9][a-z0-9\-']+", text.lower()) if len(t) > 2 and t not in _STOPWORDS}


@dataclass
class Candidate:
    chunk: Chunk
    term: str
    sentence: str
    strong: bool
    alias: bool = False


def _extract_candidates(chunks: list[Chunk]) -> list[Candidate]:
    cands: list[Candidate] = []
    for c in chunks:
        for s in _sentences(c):
            m = _DEF_RE.match(s)
            if not m:
                continue
            term = m.group("term").strip()
            words = term.lower().split()
            if not words or len(words) > 5:
                continue
            if words[0] in _BAD_TERM_WORDS or words[-1] in _BAD_TERM_END or len(term) < 3:
                continue
            if any(w in _BAD_TERM_WORDS for w in words) or any(w in _BAD_TERM_INNER for w in words[1:-1]):
                continue
            if all(w in _STOPWORDS for w in words):
                continue
            strong = m.group("verb") in ("is", "are", "refers to", "means", "describes", "denotes")
            cands.append(Candidate(chunk=c, term=term, sentence=s, strong=strong, alias=bool(m.group("alias"))))
    return cands


def _term_frequencies(chunks: list[Chunk], terms: set[str]) -> Counter:
    text = " ".join(c.text for c in chunks).lower()
    return Counter({t: len(re.findall(rf"\b{re.escape(t.lower())}\b", text)) for t in terms})


def rule_drafts(
    chunks: list[Chunk],
    *,
    kinds: list[str],
    count: int,
    scope: list[Chunk],
    rng: random.Random,
) -> list[Draft]:
    """Deterministic, explainable generation from definitional sentences."""
    cands = _extract_candidates(chunks)
    pool_cands = _extract_candidates(scope) if scope else cands
    freq = _term_frequencies(scope or chunks, {c.term for c in cands} | {c.term for c in pool_cands})

    def good(c: Candidate) -> bool:
        # A concept worth testing is either mentioned more than once in the scope,
        # introduced with an acronym/alias, or defined with a multi-word name.
        return freq[c.term] >= 2 or c.alias or (c.strong and len(c.term.split()) >= 2)

    cands = [c for c in cands if good(c)]
    pool: dict[str, Candidate] = {}
    for c in pool_cands:
        if good(c) and c.term.lower() not in pool:
            pool[c.term.lower()] = c
    pool_list = sorted(pool.values(), key=lambda c: c.term.lower())
    if not cands:
        return []

    # One candidate per chunk per pass, so a set spreads across the material.
    by_chunk: dict[int, list[Candidate]] = {}
    for c in cands:
        by_chunk.setdefault(c.chunk.id, []).append(c)
    for lst in by_chunk.values():
        rng.shuffle(lst)
    ordered: list[Candidate] = []
    while any(by_chunk.values()):
        for cid in list(by_chunk):
            if by_chunk[cid]:
                ordered.append(by_chunk[cid].pop())

    drafts: list[Draft] = []
    used: set[tuple[str, str]] = set()
    kind_cycle = [kinds[i % len(kinds)] for i in range(count)]
    ci = 0
    for kind in kind_cycle:
        tries = 0
        while ci < len(ordered) and tries < len(ordered):
            cand = ordered[ci % len(ordered)]
            ci += 1
            tries += 1
            key = (cand.term.lower(), kind)
            if key in used:
                continue
            d = _draft_from_candidate(cand, kind, pool_list, rng)
            if d:
                used.add(key)
                drafts.append(d)
                break
        if len(drafts) >= count:
            break
    return drafts


def _mask_term(sentence: str, term: str) -> str | None:
    pattern = re.compile(rf"(?<![A-Za-z0-9\-]){re.escape(term)}(?![A-Za-z0-9\-])", re.IGNORECASE)
    if not pattern.search(sentence):
        return None
    masked = pattern.sub("______", sentence)
    masked = re.sub(r"\s*\([^)]*\)\s*", " ", masked, count=1) if masked.startswith("______ (") else masked
    return re.sub(r"\s+", " ", masked).strip()


def _stem_key(term: str) -> str:
    return " ".join(w[:-1] if len(w) > 4 and w.endswith("s") and not w.endswith("ss") else w for w in _norm(term).split())


def _distractors(c: Candidate, pool: list[Candidate], rng: random.Random, n: int = 3) -> list[str]:
    """Pick wrong options that look like the right one: same notes first, then same class."""
    term = c.term
    tw = set(_stem_key(term).split())
    others = [
        p for p in pool
        if _stem_key(p.term) != _stem_key(term) and _norm(p.term) not in _norm(term) and _norm(term) not in _norm(p.term)
        and not (set(_stem_key(p.term).split()) & tw)
    ]
    same_doc = [p for p in others if p.chunk.document_id == c.chunk.document_id]
    same_subject = [p for p in others if p.chunk.document.subject == c.chunk.document.subject]
    chosen: list[str] = []
    for bucket in (same_doc, same_subject, others):
        cands = [p.term for p in bucket if p.term not in chosen]
        similar = [t for t in cands if abs(len(t.split()) - len(term.split())) <= 1]
        for group in (similar, cands):
            rng.shuffle(group)
            for t in group:
                if len(chosen) >= n:
                    return chosen
                if _stem_key(t) not in {_stem_key(x) for x in chosen}:
                    chosen.append(t)
    return chosen if len(chosen) >= n else []


def _display_term(term: str) -> str:
    return term if term[:1].isupper() and term[1:2].isupper() else term[:1].upper() + term[1:]


def _is_plural(term: str) -> bool:
    last = term.split()[-1]
    return last.endswith("s") and not last.endswith("ss") and not last.isupper()


def _what_is(term: str) -> str:
    if _is_plural(term):
        return f"What are {term}?"
    return f"What is the {term}?" if term[:1].islower() else f"What is {term}?"


def _draft_from_candidate(c: Candidate, kind: str, pool: list[Candidate], rng: random.Random) -> Draft | None:
    heading = c.chunk.heading
    where = f" (from “{heading}”)" if heading else ""
    if kind == "flashcard":
        return Draft(
            chunk=c.chunk, kind=kind, prompt=_what_is(c.term), answer=c.sentence, evidence=c.sentence,
            concept=_display_term(c.term), explanation=None, difficulty=1,
        )
    if kind == "short":
        prompts = [
            f"Explain {c.term} in your own words{where}.",
            f"What does your note say about {c.term}? Describe it briefly.",
            f"Describe {c.term} and what it is used for{where}.",
        ]
        return Draft(
            chunk=c.chunk, kind=kind, prompt=rng.choice(prompts), answer=c.sentence, evidence=c.sentence,
            concept=_display_term(c.term), explanation=f"Your notes say: “{c.sentence}”", difficulty=3,
        )
    if kind == "mcq":
        masked = _mask_term(c.sentence, c.term)
        distractors = _distractors(c, pool, rng)
        if not masked or len(distractors) < 3:
            return None
        options = [_display_term(c.term), *[_display_term(d) for d in distractors]]
        rng.shuffle(options)
        prompt = f"Fill in the blank: {masked}" if rng.random() < 0.6 else f"Which concept does this describe? “{masked}”"
        return Draft(
            chunk=c.chunk, kind=kind, prompt=prompt, answer=_display_term(c.term), options=options,
            evidence=c.sentence, concept=_display_term(c.term), explanation=None, difficulty=2,  # the source quote is the explanation
        )
    return None


# --------------------------------------------------------------------------- #
# LLM generator (Ollama, JSON mode) with strict validation
# --------------------------------------------------------------------------- #

GENERATE_PROMPT = """You are ContextPocket, a study assistant. Write {n} practice items for a student revising
their OWN notes, using ONLY facts stated in the passage below. Return ONLY a JSON object:
{{"items": [ ... ]}}

Each item has these fields:
- "kind": one of {kinds}
- "question": the question text (for flashcards this is the FRONT of the card)
- "options": for "mcq" exactly 4 short answer options; for other kinds an empty list
- "answer": the correct answer; for "mcq" it must match one option EXACTLY (for flashcards this is the BACK)
- "explanation": 1-2 sentences explaining why the answer is right
- "concept": the concept being tested, 1-4 words
- "evidence": one sentence copied VERBATIM from the passage that supports the answer

Make MCQ distractors plausible but clearly wrong according to the passage. Vary the kinds: {kinds}.
Do not ask about anything the passage does not state.

Passage ({where}):
\"\"\"
{text}
\"\"\"
"""


class _LLMItem(BaseModel):
    kind: str
    question: str
    options: list[str] = []
    answer: str
    explanation: str | None = None
    concept: str = ""
    evidence: str = ""


class _LLMBatch(BaseModel):
    items: list[_LLMItem]


def _parse_json_object(text: str) -> dict | None:
    try:
        return json.loads(text)
    except ValueError:
        pass
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end <= start:
        return None
    try:
        return json.loads(text[start : end + 1])
    except ValueError:
        return None


def _locate_evidence(evidence: str, answer: str, chunk: Chunk) -> str | None:
    """Return a verbatim span from the chunk that backs the item, or None."""
    text = chunk.text
    if evidence and _norm(evidence) and _norm(evidence) in _norm(text):
        return evidence.strip()
    # Fall back to the chunk sentence that overlaps most with evidence + answer.
    target = _content_terms(f"{evidence} {answer}")
    if not target:
        return None
    best, best_overlap = None, 0.0
    for s in _sentences(chunk):
        overlap = len(target & _content_terms(s)) / len(target)
        if overlap > best_overlap:
            best, best_overlap = s, overlap
    return best if best and best_overlap >= 0.5 else None


def validate_llm_item(item: _LLMItem, chunk: Chunk, kinds: list[str]) -> Draft | None:
    kind = item.kind.strip().lower()
    if kind not in kinds or not item.question.strip() or not item.answer.strip():
        return None
    options: list[str] = []
    answer = item.answer.strip()
    if kind == "mcq":
        seen: dict[str, str] = {}
        for o in item.options:
            o = str(o).strip()
            if o and _norm(o) not in seen:
                seen[_norm(o)] = o
        options = list(seen.values())
        if len(options) < 4 or _norm(answer) not in seen:
            return None
        answer = seen[_norm(answer)]
        if len(options) > 4:  # keep the answer plus the first three distractors
            options = [answer, *[o for o in options if o != answer][:3]]
    evidence = _locate_evidence(item.evidence, answer, chunk)
    if not evidence:
        return None
    return Draft(
        chunk=chunk, kind=kind, prompt=item.question.strip(), answer=answer, options=options,
        evidence=evidence, concept=(item.concept or chunk.heading or "").strip()[:200],
        explanation=(item.explanation or "").strip() or None,
        difficulty={"flashcard": 1, "mcq": 2, "short": 3}[kind], generator="llm",
    )


def llm_drafts(client: OllamaClient, chunks: list[Chunk], *, kinds: list[str], count: int) -> list[Draft]:
    drafts: list[Draft] = []
    per_chunk = max(1, math.ceil(count / max(len(chunks), 1)))
    for chunk in chunks:
        if len(drafts) >= count:
            break
        doc = chunk.document
        where = doc.title + (f", p.{chunk.page}" if chunk.page else "") + (f" — {chunk.heading}" if chunk.heading else "")
        prompt = GENERATE_PROMPT.format(n=per_chunk, kinds=json.dumps(kinds), where=where, text=chunk.text)
        try:
            raw = client.generate(prompt, temperature=0.4, json_mode=True)
            data = _parse_json_object(raw)
            if data is None:
                continue
            if isinstance(data, list):
                data = {"items": data}
            batch = _LLMBatch.model_validate(data)
        except (httpx.HTTPError, ValidationError):
            continue
        for item in batch.items:
            d = validate_llm_item(item, chunk, kinds)
            if d:
                drafts.append(d)
    return drafts[:count]


# --------------------------------------------------------------------------- #
# Orchestration
# --------------------------------------------------------------------------- #

def generate_drafts(
    db: Session,
    *,
    kinds: list[str],
    count: int,
    subject: str | None,
    document_ids: list[int] | None,
    topic: str | None,
    seed: int | None = None,
) -> tuple[list[Draft], str, str | None]:
    """Return (drafts, generator, model). generator is 'llm', 'rules' or 'mixed'."""
    rng = random.Random(seed)
    kinds = [k for k in KINDS if k in kinds] or list(KINDS)
    client = OllamaClient()
    use_llm = client.is_available()
    n_chunks = max(3, math.ceil(count / 2)) if use_llm else max(6, count)
    chunks = select_chunks(db, subject=subject, document_ids=document_ids, topic=topic, n=n_chunks, rng=rng)
    if not chunks:
        return [], "rules", None
    scope = scope_chunks(db, subject, document_ids)

    drafts: list[Draft] = []
    model: str | None = None
    if use_llm:
        drafts = llm_drafts(client, chunks, kinds=kinds, count=count)
        model = client.model
    if len(drafts) < count:
        extra_chunks = chunks if not use_llm else select_chunks(
            db, subject=subject, document_ids=document_ids, topic=topic, n=max(6, count), rng=rng
        )
        have = {(d.kind, _norm(d.concept)) for d in drafts}
        for d in rule_drafts(extra_chunks, kinds=kinds, count=count * 2, scope=scope, rng=rng):
            if (d.kind, _norm(d.concept)) in have:
                continue
            drafts.append(d)
            have.add((d.kind, _norm(d.concept)))
            if len(drafts) >= count:
                break
    gens = {d.generator for d in drafts}
    generator = "mixed" if len(gens) > 1 else (gens.pop() if gens else "rules")
    return drafts, generator, model


def default_title(db: Session, *, topic: str | None, subject: str | None, document_ids: list[int] | None) -> str:
    if topic:
        t = topic.strip()
        return (t[:1].upper() + t[1:]) + " practice"
    if document_ids and len(document_ids) == 1:
        doc = db.get(Document, document_ids[0])
        if doc:
            return f"{doc.title} practice"
    return f"{subject} practice" if subject else "Mixed practice"
