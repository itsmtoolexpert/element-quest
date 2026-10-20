"""Seed reference data and starter accounts. Safe to run on every start:
it only inserts rows that are missing and never overwrites admin edits.

    python -m app.seed
"""
from __future__ import annotations

import json
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import SessionLocal
from ..models import Collection, Element, ElementContent, Family, User
from ..security import hash_password

DATA = Path(__file__).parent / "data"
AVATARS = ["atom", "flask", "rocket", "magnet", "flame", "bolt"]


def _load(name: str) -> list[dict]:
    return json.loads((DATA / f"{name}.json").read_text(encoding="utf-8"))


def seed_reference(db: Session) -> dict[str, int]:
    added = {"families": 0, "elements": 0, "collections": 0}
    have = set(db.scalars(select(Family.code)))
    for f in _load("families"):
        if f["code"] not in have:
            db.add(Family(**f)); added["families"] += 1
    db.flush()

    have_el = set(db.scalars(select(Element.number)))
    for e in _load("elements"):
        if e["number"] in have_el:
            continue
        content = e.pop("content")
        e["family_code"] = e.pop("family")
        db.add(Element(**e))
        db.add(ElementContent(element_number=e["number"], **content))
        added["elements"] += 1
    db.flush()

    have_col = set(db.scalars(select(Collection.slug)))
    for i, c in enumerate(_load("collections")):
        if c["slug"] not in have_col:
            db.add(Collection(sort_order=i, **c)); added["collections"] += 1
    return added


def seed_users(db: Session) -> list[str]:
    s = get_settings()
    created: list[str] = []
    if db.scalar(select(User).where(User.username == "admin")) is None:
        db.add(User(username="admin", display_name="Parent / Teacher", role="admin",
                    password_hash=hash_password(s.admin_password), avatar="teacher"))
        created.append("admin")
    for i, pair in enumerate(p for p in s.seed_students.split(",") if p.strip()):
        username, _, display = pair.partition(":")
        username = username.strip().lower()
        if db.scalar(select(User).where(User.username == username)) is None:
            db.add(User(username=username, display_name=display.strip() or username, role="student",
                        password_hash=hash_password(s.student_default_password),
                        avatar=AVATARS[i % len(AVATARS)]))
            created.append(username)
    return created


def main() -> None:
    with SessionLocal() as db:
        added = seed_reference(db)
        users = seed_users(db)
        db.commit()
    print(f"seed: added {added}, new accounts {users or 'none'}")


if __name__ == "__main__":
    main()
