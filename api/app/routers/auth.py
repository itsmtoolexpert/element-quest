from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db
from ..models import User
from ..schemas import LoginIn, ProfileOut, UserOut
from ..security import current_user, hash_password, throttle, verify_password

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


class PasswordChange(BaseModel):
    current: str = Field(min_length=1, max_length=128)
    new: str = Field(min_length=4, max_length=128)


@router.post("/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(body: PasswordChange, user: User = Depends(current_user), db: Session = Depends(get_db)) -> None:
    if not verify_password(user.password_hash, body.current):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Your current password doesn't match.")
    if user.role == "admin" and len(body.new) < 8:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Admin passwords need at least 8 characters.")
    user.password_hash = hash_password(body.new)
    db.commit()


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)) -> User:
    return user
