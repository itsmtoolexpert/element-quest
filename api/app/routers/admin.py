"""Parent/teacher screens: progress dashboard, accounts, and content editing. Admins only."""
from __future__ import annotations

import re
from datetime import date, datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field, field_validator, model_validator
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..chem import mass_composition, parse_formula, tidy_atoms
from ..db import get_db
from ..models import (Badge, Collection, Element, ElementContent, Exploration, Material, QuizAttempt, Review,
                      SearchMiss, User)
from ..progress import activity_days, local_date, streak_days, today, trouble_elements
from ..security import hash_password, require_admin
from ..srs import due_count, mastery
from .materials import MaterialOut
from .me import BadgeOut, badges_out

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])

AVATARS = {"atom", "flask", "rocket", "magnet", "flame", "bolt", "teacher"}


# ================================================================== dashboard

class DayActivity(BaseModel):
    date: date
    explored: int
    reviews: int
    quizzes: int


class Trouble(BaseModel):
    number: int
    symbol: str
    name: str
    right: int
    wrong: int


class StudentSummary(BaseModel):
    id: int
    username: str
    display_name: str
    avatar: str | None
    grade: str | None
    is_active: bool
    last_active: datetime | None
    streak_days: int
    explored: int
    mastered: int
    due_now: int
    reviews_7d: int
    accuracy_7d: float | None
    quizzes_7d: int
    activity: list[DayActivity]
    trouble: list[Trouble]


class QuizOut(BaseModel):
    mode: str
    score: int
    total: int
    created_at: datetime


class StudentDetail(StudentSummary):
    levels: dict[int, str]
    level_counts: dict[str, int]
    badges: list[BadgeOut]
    recent_quizzes: list[QuizOut]


def _activity(db: Session, user_id: int, days: int) -> tuple[list[DayActivity], datetime | None]:
    start = today() - timedelta(days=days - 1)
    since = datetime.combine(start, datetime.min.time(), tzinfo=timezone.utc) - timedelta(days=1)
    buckets = {start + timedelta(days=i): [0, 0, 0] for i in range(days)}
    last: datetime | None = None
    sources = [
        (0, select(Exploration.first_seen_at).where(Exploration.user_id == user_id, Exploration.first_seen_at >= since)),
        (1, select(Review.reviewed_at).where(Review.user_id == user_id, Review.reviewed_at >= since)),
        (2, select(QuizAttempt.created_at).where(QuizAttempt.user_id == user_id, QuizAttempt.created_at >= since)),
    ]
    for idx, q in sources:
        for t in db.scalars(q):
            last = t if last is None or t > last else last
            d = local_date(t)
            if d in buckets:
                buckets[d][idx] += 1
    return [DayActivity(date=d, explored=v[0], reviews=v[1], quizzes=v[2]) for d, v in buckets.items()], last


def _summary(db: Session, u: User, days: int = 14, trouble_n: int = 5) -> tuple[dict[str, Any], dict[int, str]]:
    activity, last = _activity(db, u.id, days)
    since7 = datetime.now(timezone.utc) - timedelta(days=7)
    reviews = list(db.scalars(select(Review.correct).where(Review.user_id == u.id, Review.reviewed_at >= since7)))
    quizzes_7d = db.scalar(select(func.count()).select_from(QuizAttempt)
                           .where(QuizAttempt.user_id == u.id, QuizAttempt.created_at >= since7)) or 0
    levels = mastery(db, u.id)
    els = {e.number: e for e in db.scalars(select(Element))}
    trouble = [Trouble(number=n, symbol=els[n].symbol, name=els[n].name, right=r, wrong=w)
               for n, r, w in trouble_elements(db, u.id, limit=trouble_n)]
    candidates = [t for t in (last, u.last_seen_at) if t]
    return dict(
        id=u.id, username=u.username, display_name=u.display_name, avatar=u.avatar, grade=u.grade, is_active=u.is_active,
        last_active=max(candidates) if candidates else None,
        streak_days=streak_days(activity_days(db, u.id)),
        explored=db.scalar(select(func.count()).select_from(Exploration).where(Exploration.user_id == u.id)) or 0,
        mastered=sum(1 for v in levels.values() if v == "mastered"),
        due_now=due_count(db, u.id),
        reviews_7d=len(reviews), accuracy_7d=round(sum(reviews) / len(reviews), 3) if reviews else None,
        quizzes_7d=quizzes_7d, activity=activity, trouble=trouble,
    ), levels


