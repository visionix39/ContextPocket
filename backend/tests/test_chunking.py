from app.services.chunking import chunk_blocks
from app.services.parsing import Block, parse_markdown


def test_chunks_respect_size_and_overlap():
    para = "The quick brown fox jumps over the lazy dog. " * 20  # ~900 chars
    blocks = [Block(text="\n\n".join([para] * 4), page=1)]
    chunks = chunk_blocks(blocks, chunk_size=500, overlap=100)
    assert len(chunks) > 4
    assert all(len(c.text) <= 500 * 1.25 for c in chunks)
    assert [c.index for c in chunks] == list(range(len(chunks)))
    # overlap: the start of chunk 2 should appear near the end of chunk 1
    head = chunks[1].text[:40]
    assert head in chunks[0].text


def test_markdown_headings_are_tracked():
    md = "# Intro\n\nHello there.\n\n## Backpropagation\n\nChain rule applied layer by layer.\n\n```\ncode # not a heading\n```\n"
    blocks = parse_markdown(md)
    assert [b.heading for b in blocks] == ["Intro", "Backpropagation"]
    assert "code # not a heading" in blocks[1].text
    chunks = chunk_blocks(blocks, chunk_size=200, overlap=20)
    assert chunks[-1].heading == "Backpropagation"


def test_tiny_trailing_chunk_is_merged():
    blocks = [Block(text=("word " * 100).strip() + "\n\nshort tail.", page=3)]
    chunks = chunk_blocks(blocks, chunk_size=520, overlap=0)
    assert len(chunks) == 1
    assert chunks[0].text.endswith("short tail.")
    assert chunks[0].page == 3
