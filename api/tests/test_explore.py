from app.db import SessionLocal
from app.models import SearchMiss


def login(client, username="ketchupking"):
    assert client.post("/api/auth/login", json={"username": username, "password": "elements"}).status_code == 200
    return client


def test_materials_library(student):
    rows = student.get("/api/materials").json()
    assert len(rows) == 73
    by = {r["name"]: r for r in rows}
    water = by["Water"]
    assert water["kind"] == "compound" and water["atoms"] == {"H": 2, "O": 1}
    assert round(water["composition"]["O"], 1) == 88.8
    assert by["Diamond"]["composition"] == {"C": 100.0}
    assert by["Blood"]["kind"] == "mixture" and by["Blood"]["source"]
    assert sum(r["featured"] for r in rows) == 8
    assert "salt" in by["Table salt"]["aliases"]


def test_explore_records_once_and_awards_first_badge(client):
    login(client)
    r = client.post("/api/me/explored/26").json()
    assert r["new"] is True and r["explored_count"] == 1
    assert [b["code"] for b in r["new_badges"]] == ["explored:1"]
    again = client.post("/api/me/explored/26").json()
    assert again["new"] is False and again["new_badges"] == []
    assert client.post("/api/me/explored/999").status_code == 404
    mine = client.get("/api/me/explored").json()
    assert mine["numbers"] == [26]
    stats = client.get("/api/me/stats").json()
    assert stats["explored"] == 1 and stats["streak_days"] == 1


def test_family_badge_when_family_complete(client):
    login(client, "soysauce")
    noble = [2, 10, 18, 36, 54, 86]  # every noble gas except oganesson (118, superheavy family)
    earned = []
    for n in noble:
        earned += [b["code"] for b in client.post(f"/api/me/explored/{n}").json()["new_badges"]]
    assert "family:ng" in earned
    labels = {b["code"]: b["label"] for b in client.get("/api/me/explored").json()["badges"]}
    assert labels["family:ng"] == "All noble gases explored"


def test_search_miss_logged_once_and_ignores_real_matches(student):
    for q in ["Toothpaste", "toothpaste ", "salt", "Iron", "fe"]:
        assert student.post("/api/search-misses", json={"query": q}).status_code == 204
    with SessionLocal() as db:
        rows = [m.query for m in db.query(SearchMiss).all()]
    assert rows.count("toothpaste") == 1
    assert not {"salt", "iron", "fe"} & set(rows)
