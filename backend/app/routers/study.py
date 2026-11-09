from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from ..db import get_db
from ..models import Document, Question, QuestionSet
from ..schemas import GenerateRequest, GradeRequest, GradeResponse, QuestionOut, QuestionSetOut, QuestionSetSummary, SourceRef
from ..services.grading import grade
from ..services.ingest import pick_color
from ..services.questions import default_title, generate_drafts

router = APIRouter(prefix="/study", tags=["study"])


def _question_out(q: Question) -> QuestionOut:
    d = q.document
    return QuestionOut(
        id=q.id, set_id=q.set_id, chunk_id=q.chunk_id, kind=q.kind, prompt=q.prompt, options=q.options,
        answer=q.answer, explanation=q.explanation, concept=q.concept, difficulty=q.difficulty,
        evidence=q.evidence, generator=q.generator,
        source=SourceRef(
            document_id=d.id, document_title=d.title, subject=d.subject, color=d.color,
            page=q.chunk.page if q.chunk else None, heading=q.chunk.heading if q.chunk else None,
        ),
    )


def _summary(s: QuestionSet, counts: dict[str, int]) -> dict:
    subject = s.subject
    if not subject and s.document_id:
        doc = s.questions[0].document if s.questions else None
        subject = doc.subject if doc else None
    return dict(
        id=s.id, title=s.title, subject=s.subject, document_id=s.document_id, topic=s.topic, kinds=s.kind_list,
        generator=s.generator, model=s.model, created_at=s.created_at, question_count=sum(counts.values()),
        counts=counts, color=pick_color(subject or "Mixed"),
    )


def _set_out(s: QuestionSet) -> QuestionSetOut:
    counts: dict[str, int] = {}
    for q in s.questions:
        counts[q.kind] = counts.get(q.kind, 0) + 1
    return QuestionSetOut(**_summary(s, counts), questions=[_question_out(q) for q in s.questions])


def _load_set(db: Session, set_id: int) -> QuestionSet:
    s = (
        db.query(QuestionSet)
        .options(joinedload(QuestionSet.questions).joinedload(Question.document), joinedload(QuestionSet.questions).joinedload(Question.chunk))
        .filter(QuestionSet.id == set_id)
        .first()
    )
    if not s:
        raise HTTPException(404, "Question set not found")
    return s


@router.post("/sets", response_model=QuestionSetOut, status_code=201)
def create_set(body: GenerateRequest, db: Session = Depends(get_db)):
    if body.document_ids:
        found = {d.id for d in db.query(Document.id).filter(Document.id.in_(body.document_ids)).all()}
        missing = set(body.document_ids) - found
        if missing:
            raise HTTPException(404, f"Document(s) not found: {sorted(missing)}")
    drafts, generator, model = generate_drafts(
        db, kinds=list(body.kinds), count=body.count, subject=body.subject,
        document_ids=body.document_ids, topic=body.topic,
    )
    if not drafts:
        raise HTTPException(
            422,
            "Couldn't write any questions from the notes in scope. Try a wider scope, a different topic, "
            "or notes with more definitions and explanations.",
        )
    s = QuestionSet(
        title=(body.title or "").strip() or default_title(db, topic=body.topic, subject=body.subject, document_ids=body.document_ids),
        subject=body.subject,
        document_id=body.document_ids[0] if body.document_ids and len(body.document_ids) == 1 else None,
        topic=body.topic,
        kinds=",".join(body.kinds),
        generator=generator,
        model=model,
    )
    db.add(s)
    db.flush()
    for d in drafts:
        db.add(
            Question(
                set_id=s.id, chunk_id=d.chunk.id, document_id=d.chunk.document_id, kind=d.kind, prompt=d.prompt,
                options_json=json.dumps(d.options) if d.options else None, answer=d.answer,
                explanation=d.explanation, concept=d.concept, difficulty=d.difficulty, evidence=d.evidence,
                generator=d.generator,
            )
        )
    db.commit()
    return _set_out(_load_set(db, s.id))


@router.get("/sets", response_model=list[QuestionSetSummary])
def list_sets(subject: str | None = None, db: Session = Depends(get_db)):
    q = db.query(QuestionSet).order_by(QuestionSet.created_at.desc(), QuestionSet.id.desc())
    if subject:
        q = q.filter(QuestionSet.subject == subject)
    sets = q.all()
    rows = (
        db.query(Question.set_id, Question.kind, func.count(Question.id))
        .filter(Question.set_id.in_([s.id for s in sets]) if sets else False)
        .group_by(Question.set_id, Question.kind)
        .all()
    )
    counts: dict[int, dict[str, int]] = {}
    for sid, kind, n in rows:
        counts.setdefault(sid, {})[kind] = int(n)
    return [QuestionSetSummary(**_summary(s, counts.get(s.id, {}))) for s in sets]


@router.get("/sets/{set_id}", response_model=QuestionSetOut)
def get_set(set_id: int, db: Session = Depends(get_db)):
    return _set_out(_load_set(db, set_id))


@router.delete("/sets/{set_id}", status_code=204)
def delete_set(set_id: int, db: Session = Depends(get_db)):
    s = db.get(QuestionSet, set_id)
    if not s:
        raise HTTPException(404, "Question set not found")
    db.delete(s)
    db.commit()
    return None


@router.post("/grade", response_model=GradeResponse)
def grade_answer(body: GradeRequest, db: Session = Depends(get_db)):
    q = db.get(Question, body.question_id)
    if not q:
        raise HTTPException(404, "Question not found")
    return GradeResponse(**grade(q, body.answer))
