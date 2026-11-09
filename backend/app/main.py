from __future__ import annotations

import logging
import threading
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.orm import Session

from .config import get_settings
from .db import get_db, init_db
from .models import Chunk, Document, Question, QuestionSet
from .routers import documents, search, study
from .schemas import HealthOut
from .services.embeddings import get_embedder
from .services.llm import OllamaClient
from .services.vectorstore import get_vector_store

log = logging.getLogger("contextpocket")


def _warm_up() -> None:
    try:
        emb = get_embedder()
        get_vector_store()
        log.info("Embedding model ready: %s (dim=%d)", emb.name, emb.dim)
    except Exception:  # pragma: no cover
        log.exception("Failed to warm up embedding model")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    # Load the embedding model in the background so the API answers immediately.
    threading.Thread(target=_warm_up, daemon=True).start()
    yield


settings = get_settings()
app = FastAPI(title=f"{settings.app_name} API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(documents.router)
app.include_router(search.router)
app.include_router(study.router)


@app.get("/health", response_model=HealthOut)
def health(db: Session = Depends(get_db)):
    try:
        emb = get_embedder()
        dim: int | None = emb.dim
        name = emb.name
        index_size = get_vector_store().size
    except Exception:  # model still loading / failed
        dim, name, index_size = None, settings.embedding_model, 0
    return HealthOut(
        status="ok",
        embedding_backend=settings.embedding_backend,
        embedding_model=name,
        embedding_dim=dim,
        ollama_available=OllamaClient().is_available(),
        ollama_model=settings.ollama_model,
        documents=db.query(func.count(Document.id)).scalar() or 0,
        chunks=db.query(func.count(Chunk.id)).scalar() or 0,
        index_size=index_size,
        question_sets=db.query(func.count(QuestionSet.id)).scalar() or 0,
        questions=db.query(func.count(Question.id)).scalar() or 0,
    )
