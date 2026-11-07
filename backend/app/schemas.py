from __future__ import annotations

from datetime import datetime, timezone

from typing import Literal

from pydantic import BaseModel, Field, field_serializer


def _utc_iso(value: datetime) -> str:
    # SQLite stores naive datetimes; we always write UTC, so label it as such.
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.isoformat().replace("+00:00", "Z")


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
        return _utc_iso(value)


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
    question_sets: int
    questions: int


# --- Milestone 2: quizzes & flashcards -------------------------------------

QuestionKind = Literal["mcq", "short", "flashcard"]


class GenerateRequest(BaseModel):
    kinds: list[QuestionKind] = Field(default=["mcq", "short", "flashcard"], min_length=1)
    count: int = Field(default=10, ge=1, le=40)
    subject: str | None = None
    document_ids: list[int] | None = None
    topic: str | None = Field(default=None, max_length=300)
    title: str | None = Field(default=None, max_length=300)


class SourceRef(BaseModel):
    document_id: int
    document_title: str
    subject: str
    color: str
    page: int | None
    heading: str | None


class QuestionOut(BaseModel):
    id: int
    set_id: int
    chunk_id: int
    kind: QuestionKind
    prompt: str
    options: list[str]
    answer: str
    explanation: str | None
    concept: str
    difficulty: int
    evidence: str
    generator: str
    source: SourceRef


class QuestionSetSummary(BaseModel):
    id: int
    title: str
    subject: str | None
    document_id: int | None
    topic: str | None
    kinds: list[str]
    generator: str
    model: str | None
    created_at: datetime
    question_count: int
    counts: dict[str, int]
    color: str

    @field_serializer("created_at")
    def _utc(self, value: datetime) -> str:
        return _utc_iso(value)


class QuestionSetOut(QuestionSetSummary):
    questions: list[QuestionOut]


class GradeRequest(BaseModel):
    question_id: int
    answer: str = Field(max_length=4000)


class GradeResponse(BaseModel):
    question_id: int
    verdict: Literal["correct", "partial", "missed"]
    score: float
    similarity: float
    coverage: float
    missing_terms: list[str]
    reference: str
    explanation: str | None
