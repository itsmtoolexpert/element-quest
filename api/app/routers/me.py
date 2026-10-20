"""The signed-in student's own progress."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Badge, Element, Exploration, Family, User
from ..progress import award_explore_badges, badge_label, local_date, streak_days
from ..security import current_user

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


def _families(db: Session) -> dict[str, Family]:
    return {f.code: f for f in db.scalars(select(Family))}


@router.get("/explored", response_model=ExploredOut)
def explored(user: User = Depends(current_user), db: Session = Depends(get_db)) -> ExploredOut:
    nums = list(db.scalars(select(Exploration.element_number).where(Exploration.user_id == user.id)
                           .order_by(Exploration.element_number)))
    fams = _families(db)
    codes = db.scalars(select(Badge.code).where(Badge.user_id == user.id).order_by(Badge.earned_at))
    return ExploredOut(numbers=nums, badges=[BadgeOut(code=c, label=badge_label(c, fams)) for c in codes])


@router.post("/explored/{number}", response_model=ExploreResult)
def explore(number: int, user: User = Depends(current_user), db: Session = Depends(get_db)) -> ExploreResult:
    """Record that the student opened an element file. Idempotent."""
    el = db.get(Element, number)
    if el is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such element")
    new = db.get(Exploration, (user.id, number)) is None
    earned: list[str] = []
    if new:
        db.add(Exploration(user_id=user.id, element_number=number))
        db.flush()
        earned = award_explore_badges(db, user.id, el)
        db.commit()
    count = db.query(Exploration).filter(Exploration.user_id == user.id).count()
    fams = _families(db)
    return ExploreResult(new=new, explored_count=count,
                         new_badges=[BadgeOut(code=c, label=badge_label(c, fams)) for c in earned])


@router.get("/stats", response_model=StatsOut)
def stats(user: User = Depends(current_user), db: Session = Depends(get_db)) -> StatsOut:
    seen = list(db.scalars(select(Exploration.first_seen_at).where(Exploration.user_id == user.id)))
    days = {local_date(t) for t in seen}
    # mastered and due_today arrive with spaced repetition in milestone 3
    return StatsOut(explored=len(seen), mastered=0, due_today=0, streak_days=streak_days(days))
