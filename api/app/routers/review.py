"""Daily flashcard review. The server keeps the right answers and grades each one."""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Card, Review, User
from ..progress import award_progress_badges
from ..questions import Bank
from ..security import current_user
from ..srs import apply_review, due_cards, due_count, ensure_cards, mastery, rating_for
from .me import BadgeOut, badges_out

router = APIRouter(prefix="/api/review", tags=["review"])


class CardQuestion(BaseModel):
    card_id: int
    element: int
    fact: str
    kind: str
    prompt: str
    options: list[str]
    state: str


class QueueOut(BaseModel):
    due_total: int
    cards: list[CardQuestion]


class AnswerIn(BaseModel):
    answer: str = Field(max_length=200)
    duration_ms: int | None = Field(default=None, ge=0, le=600_000)


class AnswerOut(BaseModel):
    correct: bool
    answer: str
    explanation: str
    rating: str
    next_due: datetime
    interval_days: float
    element_level: str
    due_total: int
    new_badges: list[BadgeOut]


@router.get("/queue", response_model=QueueOut)
def queue(limit: int = Query(20, ge=1, le=50), user: User = Depends(current_user), db: Session = Depends(get_db)) -> QueueOut:
    bank = Bank(db)
    if ensure_cards(db, user.id, bank):
        db.commit()
    cards = due_cards(db, user.id, limit)
    out = []
    for c in cards:
        q = bank.question(c.element_number, c.fact)
        out.append(CardQuestion(card_id=c.id, state=c.state, **q.public()))
    return QueueOut(due_total=due_count(db, user.id), cards=out)


@router.post("/{card_id}", response_model=AnswerOut)
def answer(card_id: int, body: AnswerIn, user: User = Depends(current_user), db: Session = Depends(get_db)) -> AnswerOut:
    card = db.get(Card, card_id)
    if card is None or card.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such card")
    bank = Bank(db)
    q = bank.question(card.element_number, card.fact)
    correct = body.answer.strip() == q.answer
    rating = rating_for(correct, body.duration_ms)
    apply_review(card, rating, body.duration_ms)
    db.add(Review(card_id=card.id, user_id=user.id, rating=int(rating), correct=correct, duration_ms=body.duration_ms))
    db.flush()
    levels = mastery(db, user.id)
    earned = award_progress_badges(db, user.id, sum(1 for v in levels.values() if v == "mastered"))
    db.commit()
    return AnswerOut(correct=correct, answer=q.answer, explanation=q.explanation, rating=rating.name.lower(),
                     next_due=card.due, interval_days=round(card.interval_days, 3),
                     element_level=levels[card.element_number], due_total=due_count(db, user.id),
                     new_badges=badges_out(db, earned))
