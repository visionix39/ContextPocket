"""SQLAlchemy models.

* Milestone 1: ``Document`` and ``Chunk`` (the knowledge library).
* Milestone 2: ``QuestionSet`` and ``Question``.  Every question points at the
  exact chunk it was generated from, so the UI can always show the source and
  later milestones can roll accuracy up to concepts and documents.
"""
from __future__ import annotations

from datetime import datetime, timezone

import json

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(300))
    filename: Mapped[str] = mapped_column(String(300))
    stored_path: Mapped[str] = mapped_column(String(500))
    file_type: Mapped[str] = mapped_column(String(20))  # pdf | md | txt
    subject: Mapped[str] = mapped_column(String(120), default="General")
    color: Mapped[str] = mapped_column(String(20), default="lavender")
    status: Mapped[str] = mapped_column(String(20), default="ready")  # processing|ready|failed
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    page_count: Mapped[int] = mapped_column(Integer, default=0)
    char_count: Mapped[int] = mapped_column(Integer, default=0)
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    chunks: Mapped[list["Chunk"]] = relationship(
        back_populates="document", cascade="all, delete-orphan", order_by="Chunk.index"
    )


class Chunk(Base):
    __tablename__ = "chunks"

    id: Mapped[int] = mapped_column(primary_key=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("documents.id", ondelete="CASCADE"), index=True)
    index: Mapped[int] = mapped_column(Integer)
    text: Mapped[str] = mapped_column(Text)
    page: Mapped[int | None] = mapped_column(Integer, nullable=True)
    heading: Mapped[str | None] = mapped_column(String(300), nullable=True)
    char_count: Mapped[int] = mapped_column(Integer, default=0)

    document: Mapped[Document] = relationship(back_populates="chunks")


class QuestionSet(Base):
    __tablename__ = "question_sets"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(300))
    subject: Mapped[str | None] = mapped_column(String(120), nullable=True)
    document_id: Mapped[int | None] = mapped_column(
        ForeignKey("documents.id", ondelete="SET NULL"), nullable=True
    )
    topic: Mapped[str | None] = mapped_column(String(300), nullable=True)
    kinds: Mapped[str] = mapped_column(String(60), default="mcq,short,flashcard")  # comma separated
    generator: Mapped[str] = mapped_column(String(20), default="rules")  # llm | rules | mixed
    model: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    questions: Mapped[list["Question"]] = relationship(
        back_populates="set", cascade="all, delete-orphan", order_by="Question.id", passive_deletes=True
    )

    @property
    def kind_list(self) -> list[str]:
        return [k for k in self.kinds.split(",") if k]


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(primary_key=True)
    set_id: Mapped[int] = mapped_column(ForeignKey("question_sets.id", ondelete="CASCADE"), index=True)
    # Deleting a document deletes its chunks, which deletes the questions built on them.
    chunk_id: Mapped[int] = mapped_column(ForeignKey("chunks.id", ondelete="CASCADE"), index=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("documents.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(20))  # mcq | short | flashcard
    prompt: Mapped[str] = mapped_column(Text)
    options_json: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON list for mcq
    answer: Mapped[str] = mapped_column(Text)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    concept: Mapped[str] = mapped_column(String(200), default="")
    difficulty: Mapped[int] = mapped_column(Integer, default=2)  # 1 easy .. 3 hard
    evidence: Mapped[str] = mapped_column(Text, default="")  # verbatim span from the chunk
    generator: Mapped[str] = mapped_column(String(20), default="rules")  # llm | rules
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    set: Mapped[QuestionSet] = relationship(back_populates="questions")
    chunk: Mapped[Chunk] = relationship()
    document: Mapped[Document] = relationship()

    @property
    def options(self) -> list[str]:
        return json.loads(self.options_json) if self.options_json else []
