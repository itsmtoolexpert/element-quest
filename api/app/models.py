"""Database tables. Reference content (families, elements, content, collections, materials)
is edited by the admin; everything else records what students do."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------- reference

class Family(Base):
    __tablename__ = "families"

    code: Mapped[str] = mapped_column(String(4), primary_key=True)
    name: Mapped[str] = mapped_column(String(64))
    short_name: Mapped[str] = mapped_column(String(32))
    color: Mapped[str] = mapped_column(String(9))
    description: Mapped[str] = mapped_column(Text)


class Element(Base):
    __tablename__ = "elements"

    number: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    symbol: Mapped[str] = mapped_column(String(3), unique=True)
    name: Mapped[str] = mapped_column(String(32), unique=True)
    mass: Mapped[str] = mapped_column(String(16))
    mass_is_estimate: Mapped[bool] = mapped_column(Boolean, default=False)
    family_code: Mapped[str] = mapped_column(ForeignKey("families.code"))
    group: Mapped[int | None] = mapped_column(Integer)
    period: Mapped[int] = mapped_column(Integer)
    block: Mapped[str] = mapped_column(String(1))
    state: Mapped[str] = mapped_column(String(8))
    radioactive: Mapped[bool] = mapped_column(Boolean, default=False)
    electron_config: Mapped[str] = mapped_column(String(64))
    shells: Mapped[list[int]] = mapped_column(JSON)
    valence_electrons: Mapped[int | None] = mapped_column(Integer)
    latin_name: Mapped[str | None] = mapped_column(String(32))

    family: Mapped[Family] = relationship(lazy="joined")
    content: Mapped[ElementContent | None] = relationship(back_populates="element", uselist=False, lazy="joined")


class ElementContent(Base):
    __tablename__ = "element_content"

    element_number: Mapped[int] = mapped_column(ForeignKey("elements.number", ondelete="CASCADE"), primary_key=True)
    everyday_use: Mapped[str] = mapped_column(Text)
    go_deeper: Mapped[str | None] = mapped_column(Text)
    try_it: Mapped[str | None] = mapped_column(Text)
    featured: Mapped[bool] = mapped_column(Boolean, default=False)
    # {"question", "correct", "wrong": [..3], "explanation"}
    check_question: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    element: Mapped[Element] = relationship(back_populates="content")


class Collection(Base):
    """A "Find elements in" set, e.g. Your phone or Kitchen."""

    __tablename__ = "collections"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(32), unique=True)
    label: Mapped[str] = mapped_column(String(64))
    note: Mapped[str] = mapped_column(Text)
    symbols: Mapped[list[str]] = mapped_column(JSON)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class Material(Base):
    """A "What's inside" entry, e.g. diamond, water, steel."""

    __tablename__ = "materials"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(64), unique=True)
    aliases: Mapped[list[str]] = mapped_column(JSON, default=list)
    formula: Mapped[str | None] = mapped_column(String(64))
    kind: Mapped[str] = mapped_column(String(16))  # element | compound | mixture
    # {"Fe": 98.0, "C": 2.0}: percent by mass
    composition: Mapped[dict[str, float]] = mapped_column(JSON)
    # atoms per formula unit, e.g. {"H": 2, "O": 1}; null for mixtures
    atoms: Mapped[dict[str, float] | None] = mapped_column(JSON)
    note: Mapped[str | None] = mapped_column(Text)
    source: Mapped[str | None] = mapped_column(String(200))
    featured: Mapped[bool] = mapped_column(Boolean, default=False)  # quick-tap example under the search box


class SearchMiss(Base):
    """A materials search that found nothing, so the admin can add it."""

    __tablename__ = "search_misses"

    id: Mapped[int] = mapped_column(primary_key=True)
    query: Mapped[str] = mapped_column(String(64), index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


# ---------------------------------------------------------------- people

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(32), unique=True)
    display_name: Mapped[str] = mapped_column(String(48))
    role: Mapped[str] = mapped_column(String(8))  # student | admin
    password_hash: Mapped[str] = mapped_column(String(255))
    avatar: Mapped[str | None] = mapped_column(String(32))
    grade: Mapped[str | None] = mapped_column(String(16))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


# ---------------------------------------------------------------- learning

class Card(Base):
    """One fact about one element for one student, scheduled by FSRS."""

    __tablename__ = "cards"
    __table_args__ = (
        UniqueConstraint("user_id", "element_number", "fact"),
        Index("ix_cards_user_due", "user_id", "due"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    element_number: Mapped[int] = mapped_column(ForeignKey("elements.number", ondelete="CASCADE"))
    fact: Mapped[str] = mapped_column(String(24))  # symbol | family | valence | use | latin
    state: Mapped[str] = mapped_column(String(12), default="new")  # new | learning | review | relearning
    due: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    fsrs: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)  # scheduler's own card state
    interval_days: Mapped[float] = mapped_column(Float, default=0.0)  # gap between last review and due
    last_review: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    introduced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))  # first review
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[int] = mapped_column(primary_key=True)
    card_id: Mapped[int] = mapped_column(ForeignKey("cards.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    rating: Mapped[int] = mapped_column(Integer)  # 1 Again, 2 Hard, 3 Good, 4 Easy
    correct: Mapped[bool] = mapped_column(Boolean)
    duration_ms: Mapped[int | None] = mapped_column(Integer)
    reviewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(32))
    score: Mapped[int] = mapped_column(Integer)
    total: Mapped[int] = mapped_column(Integer)
    questions: Mapped[list[dict[str, Any]]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Exploration(Base):
    __tablename__ = "explorations"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    element_number: Mapped[int] = mapped_column(ForeignKey("elements.number", ondelete="CASCADE"), primary_key=True)
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Badge(Base):
    __tablename__ = "badges"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    code: Mapped[str] = mapped_column(String(32), primary_key=True)
    earned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
