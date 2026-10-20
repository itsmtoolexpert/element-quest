"""Spaced repetition with FSRS (py-fsrs). One card = one fact about one element for one student."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fsrs import Card as FsrsCard
from fsrs import Rating, Scheduler, State
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .config import get_settings
from .models import Card, Element, Exploration
from .progress import local_date, today
from .questions import Bank

scheduler = Scheduler()  # defaults: 90% target retention, 1 and 10 minute learning steps

STATE_NAMES = {State.Learning: "learning", State.Review: "review", State.Relearning: "relearning"}


def now() -> datetime:
    return datetime.now(timezone.utc)


def ensure_cards(db: Session, user_id: int, bank: Bank) -> int:
    """Create cards for every explored element that doesn't have them yet. Returns how many were added."""
    explored = set(db.scalars(select(Exploration.element_number).where(Exploration.user_id == user_id)))
    have = {(n, f) for n, f in db.execute(select(Card.element_number, Card.fact).where(Card.user_id == user_id))}
    added = 0
    for n in sorted(explored):
        for fact in bank.facts_for(bank.by_num[n]):
            if (n, fact) not in have:
                db.add(Card(user_id=user_id, element_number=n, fact=fact, state="new", due=now()))
                added += 1
    if added:
        db.flush()
    return added


def introduced_today(db: Session, user_id: int) -> int:
    # Compare in the app's time zone: fetch today's candidates (at most a day's worth) and filter in Python.
    since = now() - timedelta(hours=36)
    times = db.scalars(select(Card.introduced_at).where(Card.user_id == user_id, Card.introduced_at >= since))
    t = today()
    return sum(1 for x in times if x and local_date(x) == t)


def due_cards(db: Session, user_id: int, limit: int) -> list[Card]:
    """Cards to study now: everything due, then new cards up to today's allowance."""
    t = now()
    due = list(db.scalars(select(Card).where(Card.user_id == user_id, Card.state != "new", Card.due <= t)
                          .order_by(Card.due).limit(limit)))
    room = max(0, get_settings().new_cards_per_day - introduced_today(db, user_id))
    room = min(room, limit - len(due))
    if room > 0:
        due += list(db.scalars(select(Card).where(Card.user_id == user_id, Card.state == "new")
                               .order_by(Card.created_at, Card.element_number, Card.id).limit(room)))
    return due


def due_count(db: Session, user_id: int) -> int:
    reviews = db.scalar(select(func.count()).select_from(Card)
                        .where(Card.user_id == user_id, Card.state != "new", Card.due <= now())) or 0
    new = db.scalar(select(func.count()).select_from(Card).where(Card.user_id == user_id, Card.state == "new")) or 0
    allowance = max(0, get_settings().new_cards_per_day - introduced_today(db, user_id))
    return reviews + min(new, allowance)


def rating_for(correct: bool, duration_ms: int | None) -> Rating:
    if not correct:
        return Rating.Again
    if duration_ms is not None and duration_ms < get_settings().easy_answer_ms:
        return Rating.Easy
    return Rating.Good


def apply_review(card: Card, rating: Rating, duration_ms: int | None) -> None:
    fc = FsrsCard.from_dict(card.fsrs) if card.fsrs else FsrsCard(due=now())
    fc, _log = scheduler.review_card(fc, rating, review_datetime=now(), review_duration=duration_ms)
    card.fsrs = fc.to_dict()
    card.state = STATE_NAMES[fc.state]
    card.due = fc.due
    card.last_review = fc.last_review
    card.interval_days = (fc.due - fc.last_review).total_seconds() / 86400 if fc.last_review else 0.0
    if card.introduced_at is None:
        card.introduced_at = card.last_review


# ------------------------------------------------------------------ mastery

LEVELS = ("unexplored", "learning", "reviewing", "mastered")


def mastery(db: Session, user_id: int) -> dict[int, str]:
    """Level per element: unexplored → learning (cards still new/learning) → reviewing → mastered."""
    explored = set(db.scalars(select(Exploration.element_number).where(Exploration.user_id == user_id)))
    cards: dict[int, list[Card]] = {}
    for c in db.scalars(select(Card).where(Card.user_id == user_id)):
        cards.setdefault(c.element_number, []).append(c)
    days = get_settings().mastery_days
    out: dict[int, str] = {}
    for n in db.scalars(select(Element.number)):
        cs = cards.get(n, [])
        if n not in explored and not cs:
            out[n] = "unexplored"
        elif cs and all(c.state == "review" and c.interval_days >= days for c in cs):
            out[n] = "mastered"
        elif cs and all(c.state == "review" for c in cs):
            out[n] = "reviewing"
        else:
            out[n] = "learning"
    return out
