"""Paragraph-aware sliding-window chunker.

Strategy: within each block, split on paragraph boundaries, then sentences if a
paragraph is still too long, and pack pieces greedily up to ``chunk_size``
characters.  Consecutive chunks share ``overlap`` characters of tail context so
a fact straddling a boundary is still retrievable.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

from .parsing import Block

_SENTENCE_RE = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9(\"'])")


@dataclass
class ChunkDraft:
    index: int
    text: str
    page: int | None
    heading: str | None


def _split_long(piece: str, limit: int) -> list[str]:
    if len(piece) <= limit:
        return [piece]
    sentences = _SENTENCE_RE.split(piece)
    out: list[str] = []
    cur = ""
    for s in sentences:
        if len(s) > limit:  # pathological run-on: hard split
            if cur:
                out.append(cur)
                cur = ""
            out.extend(s[i : i + limit] for i in range(0, len(s), limit))
            continue
        if cur and len(cur) + 1 + len(s) > limit:
            out.append(cur)
            cur = s
        else:
            cur = f"{cur} {s}".strip()
    if cur:
        out.append(cur)
    return out


def _pieces(block: Block, limit: int) -> list[str]:
    paragraphs = [p.strip() for p in block.text.split("\n\n") if p.strip()]
    pieces: list[str] = []
    for p in paragraphs:
        pieces.extend(_split_long(p, limit))
    return pieces


def _tail(text: str, overlap: int) -> str:
    if overlap <= 0 or len(text) <= overlap:
        return text if overlap > 0 and len(text) <= overlap else ""
    tail = text[-overlap:]
    # start the overlap at a word boundary
    space = tail.find(" ")
    return tail[space + 1 :] if space != -1 else tail


def chunk_blocks(blocks: list[Block], chunk_size: int = 900, overlap: int = 150) -> list[ChunkDraft]:
    if chunk_size <= 0:
        raise ValueError("chunk_size must be positive")
    overlap = max(0, min(overlap, chunk_size // 2))

    drafts: list[ChunkDraft] = []
    for block in blocks:
        cur = ""
        for piece in _pieces(block, chunk_size):
            if cur and len(cur) + 2 + len(piece) > chunk_size:
                drafts.append(ChunkDraft(len(drafts), cur, block.page, block.heading))
                cur = f"{_tail(cur, overlap)}\n\n{piece}".strip() if overlap else piece
                # if the overlap alone made it too big, drop the overlap
                if len(cur) > chunk_size:
                    cur = piece
            else:
                cur = f"{cur}\n\n{piece}".strip()
        if cur:
            drafts.append(ChunkDraft(len(drafts), cur, block.page, block.heading))

    # Merge a tiny trailing chunk into its predecessor (same block) for cleanliness.
    merged: list[ChunkDraft] = []
    for d in drafts:
        if (
            merged
            and len(d.text) < chunk_size // 5
            and merged[-1].page == d.page
            and merged[-1].heading == d.heading
            and len(merged[-1].text) + len(d.text) + 2 <= int(chunk_size * 1.25)
        ):
            merged[-1].text = f"{merged[-1].text}\n\n{d.text}"
        else:
            merged.append(ChunkDraft(len(merged), d.text, d.page, d.heading))
    return merged
