"""Turn uploaded files into a list of text blocks with light structure.

Each block carries an optional page number (PDF) and the heading it sits under
(Markdown).  Chunking works on these blocks so a chunk never silently crosses
a page or section boundary without recording it.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

SUPPORTED_EXTENSIONS = {".pdf": "pdf", ".md": "md", ".markdown": "md", ".txt": "txt"}


@dataclass
class Block:
    text: str
    page: int | None = None
    heading: str | None = None


class UnsupportedFileType(ValueError):
    pass


def detect_file_type(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise UnsupportedFileType(f"Unsupported file type '{ext}'. Upload a PDF, Markdown or text file.")
    return SUPPORTED_EXTENSIONS[ext]


_WHITESPACE_RE = re.compile(r"[ \t]+")
_MULTI_NEWLINE_RE = re.compile(r"\n{3,}")


_INLINE_MD_RE = re.compile(r"(\*\*|__)(.+?)\1|(?<!\w)[*_](.+?)[*_](?!\w)|`([^`\n]+)`")


def strip_inline_markdown(text: str) -> str:
    """**bold**, *em*, `code` -> plain words (links are left as-is)."""
    return _INLINE_MD_RE.sub(lambda m: m.group(2) or m.group(3) or m.group(4) or "", text)


def normalise(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    # join words hyphenated at line end ("regular-\nisation" -> "regularisation")
    text = re.sub(r"(\w)-\n(\w)", r"\1\2", text)
    text = _WHITESPACE_RE.sub(" ", text)
    text = "\n".join(line.strip() for line in text.split("\n"))
    text = _MULTI_NEWLINE_RE.sub("\n\n", text)
    return text.strip()


def parse_pdf(path: Path) -> tuple[list[Block], int]:
    import fitz  # PyMuPDF

    blocks: list[Block] = []
    with fitz.open(path) as doc:
        page_count = doc.page_count
        for page_no, page in enumerate(doc, start=1):
            text = normalise(page.get_text("text"))
            if text:
                blocks.append(Block(text=text, page=page_no))
    return blocks, page_count


_HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)$")
_FENCE_RE = re.compile(r"^(```|~~~)")


def parse_markdown(text: str) -> list[Block]:
    """Split Markdown into blocks per heading section (code fences kept intact)."""
    blocks: list[Block] = []
    heading: str | None = None
    buffer: list[str] = []
    in_fence = False

    def flush() -> None:
        body = normalise(strip_inline_markdown("\n".join(buffer)))
        if body:
            blocks.append(Block(text=body, heading=heading))
        buffer.clear()

    for line in text.replace("\r\n", "\n").split("\n"):
        if _FENCE_RE.match(line.strip()):
            in_fence = not in_fence
            buffer.append(line)
            continue
        m = None if in_fence else _HEADING_RE.match(line.strip())
        if m:
            flush()
            heading = m.group(2).strip().strip("#").strip() or None
            # keep the heading in the text too so it is embedded with its section
            buffer.append(heading or "")
        else:
            buffer.append(line)
    flush()
    return blocks


def parse_text(text: str) -> list[Block]:
    body = normalise(text)
    return [Block(text=body)] if body else []


def parse_file(path: Path, file_type: str) -> tuple[list[Block], int]:
    """Return (blocks, page_count)."""
    if file_type == "pdf":
        return parse_pdf(path)
    raw = path.read_text(encoding="utf-8", errors="replace")
    if file_type == "md":
        return parse_markdown(raw), 0
    return parse_text(raw), 0
