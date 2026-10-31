"""Optional local LLM via Ollama, with an extractive fallback.

Milestone 1 only needs grounded answers with citations.  If Ollama is running
we ask it to answer *only* from the retrieved passages; if not, we return the
best passages verbatim so the feature still works offline with zero setup.
"""
from __future__ import annotations

import re

import httpx

from ..config import get_settings
from ..schemas import SearchHit

ANSWER_PROMPT = """You are ContextPocket, a study assistant. Answer the student's question using ONLY the
numbered passages from their own notes below. Be concise (3-6 sentences). After each
claim cite the passage number in square brackets like [2]. If the passages do not
contain the answer, say so plainly and suggest what to look up.

Passages:
{passages}

Question: {question}
Answer:"""


class OllamaClient:
    def __init__(self) -> None:
        s = get_settings()
        self.base_url = s.ollama_base_url.rstrip("/")
        self.model = s.ollama_model
        self.timeout = s.ollama_timeout_s

    def is_available(self) -> bool:
        try:
            r = httpx.get(f"{self.base_url}/api/tags", timeout=1.5)
            if r.status_code != 200:
                return False
            names = {m.get("name", "") for m in r.json().get("models", [])}
            # accept "llama3.2:3b" matching "llama3.2:3b" or bare "llama3.2"
            return any(n == self.model or n.split(":")[0] == self.model.split(":")[0] for n in names)
        except (httpx.HTTPError, ValueError):
            return False

    def generate(self, prompt: str, *, temperature: float = 0.2, json_mode: bool = False) -> str:
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": temperature},
        }
        if json_mode:
            payload["format"] = "json"
        r = httpx.post(f"{self.base_url}/api/generate", json=payload, timeout=self.timeout)
        r.raise_for_status()
        return r.json().get("response", "").strip()


def _format_passages(hits: list[SearchHit]) -> str:
    parts = []
    for i, h in enumerate(hits, start=1):
        where = f"{h.document_title}" + (f", p.{h.page}" if h.page else "") + (f" — {h.heading}" if h.heading else "")
        parts.append(f"[{i}] ({where})\n{h.text}")
    return "\n\n".join(parts)


_SENT_RE = re.compile(r"(?<=[.!?])\s+")
_STOPWORDS = frozenset(
    "the and for are but not you all any can her was one our out day get has him his how man new now old see "
    "two way who boy did its let put say she too use what when where which while why does doe did do is it "
    "this that these those with from into about than then them they their there here have had has been being "
    "will would should could may might must shall also just very more most some such only own same so no nor".split()
)


def _clean_sentence(sent: str) -> str:
    sent = re.sub(r"^[\-\u2022\*\u25aa\u25e6]+\s*", "", sent.strip())  # leading bullets
    sent = re.sub(r"\s+", " ", sent)
    return sent.strip()


def extractive_answer(question: str, hits: list[SearchHit], max_sentences: int = 4) -> str:
    """Pick the sentences from the top passages that overlap most with the question.

    Sentences are de-duplicated (the same note may exist as .md and .pdf) and at most
    two are taken from any single passage so the answer draws on several sources.
    """
    q_terms = {t for t in re.findall(r"[a-z0-9]+", question.lower()) if len(t) > 2 and t not in _STOPWORDS}
    scored: list[tuple[float, int, int, str]] = []
    for i, h in enumerate(hits, start=1):
        body = h.text
        if h.heading and body.startswith(h.heading):
            body = body[len(h.heading):]  # the heading line is not a sentence
        body = re.sub(r"(?<=[.!?:;])\n\s*\n", " ", body)  # paragraph break after punctuation
        body = re.sub(r"\n\s*\n", ". ", body).replace("\n", " ")  # otherwise treat as sentence end
        for pos, raw in enumerate(_SENT_RE.split(body)):
            sent = _clean_sentence(raw)
            if len(sent) < 25:
                continue
            terms = set(re.findall(r"[a-z0-9]+", sent.lower()))
            overlap = len(q_terms & terms) / (len(q_terms) or 1)
            if overlap == 0 and q_terms:
                continue  # a sentence sharing no content words with the question is not an answer
            scored.append((overlap + 0.15 * h.score, i, pos, sent))
    scored.sort(key=lambda x: x[0], reverse=True)

    chosen: list[tuple[float, int, int, str]] = []
    seen: set[str] = set()
    per_source: dict[int, int] = {}
    for item in scored:
        key = re.sub(r"[^a-z0-9]", "", item[3].lower())
        if key in seen or per_source.get(item[1], 0) >= 2:
            continue
        seen.add(key)
        per_source[item[1]] = per_source.get(item[1], 0) + 1
        chosen.append(item)
        if len(chosen) >= max_sentences:
            break
    if not chosen:
        return "I couldn't find anything in your notes about that yet. Try uploading more material or rephrasing."
    chosen.sort(key=lambda x: (x[1], x[2]))  # reading order: by source, then position
    return " ".join(f"{sent} [{i}]" for _, i, _, sent in chosen)


def answer_question(question: str, hits: list[SearchHit]) -> tuple[str, str, str | None]:
    """Return (answer, mode, model_name)."""
    if not hits:
        return (
            "Your library doesn't have anything relevant yet. Upload some notes and ask again!",
            "extractive",
            None,
        )
    client = OllamaClient()
    if client.is_available():
        try:
            prompt = ANSWER_PROMPT.format(passages=_format_passages(hits), question=question)
            text = client.generate(prompt)
            if text:
                return text, "llm", client.model
        except httpx.HTTPError:
            pass  # fall through to extractive
    return extractive_answer(question, hits), "extractive", None
