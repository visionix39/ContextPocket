from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Chunk, Document
from ..schemas import ChunkOut, DocumentOut, DocumentUpdate, SubjectSummary
from ..services.ingest import delete_document, ingest_bytes, pick_color, rebuild_index
from ..services.parsing import UnsupportedFileType

router = APIRouter(prefix="/documents", tags=["documents"])

MAX_UPLOAD_BYTES = 50 * 1024 * 1024


@router.post("", response_model=DocumentOut, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    subject: str | None = Form(default=None),
    title: str | None = Form(default=None),
    db: Session = Depends(get_db),
):
    content = await file.read()
    if not content:
        raise HTTPException(400, "The uploaded file is empty.")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "File too large (max 50 MB).")
    try:
        doc = ingest_bytes(db, filename=file.filename or "upload.txt", content=content, subject=subject, title=title)
    except UnsupportedFileType as exc:
        raise HTTPException(415, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    return doc


@router.get("", response_model=list[DocumentOut])
def list_documents(subject: str | None = None, db: Session = Depends(get_db)):
    q = db.query(Document).order_by(Document.created_at.desc())
    if subject:
        q = q.filter(Document.subject == subject)
    return q.all()


@router.get("/subjects", response_model=list[SubjectSummary])
def list_subjects(db: Session = Depends(get_db)):
    rows = (
        db.query(
            Document.subject,
            func.count(Document.id),
            func.coalesce(func.sum(Document.chunk_count), 0),
        )
        .group_by(Document.subject)
        .order_by(Document.subject)
        .all()
    )
    return [
        SubjectSummary(subject=s, color=pick_color(s), document_count=int(n), chunk_count=int(c))
        for s, n, c in rows
    ]


@router.get("/{doc_id}", response_model=DocumentOut)
def get_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.get(Document, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    return doc


@router.patch("/{doc_id}", response_model=DocumentOut)
def update_document(doc_id: int, body: DocumentUpdate, db: Session = Depends(get_db)):
    doc = db.get(Document, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    if body.title is not None and body.title.strip():
        doc.title = body.title.strip()
    if body.subject is not None and body.subject.strip():
        doc.subject = body.subject.strip()
        doc.color = pick_color(doc.subject)
    if body.color is not None:
        doc.color = body.color
    db.commit()
    db.refresh(doc)
    return doc


@router.get("/{doc_id}/chunks", response_model=list[ChunkOut])
def get_chunks(doc_id: int, db: Session = Depends(get_db)):
    if not db.get(Document, doc_id):
        raise HTTPException(404, "Document not found")
    return db.query(Chunk).filter(Chunk.document_id == doc_id).order_by(Chunk.index).all()


@router.delete("/{doc_id}", status_code=204)
def remove_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.get(Document, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    delete_document(db, doc)
    return None


@router.post("/reindex")
def reindex(db: Session = Depends(get_db)):
    n = rebuild_index(db)
    return {"reindexed_chunks": n}
