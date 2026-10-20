"""Badges, activity days and streaks, shared by the explore, review and quiz endpoints."""
from __future__ import annotations

from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .config import get_settings
from .models import Badge, Card, Element, Exploration, Family, QuizAttempt, Review

EXPLORE_MILESTONES = [1, 10, 25, 50, 100, 118]
MASTERY_MILESTONES = [1, 10, 25, 50, 118]
STREAK_MILESTONES = [3, 7, 14, 30]


def local_date(dt: datetime) -> date:
    return dt.astimezone(ZoneInfo(get_settings().app_timezone)).date()


def today() -> date:
    return datetime.now(ZoneInfo(get_settings().app_timezone)).date()


def badge_label(code: str, families: dict[str, Family]) -> str:
    kind, _, arg = code.partition(":")
    if kind == "family" and arg in families:
        return f"All {families[arg].short_name.lower()} explored"
    if kind == "explored":
        n = int(arg)
        return "All 118 explored!" if n == 118 else ("First element explored" if n == 1 else f"{n} elements explored")
    if kind == "mastered":
        n = int(arg)
        return "First element mastered" if n == 1 else ("Every element mastered!" if n == 118 else f"{n} elements mastered")
    if kind == "streak":
        return f"{arg}-day streak"
    if code == "quiz:perfect":
        return "Perfect quiz"
    return code


def _have(db: Session, user_id: int) -> set[str]:
    return set(db.scalars(select(Badge.code).where(Badge.user_id == user_id)))


def _grant(db: Session, user_id: int, codes: list[str]) -> list[str]:
    for c in codes:
        db.add(Badge(user_id=user_id, code=c))
    return codes


def award_explore_badges(db: Session, user_id: int, element: Element) -> list[str]:
    """Milestone and family badges after an element is explored. Returns newly earned codes."""
    have = _have(db, user_id)
    earned: list[str] = []
    count = db.scalar(select(func.count()).select_from(Exploration).where(Exploration.user_id == user_id)) or 0
    earned += [f"explored:{m}" for m in EXPLORE_MILESTONES if count >= m and f"explored:{m}" not in have]

    fam = element.family_code
    if f"family:{fam}" not in have:
        total = db.scalar(select(func.count()).select_from(Element).where(Element.family_code == fam))
        seen = db.scalar(
            select(func.count()).select_from(Exploration).join(Element, Element.number == Exploration.element_number)
            .where(Exploration.user_id == user_id, Element.family_code == fam))
        if total and seen == total:
            earned.append(f"family:{fam}")
    return _grant(db, user_id, earned)


def award_progress_badges(db: Session, user_id: int, mastered: int, extra: list[str] | None = None) -> list[str]:
    """Mastery and streak badges (plus any extra codes, e.g. a perfect quiz) not yet earned."""
    have = _have(db, user_id)
    earned = [f"mastered:{m}" for m in MASTERY_MILESTONES if mastered >= m and f"mastered:{m}" not in have]
    streak = streak_days(activity_days(db, user_id))
    earned += [f"streak:{s}" for s in STREAK_MILESTONES if streak >= s and f"streak:{s}" not in have]
    earned += [c for c in (extra or []) if c not in have]
    return _grant(db, user_id, earned)


def activity_days(db: Session, user_id: int) -> set[date]:
    """Local days on which the student explored, reviewed or took a quiz."""
    since = datetime.now(ZoneInfo("UTC")) - timedelta(days=400)
    times: list[datetime] = []
    times += db.scalars(select(Exploration.first_seen_at).where(Exploration.user_id == user_id, Exploration.first_seen_at >= since))
    times += db.scalars(select(Review.reviewed_at).where(Review.user_id == user_id, Review.reviewed_at >= since))
    times += db.scalars(select(QuizAttempt.created_at).where(QuizAttempt.user_id == user_id, QuizAttempt.created_at >= since))
    return {local_date(t) for t in times}


def element_accuracy(db: Session, user_id: int, days: int = 30) -> dict[int, tuple[int, int]]:
    """Per element: (right, wrong) answers in reviews and quizzes over the last N days."""
    since = datetime.now(ZoneInfo("UTC")) - timedelta(days=days)
    acc: dict[int, list[int]] = {}
    rows = db.execute(select(Card.element_number, Review.correct).join(Card, Card.id == Review.card_id)
                      .where(Review.user_id == user_id, Review.reviewed_at >= since))
    for n, ok in rows:
        acc.setdefault(n, [0, 0])[0 if ok else 1] += 1
    for qa in db.scalars(select(QuizAttempt).where(QuizAttempt.user_id == user_id, QuizAttempt.created_at >= since)):
        for r in qa.questions:
            acc.setdefault(int(r["element"]), [0, 0])[0 if r.get("correct") else 1] += 1
    return {n: (v[0], v[1]) for n, v in acc.items()}


def trouble_elements(db: Session, user_id: int, limit: int = 5, days: int = 30) -> list[tuple[int, int, int]]:
    """(element, right, wrong) for the elements missed most, worst accuracy first."""
    acc = element_accuracy(db, user_id, days)
    missed = [(n, r, w) for n, (r, w) in acc.items() if w > 0]
    missed.sort(key=lambda t: (-(t[2] / (t[1] + t[2])), -t[2]))
    return missed[:limit]


def streak_days(days: set[date]) -> int:
    """Consecutive days with activity ending today (or yesterday, so a streak isn't lost before you play today)."""
    d = today()
    if d not in days:
        d -= timedelta(days=1)
    n = 0
    while d in days:
        n += 1
        d -= timedelta(days=1)
    return n
