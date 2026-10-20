"""Badges and streaks, shared by the explore and (later) review endpoints."""
from __future__ import annotations

from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .config import get_settings
from .models import Badge, Element, Exploration, Family

EXPLORE_MILESTONES = [1, 10, 25, 50, 100, 118]


def local_date(dt: datetime) -> date:
    return dt.astimezone(ZoneInfo(get_settings().app_timezone)).date()


def today() -> date:
    return datetime.now(ZoneInfo(get_settings().app_timezone)).date()


def badge_label(code: str, families: dict[str, Family]) -> str:
    kind, _, arg = code.partition(":")
    if kind == "family" and arg in families:
        f = families[arg]
        return f"All {f.short_name.lower()} explored"
    if kind == "explored":
        n = int(arg)
        return "All 118 explored!" if n == 118 else ("First element explored" if n == 1 else f"{n} elements explored")
    return code


def award_explore_badges(db: Session, user_id: int, element: Element) -> list[str]:
    """Check milestone and family badges after an element is explored. Returns newly earned codes."""
    have = set(db.scalars(select(Badge.code).where(Badge.user_id == user_id)))
    earned: list[str] = []

    count = db.scalar(select(func.count()).select_from(Exploration).where(Exploration.user_id == user_id)) or 0
    for m in EXPLORE_MILESTONES:
        code = f"explored:{m}"
        if count >= m and code not in have:
            earned.append(code)

    fam = element.family_code
    code = f"family:{fam}"
    if code not in have:
        total = db.scalar(select(func.count()).select_from(Element).where(Element.family_code == fam))
        seen = db.scalar(
            select(func.count()).select_from(Exploration).join(Element, Element.number == Exploration.element_number)
            .where(Exploration.user_id == user_id, Element.family_code == fam)
        )
        if total and seen == total:
            earned.append(code)

    for c in earned:
        db.add(Badge(user_id=user_id, code=c))
    return earned


def streak_days(activity_days: set[date]) -> int:
    """Consecutive days with activity ending today (or yesterday, so a streak isn't lost before you play today)."""
    d = today()
    if d not in activity_days:
        d -= timedelta(days=1)
    n = 0
    while d in activity_days:
        n += 1
        d -= timedelta(days=1)
    return n
