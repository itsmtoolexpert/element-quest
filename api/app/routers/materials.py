"""The "What's inside" library. The whole list is small, so the app downloads it once
and filters it instantly as the student types; searches that find nothing are logged."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Element, Material, SearchMiss, User
from ..security import current_user

router = APIRouter(prefix="/api", tags=["materials"])


class MaterialOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    aliases: list[str]
    formula: str | None
    kind: str
    composition: dict[str, float]
    atoms: dict[str, float] | None
    note: str | None
    source: str | None
    featured: bool


class MissIn(BaseModel):
    query: str = Field(min_length=2, max_length=64)


@router.get("/materials", response_model=list[MaterialOut])
def materials(_: User = Depends(current_user), db: Session = Depends(get_db)) -> list[Material]:
    return list(db.scalars(select(Material).order_by(Material.name)))


@router.post("/search-misses", status_code=status.HTTP_204_NO_CONTENT)
def log_miss(body: MissIn, user: User = Depends(current_user), db: Session = Depends(get_db)) -> None:
    """Log a search that matched nothing so the admin can add it. Duplicates within a day are ignored."""
    q = " ".join(body.query.lower().split())
    if len(q) < 2:
        return
    # Ignore anything that actually matches an element or a material (the client may race).
    if db.scalar(select(Element.number).where(or_(func.lower(Element.name) == q, func.lower(Element.symbol) == q))):
        return
    for m in db.scalars(select(Material)):
        if q == m.name.lower() or q in m.aliases:
            return
    since = datetime.now(timezone.utc) - timedelta(days=1)
    dup = db.scalar(select(SearchMiss.id).where(SearchMiss.user_id == user.id, SearchMiss.query == q,
                                                SearchMiss.created_at >= since))
    if dup is None:
        db.add(SearchMiss(query=q, user_id=user.id))
        db.commit()
