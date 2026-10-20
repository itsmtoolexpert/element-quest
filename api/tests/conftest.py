"""Tests run against the database in DATABASE_URL (CI uses a Postgres service).
Every test session starts from empty tables, then seeds."""
import os

os.environ.setdefault("SECRET_KEY", "test-secret-key-that-is-long-enough-123")
os.environ.setdefault("ADMIN_PASSWORD", "admin-test-pass")
os.environ.setdefault("STUDENT_DEFAULT_PASSWORD", "elements")
os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")

import pytest
from fastapi.testclient import TestClient

from app.db import Base, SessionLocal, engine
from app.main import app
from app.security import throttle
from app.seed.__main__ import seed_reference, seed_users


@pytest.fixture(scope="session", autouse=True)
def database():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed_reference(db)
        seed_users(db)
        db.commit()
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture
def client():
    throttle._fails.clear()
    with TestClient(app) as c:
        yield c


@pytest.fixture
def student(client):
    r = client.post("/api/auth/login", json={"username": "soysauce", "password": "elements"})
    assert r.status_code == 200, r.text
    return client
