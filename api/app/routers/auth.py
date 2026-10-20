from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db
from ..models import User
from ..schemas import LoginIn, ProfileOut, UserOut
from ..security import current_user, throttle, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/profiles", response_model=list[ProfileOut])
def profiles(db: Session = Depends(get_db)) -> list[User]:
    """Names and avatars for the "Who's learning?" sign-in screen (no secrets)."""
    rows = db.scalars(select(User).where(User.is_active).order_by(User.role.desc(), User.display_name))
    return list(rows)


@router.post("/login", response_model=UserOut)
def login(body: LoginIn, request: Request, db: Session = Depends(get_db)) -> User:
    s = get_settings()
    key = body.username.strip().lower()
    wait = throttle.locked_for(key, s.login_max_failures, s.login_lockout_seconds)
    if wait:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, f"Too many tries. Wait {wait} seconds.")
    user = db.scalar(select(User).where(User.username == key))
    if user is None or not user.is_active or not verify_password(user.password_hash, body.password):
        throttle.fail(key)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "That password doesn't match.")
    throttle.clear(key)
    user.last_seen_at = datetime.now(timezone.utc)
    db.commit()
    request.session.clear()
    request.session["user_id"] = user.id
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request) -> None:
    request.session.clear()


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)) -> User:
    return user
