import itertools

import pytest

from app.config import get_settings
from app.db import SessionLocal
from app.models import Card, User
from app.questions import Bank
from app.security import hash_password

_ids = itertools.count(1)


@pytest.fixture
def fresh(client):
    """A brand-new student, signed in, so tests don't share progress."""
    name = f"learner{next(_ids)}"
    with SessionLocal() as db:
        db.add(User(username=name, display_name=name, role="student", password_hash=hash_password("pw123456")))
        db.commit()
    assert client.post("/api/auth/login", json={"username": name, "password": "pw123456"}).status_code == 200
    return client


def right_answer(card: dict) -> str:
    with SessionLocal() as db:
        return Bank(db).question(card["element"], card["fact"]).answer


def test_exploring_adds_cards_for_each_fact(fresh):
    fresh.post("/api/me/explored/11")  # sodium: symbol, family, valence, use, latin
    fresh.post("/api/me/explored/118")  # oganesson: symbol, family only
    q = fresh.get("/api/review/queue").json()
    facts = sorted(c["fact"] for c in q["cards"] if c["element"] == 11)
    assert facts == ["family", "latin", "symbol", "use", "valence"]
    assert sorted(c["fact"] for c in q["cards"] if c["element"] == 118) == ["family", "symbol"]
    assert q["due_total"] == 7
    assert all("answer" not in c for c in q["cards"])
    assert all(len(c["options"]) == 4 for c in q["cards"])


def test_new_cards_are_capped_per_day(fresh, monkeypatch):
    monkeypatch.setattr(get_settings(), "new_cards_per_day", 3)
    for n in (1, 6, 8, 11):
        fresh.post(f"/api/me/explored/{n}")
    q = fresh.get("/api/review/queue").json()
    assert len(q["cards"]) == 3 and q["due_total"] == 3
    for c in q["cards"]:
        fresh.post(f"/api/review/{c['card_id']}", json={"answer": right_answer(c), "duration_ms": 6000})
    # All 3 new cards used; only the learning-step repeats (due in minutes) remain.
    assert fresh.get("/api/me/stats").json()["due_today"] == 0


def test_answers_are_graded_and_scheduled(fresh):
    fresh.post("/api/me/explored/26")
    cards = fresh.get("/api/review/queue").json()["cards"]
    c = cards[0]
    ok = fresh.post(f"/api/review/{c['card_id']}", json={"answer": right_answer(c), "duration_ms": 1500}).json()
    assert ok["correct"] is True and ok["rating"] == "easy"
    assert ok["element_level"] == "learning"
    bad = fresh.post(f"/api/review/{cards[1]['card_id']}", json={"answer": "definitely wrong", "duration_ms": 9000}).json()
    assert bad["correct"] is False and bad["rating"] == "again" and bad["answer"] == right_answer(cards[1])
    assert fresh.post("/api/review/999999", json={"answer": "x"}).status_code == 404


def test_cannot_answer_someone_elses_card(fresh, client):
    fresh.post("/api/me/explored/2")
    card_id = fresh.get("/api/review/queue").json()["cards"][0]["card_id"]
    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"username": "soysauce", "password": "elements"})
    assert client.post(f"/api/review/{card_id}", json={"answer": "He"}).status_code == 404


def test_mastery_levels_and_badge(fresh):
    fresh.post("/api/me/explored/10")
    fresh.post("/api/me/explored/12")
    cards = [c for c in fresh.get("/api/review/queue").json()["cards"] if c["element"] == 12]
    me = fresh.get("/api/auth/me").json()
    with SessionLocal() as db:  # pretend every neon card has been remembered for weeks
        for c in db.query(Card).filter(Card.user_id == me["id"], Card.element_number == 10):
            c.state, c.interval_days = "review", 30.0
        db.commit()
    m = fresh.get("/api/me/mastery").json()
    assert m["levels"]["10"] == "mastered" and m["counts"]["mastered"] == 1
    assert fresh.get("/api/me/stats").json()["mastered"] == 1
    r = fresh.post(f"/api/review/{cards[0]['card_id']}", json={"answer": right_answer(cards[0]), "duration_ms": 5000}).json()
    assert "mastered:1" in [b["code"] for b in r["new_badges"]]


def test_quiz_round(fresh):
    q = fresh.post("/api/quiz/start", json={"mode": "mixed"}).json()
    assert q["title"] == "Mixed challenge" and len(q["questions"]) == 10
    pairs = {(x["element"], x["fact"]) for x in q["questions"]}
    assert len(pairs) == 10
    assert all(x["answer"] in x["options"] and x["element"] <= 86 for x in q["questions"])
    results = [{"element": x["element"], "fact": x["fact"], "correct": True} for x in q["questions"]]
    done = fresh.post("/api/quiz/finish", json={"mode": "mixed", "results": results}).json()
    assert done["score"] == 10 and "quiz:perfect" in [b["code"] for b in done["new_badges"]]


def test_quiz_modes(fresh):
    ng = fresh.post("/api/quiz/start", json={"mode": "family:ng"}).json()
    assert ng["title"] == "Noble gases" and {x["element"] for x in ng["questions"]} <= {2, 10, 18, 36, 54, 86}
    g1 = fresh.post("/api/quiz/start", json={"mode": "group:1"}).json()
    assert {x["element"] for x in g1["questions"]} <= {1, 3, 11, 19, 37, 55, 87}
    weak = fresh.post("/api/quiz/start", json={"mode": "weak"}).json()
    assert weak["note"]  # nothing practiced yet, so it falls back to mixed
    assert fresh.post("/api/quiz/start", json={"mode": "group:19"}).status_code == 404
    assert fresh.post("/api/quiz/start", json={"mode": "drop table"}).status_code == 422


def test_weak_spots_target_wrong_answers(fresh):
    for n in (3, 4, 5, 6, 7):
        fresh.post(f"/api/me/explored/{n}")
    cards = fresh.get("/api/review/queue").json()["cards"]
    for c in cards:
        wrong = c["element"] in (4, 5)
        fresh.post(f"/api/review/{c['card_id']}", json={"answer": "nope" if wrong else right_answer(c), "duration_ms": 5000})
    weak = fresh.post("/api/quiz/start", json={"mode": "weak"}).json()
    assert weak["note"] is None and weak["title"] == "Your weak spots"
    assert {x["element"] for x in weak["questions"]} & {4, 5}
