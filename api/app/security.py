"""Password hashing, session helpers and a small login throttle."""
from __future__ import annotations

import time
from threading import Lock

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from .db import get_db
from .models import User

_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except (VerifyMismatchError, InvalidHashError):
        return False


class LoginThrottle:
    """Locks a username for a while after too many wrong passwords (in memory; resets on restart)."""

    def __init__(self) -> None:
        self._fails: dict[str, list[float]] = {}
        self._lock = Lock()

    def locked_for(self, key: str, max_failures: int, window: int) -> int:
        now = time.monotonic()
        with self._lock:
            recent = [t for t in self._fails.get(key, []) if now - t < window]
            self._fails[key] = recent
            if len(recent) >= max_failures:
                return int(window - (now - recent[0])) + 1
            return 0

    def fail(self, key: str) -> None:
        with self._lock:
            self._fails.setdefault(key, []).append(time.monotonic())

    def clear(self, key: str) -> None:
        with self._lock:
            self._fails.pop(key, None)


throttle = LoginThrottle()


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    user_id = request.session.get("user_id")
    user = db.get(User, user_id) if user_id else None
    if user is None or not user.is_active:
        request.session.clear()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not signed in")
    return user


def require_admin(user: User = Depends(current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admins only")
    return user
