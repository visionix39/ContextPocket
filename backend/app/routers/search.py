from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..schemas import AskRequest, AskResponse, SearchRequest, SearchResponse
from ..services.llm import answer_question
from ..services.search import search_chunks

router = APIRouter(tags=["search"])


@router.post("/search", response_model=SearchResponse)
def search(body: SearchRequest, db: Session = Depends(get_db)):
    hits = search_chunks(db, body.query, k=body.k, document_ids=body.document_ids, subject=body.subject)
    return SearchResponse(query=body.query, hits=hits)


@router.post("/ask", response_model=AskResponse)
def ask(body: AskRequest, db: Session = Depends(get_db)):
    hits = search_chunks(db, body.query, k=body.k, document_ids=body.document_ids, subject=body.subject)
    answer, mode, model = answer_question(body.query, hits)
    return AskResponse(query=body.query, answer=answer, mode=mode, model=model, sources=hits)
