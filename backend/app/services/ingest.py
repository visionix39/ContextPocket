"""Document ingestion: store file -> parse -> chunk -> embed -> index."""
from __future__ import annotations

import re
import shutil
import uuid
from pathlib import Path

from sqlalchemy.orm import Session

from ..config import get_settings
from ..models import Chunk, Document
from .chunking import chunk_blocks
from .embeddings import get_embedder
from .parsing import detect_file_type, parse_file
from .vectorstore import get_vector_store

# Pastel palette matching the dashboard cards.
PALETTE = ["coral", "aqua", "lavender", "sunny", "mint", "peach", "sky", "rose"]


def pick_color(subject: str) -> str:
    """Stable colour per subject so the same class always gets the same card."""
    h = sum(ord(c) for c in subject.lower())
    return PALETTE[h % len(PALETTE)]


def title_from_filename(filename: str) -> str:
    stem = Path(filename).stem
    stem = re.sub(r"[_\-]+", " ", stem)
    stem = re.sub(r"\s+", " ", stem).strip()
    return stem[:1].upper() + stem[1:] if stem else filename


def _store_upload(src: Path | bytes, filename: str) -> Path:
    settings = get_settings()
    safe_name = re.sub(r"[^A-Za-z0-9._-]", "_", filename)
    dest = settings.uploads_dir / f"{uuid.uuid4().hex[:8]}_{safe_name}"
    if isinstance(src, bytes):
        dest.write_bytes(src)
    else:
        shutil.copyfile(src, dest)
    return dest


def ingest_bytes(
    db: Session,
    *,
    filename: str,
    content: bytes,
    subject: str | None = None,
    title: str | None = None,
) -> Document:
    file_type = detect_file_type(filename)
    subject = (subject or "General").strip() or "General"
    stored = _store_upload(content, filename)

    doc = Document(
        title=(title or title_from_filename(filename)).strip(),
        filename=filename,
        stored_path=str(stored),
        file_type=file_type,
        subject=subject,
        color=pick_color(subject),
        status="processing",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    try:
        _process(db, doc)
    except Exception:
        # Nothing useful to keep: drop the row, its chunks and the stored file so
        # the library never shows half-ingested entries. The API reports the error.
        db.rollback()
        chunk_ids = [c.id for c in db.query(Chunk.id).filter(Chunk.document_id == doc.id)]
        if chunk_ids:
            get_vector_store().remove(chunk_ids)
        db.query(Chunk).filter(Chunk.document_id == doc.id).delete()
        db.query(Document).filter(Document.id == doc.id).delete()
        db.commit()
        stored.unlink(missing_ok=True)
        raise
    return doc


def embedding_text(chunk: Chunk) -> str:
    """Heading + body, unless the body already opens with the heading line."""
    if chunk.heading and not chunk.text.startswith(chunk.heading):
        return f"{chunk.heading}\n{chunk.text}"
    return chunk.text


def _process(db: Session, doc: Document) -> None:
    settings = get_settings()
    blocks, page_count = parse_file(Path(doc.stored_path), doc.file_type)
    drafts = chunk_blocks(blocks, settings.chunk_size, settings.chunk_overlap)
    if not drafts:
        raise ValueError("No readable text found in this file (is it a scanned PDF?).")

    chunks = [
        Chunk(
            document_id=doc.id,
            index=d.index,
            text=d.text,
            page=d.page,
            heading=d.heading,
            char_count=len(d.text),
        )
        for d in drafts
    ]
    db.add_all(chunks)
    db.flush()  # assign ids

    # Prefix the heading so section context is part of the embedding.
    texts = [embedding_text(c) for c in chunks]
    vectors = get_embedder().encode(texts)
    get_vector_store().add([c.id for c in chunks], vectors)

    doc.page_count = page_count
    doc.char_count = sum(len(b.text) for b in blocks)
    doc.chunk_count = len(chunks)
    doc.status = "ready"
    doc.error = None
    db.commit()


def delete_document(db: Session, doc: Document) -> None:
    chunk_ids = [c.id for c in doc.chunks]
    get_vector_store().remove(chunk_ids)
    try:
        Path(doc.stored_path).unlink(missing_ok=True)
    except OSError:
        pass
    db.delete(doc)
    db.commit()


def rebuild_index(db: Session) -> int:
    """Re-embed every chunk (e.g. after switching embedding model)."""
    store = get_vector_store()
    store.reset()
    chunks = db.query(Chunk).order_by(Chunk.id).all()
    batch = 64
    for i in range(0, len(chunks), batch):
        part = chunks[i : i + batch]
        texts = [embedding_text(c) for c in part]
        store.add([c.id for c in part], get_embedder().encode(texts))
    return len(chunks)
