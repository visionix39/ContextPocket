"""Render a Markdown note to a simple multi-page PDF with PyMuPDF (for demos/tests).

Usage: .venv/bin/python scripts/make_sample_pdf.py ../sample_data/notes/deep_learning_fundamentals.md
"""
from __future__ import annotations

import html
import re
import sys
from pathlib import Path

import pymupdf

CSS = """
body { font-family: sans-serif; font-size: 11pt; line-height: 1.45; color: #1f2235; }
h1 { font-size: 22pt; color: #4f3fd1; margin-bottom: 6pt; }
h2 { font-size: 15pt; color: #6c5ce7; margin-top: 16pt; margin-bottom: 4pt; }
p { margin: 0 0 8pt 0; }
li { margin-bottom: 4pt; }
"""


def md_to_html(md: str) -> str:
    out: list[str] = []
    in_list = False
    para: list[str] = []

    def flush_para() -> None:
        if para:
            text = " ".join(para)
            text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", html.escape(text))
            out.append(f"<p>{text}</p>")
            para.clear()

    for line in md.splitlines():
        s = line.strip()
        if s.startswith("- "):
            flush_para()
            if not in_list:
                out.append("<ul>")
                in_list = True
            item = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", html.escape(s[2:]))
            out.append(f"<li>{item}</li>")
            continue
        if in_list and s and not s.startswith("- ") and line.startswith("  "):
            out[-1] = out[-1][:-5] + " " + html.escape(s) + "</li>"  # continuation line
            continue
        if in_list:
            out.append("</ul>")
            in_list = False
        m = re.match(r"^(#{1,2})\s+(.*)", s)
        if m:
            flush_para()
            tag = "h1" if len(m.group(1)) == 1 else "h2"
            out.append(f"<{tag}>{html.escape(m.group(2))}</{tag}>")
        elif not s:
            flush_para()
        else:
            para.append(s)
    flush_para()
    if in_list:
        out.append("</ul>")
    return "<body>" + "\n".join(out) + "</body>"


def render(md_path: Path, pdf_path: Path) -> int:
    story = pymupdf.Story(html=md_to_html(md_path.read_text(encoding="utf-8")), user_css=CSS)
    writer = pymupdf.DocumentWriter(str(pdf_path))
    rect = pymupdf.paper_rect("a4")
    where = rect + (54, 54, -54, -54)
    pages = 0
    more = True
    while more:
        dev = writer.begin_page(rect)
        more, _ = story.place(where)
        story.draw(dev)
        writer.end_page()
        pages += 1
    writer.close()
    return pages


if __name__ == "__main__":
    src = Path(sys.argv[1]).resolve()
    dst = src.with_suffix(".pdf")
    n = render(src, dst)
    print(f"wrote {dst} ({n} pages)")
