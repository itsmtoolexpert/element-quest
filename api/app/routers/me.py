"""The signed-in student's own progress."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Badge, Element, Exploration, Family, User
from ..progress import activity_days, award_explore_badges, badge_label, streak_days
from ..questions import Bank
from ..security import current_user
from ..srs import due_count, ensure_cards, mastery

router = APIRouter(prefix="/api/me", tags=["me"])


class BadgeOut(BaseModel):
    code: str
    label: str


class ExploredOut(BaseModel):
    numbers: list[int]
    badges: list[BadgeOut]


class ExploreResult(BaseModel):
    new: bool
    explored_count: int
    new_badges: list[BadgeOut]


class StatsOut(BaseModel):
    explored: int
    mastered: int
    due_today: int
    streak_days: int


class MasteryOut(BaseModel):
    levels: dict[int, str]
    counts: dict[str, int]


def families(db: Session) -> dict[str, Family]:
    return {f.code: f for f in db.scalars(select(Family))}


def badges_out(db: Session, codes: list[str]) -> list[BadgeOut]:
    fams = families(db)
    return [BadgeOut(code=c, label=badge_label(c, fams)) for c in codes]


@router.get("/explored", response_model=ExploredOut)
def explored(user: User = Depends(current_user), db: Session = Depends(get_db)) -> ExploredOut:
    nums = list(db.scalars(select(Exploration.element_number).where(Exploration.user_id == user.id)
                           .order_by(Exploration.element_number)))
    codes = list(db.scalars(select(Badge.code).where(Badge.user_id == user.id).order_by(Badge.earned_at)))
    return ExploredOut(numbers=nums, badges=badges_out(db, codes))


@router.post("/explored/{number}", response_model=ExploreResult)
def explore(number: int, user: User = Depends(current_user), db: Session = Depends(get_db)) -> ExploreResult:
    """Record that the student opened an element file, and add its flashcards to their deck. Idempotent."""
    el = db.get(Element, number)
    if el is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such element")
    new = db.get(Exploration, (user.id, number)) is None
    earned: list[str] = []
    if new:
        db.add(Exploration(user_id=user.id, element_number=number))
        db.flush()
        earned = award_explore_badges(db, user.id, el)
        ensure_cards(db, user.id, Bank(db))
        db.commit()
    count = db.query(Exploration).filter(Exploration.user_id == user.id).count()
    return ExploreResult(new=new, explored_count=count, new_badges=badges_out(db, earned))


@router.get("/stats", response_model=StatsOut)
def stats(user: User = Depends(current_user), db: Session = Depends(get_db)) -> StatsOut:
    explored_n = db.query(Exploration).filter(Exploration.user_id == user.id).count()
    if ensure_cards(db, user.id, Bank(db)):  # elements explored before flashcards existed
        db.commit()
    levels = mastery(db, user.id)
    return StatsOut(explored=explored_n, mastered=sum(1 for v in levels.values() if v == "mastered"),
                    due_today=due_count(db, user.id), streak_days=streak_days(activity_days(db, user.id)))


@router.get("/mastery", response_model=MasteryOut)
def mastery_map(user: User = Depends(current_user), db: Session = Depends(get_db)) -> MasteryOut:
    levels = mastery(db, user.id)
    counts = {k: 0 for k in ("unexplored", "learning", "reviewing", "mastered")}
    for v in levels.values():
        counts[v] += 1
    return MasteryOut(levels=levels, counts=counts)
