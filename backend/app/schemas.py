from __future__ import annotations

from datetime import datetime, timezone

from pydantic import BaseModel, Field, field_serializer


class DocumentOut(BaseModel):
    id: int
    title: str
    filename: str
    file_type: str
    subject: str
    color: str
    status: str
    error: str | None = None
    page_count: int
    char_count: int
    chunk_count: int
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_serializer("created_at")
    def _utc(self, value: datetime) -> str:
        # SQLite stores naive datetimes; we always write UTC, so label it as such.
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat().replace("+00:00", "Z")


class DocumentUpdate(BaseModel):
    title: str | None = None
    subject: str | None = None
    color: str | None = None


class ChunkOut(BaseModel):
    id: int
    document_id: int
    index: int
    text: str
    page: int | None
    heading: str | None

    model_config = {"from_attributes": True}


class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)
    k: int = Field(default=6, ge=1, le=50)
    document_ids: list[int] | None = None
    subject: str | None = None


class SearchHit(BaseModel):
    chunk_id: int
    document_id: int
    document_title: str
    subject: str
    color: str
    page: int | None
    heading: str | None
    text: str
    score: float


class SearchResponse(BaseModel):
    query: str
    hits: list[SearchHit]


class AskRequest(SearchRequest):
    k: int = Field(default=5, ge=1, le=12)


class AskResponse(BaseModel):
    query: str
    answer: str
    mode: str  # "llm" | "extractive"
    model: str | None
    sources: list[SearchHit]


class SubjectSummary(BaseModel):
    subject: str
    color: str
    document_count: int
    chunk_count: int


class HealthOut(BaseModel):
    status: str
    embedding_backend: str
    embedding_model: str
    embedding_dim: int | None
    ollama_available: bool
    ollama_model: str
    documents: int
    chunks: int
    index_size: int