@router.get("/overview", response_model=list[StudentSummary])
def overview(db: Session = Depends(get_db)) -> list[StudentSummary]:
    students = db.scalars(select(User).where(User.role == "student", User.is_active).order_by(User.display_name))
    return [StudentSummary(**_summary(db, u)[0]) for u in students]


@router.get("/students/{user_id}", response_model=StudentDetail)
def student(user_id: int, db: Session = Depends(get_db)) -> StudentDetail:
    u = db.get(User, user_id)
    if u is None or u.role != "student":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such student")
    data, levels = _summary(db, u, days=30, trouble_n=10)
    counts = {k: 0 for k in ("unexplored", "learning", "reviewing", "mastered")}
    for v in levels.values():
        counts[v] += 1
    codes = list(db.scalars(select(Badge.code).where(Badge.user_id == u.id).order_by(Badge.earned_at)))
    quizzes = db.scalars(select(QuizAttempt).where(QuizAttempt.user_id == u.id).order_by(QuizAttempt.created_at.desc()).limit(10))
    return StudentDetail(**data, levels=levels, level_counts=counts, badges=badges_out(db, codes),
                         recent_quizzes=[QuizOut(mode=q.kind, score=q.score, total=q.total, created_at=q.created_at) for q in quizzes])


# ================================================================== accounts

USERNAME_RE = r"^[a-z0-9_]{2,32}$"


class UserAdminOut(BaseModel):
    id: int
    username: str
    display_name: str
    role: str
    avatar: str | None
    grade: str | None
    is_active: bool
    last_seen_at: datetime | None


class UserCreate(BaseModel):
    username: str = Field(pattern=USERNAME_RE)
    display_name: str = Field(min_length=1, max_length=48)
    password: str = Field(min_length=4, max_length=128)
    avatar: str | None = None
    grade: str | None = Field(default=None, max_length=16)

    @field_validator("avatar")
    @classmethod
    def known_avatar(cls, v: str | None) -> str | None:
        if v is not None and v not in AVATARS:
            raise ValueError("unknown avatar")
        return v


class UserPatch(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=48)
    avatar: str | None = None
    grade: str | None = Field(default=None, max_length=16)
    is_active: bool | None = None

    @field_validator("avatar")
    @classmethod
    def known_avatar(cls, v: str | None) -> str | None:
        if v is not None and v not in AVATARS:
            raise ValueError("unknown avatar")
        return v


class PasswordSet(BaseModel):
    password: str = Field(min_length=4, max_length=128)


def _user(db: Session, user_id: int) -> User:
    u = db.get(User, user_id)
    if u is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such account")
    return u


@router.get("/users", response_model=list[UserAdminOut])
def users(db: Session = Depends(get_db)) -> list[User]:
    return list(db.scalars(select(User).order_by(User.role.desc(), User.display_name)))


@router.post("/users", response_model=UserAdminOut, status_code=status.HTTP_201_CREATED)
def create_user(body: UserCreate, db: Session = Depends(get_db)) -> User:
    if db.scalar(select(User.id).where(User.username == body.username)):
        raise HTTPException(status.HTTP_409_CONFLICT, "That username is taken")
    u = User(username=body.username, display_name=body.display_name.strip(), role="student",
             password_hash=hash_password(body.password), avatar=body.avatar or "atom", grade=body.grade)
    db.add(u)
    db.commit()
    return u


@router.patch("/users/{user_id}", response_model=UserAdminOut)
def update_user(user_id: int, body: UserPatch, me: User = Depends(require_admin), db: Session = Depends(get_db)) -> User:
    u = _user(db, user_id)
    if body.is_active is False and u.id == me.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You can't turn off your own account")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(u, k, v.strip() if isinstance(v, str) and k == "display_name" else v)
    db.commit()
    return u


@router.post("/users/{user_id}/password", status_code=status.HTTP_204_NO_CONTENT)
def set_password(user_id: int, body: PasswordSet, db: Session = Depends(get_db)) -> None:
    u = _user(db, user_id)
    if u.role == "admin" and len(body.password) < 8:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Admin passwords need at least 8 characters")
    u.password_hash = hash_password(body.password)
    db.commit()


# ================================================================== element content

