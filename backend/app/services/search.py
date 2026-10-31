from __future__ import annotations

from sqlalchemy.orm import Session, joinedload

from ..models import Chunk, Document
from ..schemas import SearchHit
from .embeddings import get_embedder
from .vectorstore import get_vector_store


def search_chunks(
    db: Session,
    query: str,
    k: int = 6,
    document_ids: list[int] | None = None,
    subject: str | None = None,
) -> list[SearchHit]:
    """Semantic search over chunks with optional post-filtering by document/subject.

    FAISS flat index has no metadata filter, so we over-fetch and filter in SQL.
    """
    qvec = get_embedder().encode_query(query)
    store = get_vector_store()
    filtered = bool(document_ids or subject)
    raw = store.search(qvec, k * 6 if filtered else k)
    if not raw:
        return []

    score_by_id = {cid: s for cid, s in raw}
    q = (
        db.query(Chunk)
        .options(joinedload(Chunk.document))
        .filter(Chunk.id.in_(list(score_by_id)))
    )
    if document_ids:
        q = q.filter(Chunk.document_id.in_(document_ids))
    if subject:
        q = q.join(Document).filter(Document.subject == subject)
    chunks = q.all()

    hits = [
        SearchHit(
            chunk_id=c.id,
            document_id=c.document_id,
            document_title=c.document.title,
            subject=c.document.subject,
            color=c.document.color,
            page=c.page,
            heading=c.heading,
            text=c.text,
            score=round(score_by_id[c.id], 4),
        )
        for c in chunks
    ]
    hits.sort(key=lambda h: h.score, reverse=True)
    return hits[:k]
