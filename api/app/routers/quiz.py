"""Quiz rounds: generated on the server, answered on the device, results saved at the end."""
from __future__ import annotations

import random
import re
from collections import Counter
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Card, Exploration, QuizAttempt, Review, User
from ..progress import award_progress_badges
from ..questions import FACTS, Bank
from ..security import current_user
from ..srs import mastery
from .me import BadgeOut, badges_out

router = APIRouter(prefix="/api/quiz", tags=["quiz"])

MODE_RE = re.compile(r"^(mixed|explored|weak|family:[a-z]{2}|group:\d{1,2}|period:\d)$")


class StartIn(BaseModel):
    mode: str = Field(pattern=MODE_RE.pattern)
    size: int = Field(default=10, ge=5, le=20)


class QuizQuestion(BaseModel):
    element: int
    fact: str
    kind: str
    prompt: str
    options: list[str]
    answer: str
    explanation: str


class StartOut(BaseModel):
    mode: str
    title: str
    note: str | None
    questions: list[QuizQuestion]


class ResultIn(BaseModel):
    element: int
    fact: str = Field(max_length=24)
    correct: bool


class FinishIn(BaseModel):
    mode: str = Field(pattern=MODE_RE.pattern)
    results: list[ResultIn] = Field(min_length=1, max_length=20)


class FinishOut(BaseModel):
    score: int
    total: int
    new_badges: list[BadgeOut]


def weak_elements(db: Session, user_id: int, limit: int = 12) -> list[int]:
    """Elements the student gets wrong most (recent reviews and quizzes), then cards still being learned."""
    since = datetime.now(timezone.utc) - timedelta(days=60)
    wrong: Counter[int] = Counter()
    right: Counter[int] = Counter()
    rows = db.execute(select(Card.element_number, Review.correct).join(Card, Card.id == Review.card_id)
                      .where(Review.user_id == user_id, Review.reviewed_at >= since))
    for n, ok in rows:
        (right if ok else wrong)[n] += 1
    for qa in db.scalars(select(QuizAttempt).where(QuizAttempt.user_id == user_id, QuizAttempt.created_at >= since)):
        for r in qa.questions:
            (right if r.get("correct") else wrong)[int(r["element"])] += 1
    scored = sorted(wrong, key=lambda n: (-(wrong[n] / (wrong[n] + right[n])), -wrong[n]))
    picked = scored[:limit]
    if len(picked) < limit:
        levels = mastery(db, user_id)
        learning = [n for n, lv in levels.items() if lv == "learning" and n not in picked]
        random.shuffle(learning)
        picked += learning[: limit - len(picked)]
    return picked


def pool_for(mode: str, db: Session, user: User, bank: Bank) -> tuple[list[int], str, str | None]:
    """Element numbers to draw from, the round's title, and an optional note for the student."""
    main = [e.number for e in bank.els if e.number <= 86]  # skip elements with only predicted properties
    kind, _, arg = mode.partition(":")
    if kind == "mixed":
        return main, "Mixed challenge", None
    if kind == "explored":
        nums = list(db.scalars(select(Exploration.element_number).where(Exploration.user_id == user.id)))
        if len(nums) >= 4:
            return nums, "Elements you've explored", None
        return main, "Mixed challenge", "Explore a few more elements to unlock this round. Here's a mixed one instead."
    if kind == "weak":
        nums = weak_elements(db, user.id)
        if len(nums) >= 4:
            return nums, "Your weak spots", None
        return main, "Mixed challenge", "No weak spots yet. Practice a bit more and this round will target them."
    if kind == "family":
        if arg not in bank.families:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "No such family")
        return [e.number for e in bank.els if e.family_code == arg], bank.families[arg].short_name, None
    if kind == "group":
        g = int(arg)
        if not 1 <= g <= 18:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "No such group")
        return [e.number for e in bank.els if e.group == g and e.number <= 112], f"Group {g}", None
    p = int(arg)
    if not 1 <= p <= 7:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such period")
    return [e.number for e in bank.els if e.period == p and e.number <= 112], f"Period {p}", None


@router.post("/start", response_model=StartOut)
def start(body: StartIn, user: User = Depends(current_user), db: Session = Depends(get_db)) -> StartOut:
    bank = Bank(db)
    pool, title, note = pool_for(body.mode, db, user, bank)
    # Every (element, fact) pair in the pool, shuffled; no repeats within a round, spread across elements.
    pairs = [(n, f) for n in pool for f in bank.facts_for(bank.by_num[n])]
    random.shuffle(pairs)
    chosen: list[tuple[int, str]] = []
    used_elements: Counter[int] = Counter()
    for limit_per_element in (1, 2, 5):
        for n, f in pairs:
            if len(chosen) >= body.size:
                break
            if (n, f) not in chosen and used_elements[n] < limit_per_element:
                chosen.append((n, f)); used_elements[n] += 1
    random.shuffle(chosen)
    return StartOut(mode=body.mode, title=title, note=note,
                    questions=[QuizQuestion(**bank.question(n, f).full()) for n, f in chosen])


@router.post("/finish", response_model=FinishOut)
def finish(body: FinishIn, user: User = Depends(current_user), db: Session = Depends(get_db)) -> FinishOut:
    results = [r for r in body.results if r.fact in FACTS and 1 <= r.element <= 118]
    score = sum(r.correct for r in results)
    db.add(QuizAttempt(user_id=user.id, kind=body.mode, score=score, total=len(results),
                       questions=[r.model_dump() for r in results]))
    db.flush()
    levels = mastery(db, user.id)
    extra = ["quiz:perfect"] if results and score == len(results) and len(results) >= 10 else []
    earned = award_progress_badges(db, user.id, sum(1 for v in levels.values() if v == "mastered"), extra)
    db.commit()
    return FinishOut(score=score, total=len(results), new_badges=badges_out(db, earned))