class CheckQuestionIn(BaseModel):
    question: str = Field(min_length=5, max_length=300)
    correct: str = Field(min_length=1, max_length=120)
    wrong: list[str] = Field(min_length=3, max_length=3)
    explanation: str = Field(min_length=1, max_length=500)

    @model_validator(mode="after")
    def distinct(self) -> CheckQuestionIn:
        opts = [self.correct.strip(), *[w.strip() for w in self.wrong]]
        if any(not o for o in opts) or len(set(o.lower() for o in opts)) != 4:
            raise ValueError("the right answer and the 3 wrong answers must all be different and filled in")
        return self


class ContentIn(BaseModel):
    everyday_use: str = Field(min_length=3, max_length=300)
    go_deeper: str | None = Field(default=None, max_length=1200)
    try_it: str | None = Field(default=None, max_length=800)
    featured: bool = False
    check_question: CheckQuestionIn | None = None


class ContentOut(BaseModel):
    element_number: int
    everyday_use: str
    go_deeper: str | None
    try_it: str | None
    featured: bool
    check_question: dict[str, Any] | None
    updated_at: datetime


@router.put("/elements/{number}/content", response_model=ContentOut)
def update_content(number: int, body: ContentIn, db: Session = Depends(get_db)) -> ElementContent:
    if db.get(Element, number) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such element")
    c = db.get(ElementContent, number) or ElementContent(element_number=number)
    c.everyday_use = body.everyday_use.strip().rstrip(".")
    c.go_deeper = (body.go_deeper or "").strip() or None
    c.try_it = (body.try_it or "").strip() or None
    c.featured = body.featured
    c.check_question = body.check_question.model_dump() if body.check_question else None
    db.add(c)
    db.commit()
    return c


# ================================================================== materials

class FormulaIn(BaseModel):
    formula: str = Field(min_length=1, max_length=64)


class MaterialIn(BaseModel):
    name: str = Field(min_length=1, max_length=64)
    aliases: list[str] = Field(default_factory=list, max_length=20)
    formula: str | None = Field(default=None, max_length=64)
    composition: dict[str, float] | None = None
    note: str | None = Field(default=None, max_length=600)
    source: str | None = Field(default=None, max_length=200)
    featured: bool = False

    @model_validator(mode="after")
    def one_of(self) -> MaterialIn:
        if bool(self.formula and self.formula.strip()) == bool(self.composition):
            raise ValueError("give exactly one of: a chemical formula, or a mixture composition")
        return self


def _masses(db: Session) -> dict[str, float]:
    return {s: float(m) for s, m in db.execute(select(Element.symbol, Element.mass))}


def _from_formula(db: Session, formula: str) -> tuple[dict[str, float], dict[str, float]]:
    try:
        atoms = parse_formula(formula)
        return tidy_atoms(atoms), mass_composition(atoms, _masses(db))
    except ValueError as e:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, f"Formula problem: {e}") from e


def _apply_material(db: Session, m: Material, body: MaterialIn) -> None:
    m.name = body.name.strip()
    m.aliases = sorted({a.strip().lower() for a in body.aliases if a.strip()} - {m.name.lower()})
    m.note = (body.note or "").strip() or None
    m.source = (body.source or "").strip() or None
    m.featured = body.featured
    if body.formula and body.formula.strip():
        m.formula = body.formula.strip()
        m.atoms, m.composition = _from_formula(db, m.formula)
        m.kind = "element" if len(m.atoms) == 1 else "compound"
    else:
        comp = body.composition or {}
        masses = _masses(db)
        bad = [s for s in comp if s not in masses]
        if bad:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, f"Not element symbols: {', '.join(bad)}")
        if any(v <= 0 for v in comp.values()):
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Every percentage must be above 0")
        total = sum(comp.values())
        if not 50 <= total <= 100.5:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT,
                                f"Percentages add up to {total:.1f}; they should add up to about 100")
        m.formula, m.atoms, m.kind = None, None, "mixture"
        m.composition = dict(sorted(((s, round(v, 4)) for s, v in comp.items()), key=lambda kv: -kv[1]))


def _clear_misses(db: Session, m: Material) -> None:
    keys = {m.name.lower(), *m.aliases}
    for miss in db.scalars(select(SearchMiss)):
        if miss.query in keys:
            db.delete(miss)


@router.post("/materials/preview")
def preview(body: FormulaIn, db: Session = Depends(get_db)) -> dict[str, Any]:
    atoms, comp = _from_formula(db, body.formula)
    return {"atoms": atoms, "composition": comp}


