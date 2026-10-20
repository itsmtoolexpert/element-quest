from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class FamilyOut(ORM):
    code: str
    name: str
    short_name: str
    color: str
    description: str


class ContentOut(ORM):
    everyday_use: str
    go_deeper: str | None
    try_it: str | None
    featured: bool
    check_question: dict[str, Any] | None


class ElementSummary(ORM):
    number: int
    symbol: str
    name: str
    mass: str
    mass_is_estimate: bool
    family_code: str
    group: int | None
    period: int
    block: str
    state: str
    radioactive: bool
    valence_electrons: int | None
    featured: bool = False
    everyday_use: str = ""


class ElementDetail(ElementSummary):
    electron_config: str
    shells: list[int]
    latin_name: str | None
    family: FamilyOut
    content: ContentOut | None


class CollectionOut(ORM):
    slug: str
    label: str
    note: str
    symbols: list[str]


class ProfileOut(ORM):
    username: str
    display_name: str
    avatar: str | None
    role: str


class UserOut(ProfileOut):
    id: int
    grade: str | None


class LoginIn(BaseModel):
    username: str = Field(min_length=1, max_length=32)
    password: str = Field(min_length=1, max_length=128)
