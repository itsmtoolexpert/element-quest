from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Collection, Element, Family, User
from ..schemas import CollectionOut, ElementDetail, ElementSummary, FamilyOut
from ..security import current_user

router = APIRouter(prefix="/api", tags=["elements"], dependencies=[Depends(current_user)])


def _summary(e: Element) -> ElementSummary:
    s = ElementSummary.model_validate(e)
    if e.content:
        s.featured = e.content.featured
        s.everyday_use = e.content.everyday_use
    return s


@router.get("/families", response_model=list[FamilyOut])
def families(db: Session = Depends(get_db)) -> list[Family]:
    return list(db.scalars(select(Family)))


@router.get("/elements", response_model=list[ElementSummary])
def list_elements(db: Session = Depends(get_db)) -> list[ElementSummary]:
    return [_summary(e) for e in db.scalars(select(Element).order_by(Element.number)).unique()]


@router.get("/elements/{key}", response_model=ElementDetail)
def get_element(key: str, db: Session = Depends(get_db)) -> ElementDetail:
    """Look up by atomic number ("26") or symbol ("Fe", case-insensitive)."""
    if key.isdigit():
        e = db.get(Element, int(key))
    else:
        e = db.scalar(select(Element).where(Element.symbol.ilike(key)))
    if e is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such element")
    d = ElementDetail.model_validate(e)
    if e.content:
        d.featured = e.content.featured
        d.everyday_use = e.content.everyday_use
    return d


@router.get("/collections", response_model=list[CollectionOut])
def collections(db: Session = Depends(get_db)) -> list[Collection]:
    return list(db.scalars(select(Collection).order_by(Collection.sort_order, Collection.id)))


@router.get("/stats/me")
def my_stats(user: User = Depends(current_user)) -> dict[str, object]:
    """Placeholder numbers for the home screen until milestone 3 adds cards and reviews."""
    return {"explored": 0, "mastered": 0, "due_today": 0, "streak_days": 0}