@router.post("/materials", response_model=MaterialOut, status_code=status.HTTP_201_CREATED)
def create_material(body: MaterialIn, db: Session = Depends(get_db)) -> Material:
    if db.scalar(select(Material.id).where(func.lower(Material.name) == body.name.strip().lower())):
        raise HTTPException(status.HTTP_409_CONFLICT, "A material with that name already exists")
    m = Material()
    _apply_material(db, m, body)
    db.add(m)
    _clear_misses(db, m)
    db.commit()
    return m


@router.put("/materials/{material_id}", response_model=MaterialOut)
def update_material(material_id: int, body: MaterialIn, db: Session = Depends(get_db)) -> Material:
    m = db.get(Material, material_id)
    if m is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such material")
    clash = db.scalar(select(Material.id).where(func.lower(Material.name) == body.name.strip().lower(), Material.id != m.id))
    if clash:
        raise HTTPException(status.HTTP_409_CONFLICT, "A material with that name already exists")
    _apply_material(db, m, body)
    _clear_misses(db, m)
    db.commit()
    return m


@router.delete("/materials/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_material(material_id: int, db: Session = Depends(get_db)) -> Response:
    m = db.get(Material, material_id)
    if m is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such material")
    db.delete(m)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ================================================================== finders ("Find elements in")

class CollectionIn(BaseModel):
    label: str = Field(min_length=1, max_length=64)
    note: str = Field(min_length=1, max_length=400)
    symbols: list[str] = Field(min_length=1, max_length=118)


class CollectionAdminOut(BaseModel):
    slug: str
    label: str
    note: str
    symbols: list[str]
    sort_order: int


def _check_symbols(db: Session, symbols: list[str]) -> list[str]:
    known = {s.lower(): s for s in db.scalars(select(Element.symbol))}
    bad = [s for s in symbols if s.strip().lower() not in known]
    if bad:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, f"Not element symbols: {', '.join(bad)}")
    return list(dict.fromkeys(known[s.strip().lower()] for s in symbols))


def _slugify(label: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", label.lower()).strip("-")[:32] or "finder"


@router.post("/collections", response_model=CollectionAdminOut, status_code=status.HTTP_201_CREATED)
def create_collection(body: CollectionIn, db: Session = Depends(get_db)) -> Collection:
    slug, n = _slugify(body.label), 2
    base = slug
    while db.scalar(select(Collection.id).where(Collection.slug == slug)):
        slug = f"{base[:29]}-{n}"; n += 1
    order = (db.scalar(select(func.max(Collection.sort_order))) or 0) + 1
    c = Collection(slug=slug, label=body.label.strip(), note=body.note.strip(),
                   symbols=_check_symbols(db, body.symbols), sort_order=order)
    db.add(c)
    db.commit()
    return c


@router.put("/collections/{slug}", response_model=CollectionAdminOut)
def update_collection(slug: str, body: CollectionIn, db: Session = Depends(get_db)) -> Collection:
    c = db.scalar(select(Collection).where(Collection.slug == slug))
    if c is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such finder")
    c.label, c.note, c.symbols = body.label.strip(), body.note.strip(), _check_symbols(db, body.symbols)
    db.commit()
    return c


@router.delete("/collections/{slug}", status_code=status.HTTP_204_NO_CONTENT)
def delete_collection(slug: str, db: Session = Depends(get_db)) -> Response:
    c = db.scalar(select(Collection).where(Collection.slug == slug))
    if c is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such finder")
    db.delete(c)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ================================================================== missed searches

class MissGroup(BaseModel):
    query: str
    count: int
    students: list[str]
    last_at: datetime


@router.get("/search-misses", response_model=list[MissGroup])
def misses(db: Session = Depends(get_db)) -> list[MissGroup]:
    names = {u.id: u.display_name for u in db.scalars(select(User))}
    groups: dict[str, dict[str, Any]] = {}
    for m in db.scalars(select(SearchMiss).order_by(SearchMiss.created_at)):
        g = groups.setdefault(m.query, {"query": m.query, "count": 0, "students": [], "last_at": m.created_at})
        g["count"] += 1
        g["last_at"] = max(g["last_at"], m.created_at)
        who = names.get(m.user_id or -1)
        if who and who not in g["students"]:
            g["students"].append(who)
    return [MissGroup(**g) for g in sorted(groups.values(), key=lambda g: (-g["count"], -g["last_at"].timestamp()))]


@router.delete("/search-misses", status_code=status.HTTP_204_NO_CONTENT)
def dismiss_miss(query: str = Query(min_length=1, max_length=64), db: Session = Depends(get_db)) -> Response:
    for m in db.scalars(select(SearchMiss).where(SearchMiss.query == query)):
        db.delete(m)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
