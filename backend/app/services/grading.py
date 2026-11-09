"""Scoring free-text answers against the reference, transparently.

Two cheap, explainable signals are combined:

* **similarity** – cosine similarity between the student's answer and the
  reference using the same local embedding model that powers search;
* **coverage**   – share of the reference's key terms the student mentioned.

The missing key terms are returned so the UI can show *what* was left out rather
than just a score.  Thresholds are deliberately generous: this is a study aid, and
Milestone 3 uses repeated attempts (not one grade) before calling a concept weak.
"""
from __future__ import annotations

import re

import numpy as np

from ..models import Question
from .embeddings import get_embedder
from .llm import _STOPWORDS

_GENERIC = frozenset(
    "used use using called known example examples thing things way ways often usually common "
    "different same first second next last also like much many well good bad every each".split()
)


def _stem(word: str) -> str:
    for suf in ("isation", "ization", "ations", "ation", "ising", "izing", "ises", "izes", "ised", "ized", "ing", "ies", "ers", "es", "ed", "er", "ly", "s"):
        if word.endswith(suf) and len(word) - len(suf) >= 3:
            return word[: -len(suf)]
    return word


def _tokens(text: str) -> list[str]:
    return re.findall(r"[a-z0-9][a-z0-9\-']*", text.lower())


def key_terms(text: str, limit: int = 8) -> list[str]:
    """Content words of the reference, in order of appearance, de-duplicated by stem."""
    out: list[str] = []
    seen: set[str] = set()
    for tok in _tokens(text):
        if len(tok) < 3 or tok in _STOPWORDS or tok in _GENERIC:
            continue
        st = _stem(tok)
        if st in seen:
            continue
        seen.add(st)
        out.append(tok)
    return out[:limit]


def grade_free_text(question: Question, answer: str) -> dict:
    reference = question.answer
    answer = answer.strip()
    if not answer:
        return {
            "verdict": "missed", "score": 0.0, "similarity": 0.0, "coverage": 0.0,
            "missing_terms": key_terms(reference)[:4],
        }
    ref_terms = key_terms(reference, limit=12)
    concept_terms = [t for t in _tokens(question.concept) if t not in _STOPWORDS]
    concept_stems = {_stem(t) for t in concept_terms}
    if concept_terms and all(_stem(t) in {_stem(w) for w in _tokens(question.prompt)} for t in concept_terms):
        # The prompt already names the concept ("Explain dropout…"), so repeating it earns nothing.
        ref_terms = [t for t in ref_terms if _stem(t) not in concept_stems]
    else:
        for t in concept_terms:  # otherwise the concept itself is a key term
            if _stem(t) not in {_stem(r) for r in ref_terms}:
                ref_terms.append(t)
    ans_stems = {_stem(t) for t in _tokens(answer)}
    hit = [t for t in ref_terms if _stem(t) in ans_stems]
    missing = [t for t in ref_terms if _stem(t) not in ans_stems]
    coverage = len(hit) / len(ref_terms) if ref_terms else 1.0

    emb = get_embedder()
    vecs = emb.encode([answer, reference])
    similarity = float(np.clip(np.dot(vecs[0], vecs[1]), 0.0, 1.0))

    # Short answers can't be judged on wording alone; lean on coverage for them.
    words = len(answer.split())
    w_sim = 0.65 if words >= 6 else 0.4
    score = w_sim * similarity + (1 - w_sim) * coverage
    if words < 3 and coverage < 0.34:
        score = min(score, 0.3)

    if score >= 0.72 or coverage >= 0.75:
        verdict = "correct"
    elif score >= 0.45 or coverage >= 0.4:
        verdict = "partial"
    else:
        verdict = "missed"
    return {
        "verdict": verdict,
        "score": round(score, 3),
        "similarity": round(similarity, 3),
        "coverage": round(coverage, 3),
        "missing_terms": missing[:4],
    }


def grade_mcq(question: Question, answer: str) -> dict:
    norm = lambda s: re.sub(r"\s+", " ", s.strip().lower())  # noqa: E731
    correct = norm(answer) == norm(question.answer)
    if not correct and answer.strip().isdigit():  # allow option index
        idx = int(answer.strip())
        opts = question.options
        correct = 0 <= idx < len(opts) and norm(opts[idx]) == norm(question.answer)
    return {
        "verdict": "correct" if correct else "missed",
        "score": 1.0 if correct else 0.0,
        "similarity": 1.0 if correct else 0.0,
        "coverage": 1.0 if correct else 0.0,
        "missing_terms": [] if correct else [question.answer],
    }


def grade(question: Question, answer: str) -> dict:
    result = grade_mcq(question, answer) if question.kind == "mcq" else grade_free_text(question, answer)
    result.update(question_id=question.id, reference=question.answer, explanation=question.explanation)
    return result
