import pytest


@pytest.fixture
def admin(client):
    assert client.post("/api/auth/login", json={"username": "admin", "password": "admin-test-pass"}).status_code == 200
    return client


def test_students_cannot_use_admin(student):
    assert student.get("/api/admin/overview").status_code == 403
    assert student.post("/api/admin/users", json={"username": "x1", "display_name": "X", "password": "abcd"}).status_code == 403


def test_overview_lists_active_students_with_activity(admin):
    rows = admin.get("/api/admin/overview").json()
    names = [r["display_name"] for r in rows]
    assert "Soy Sauce" in names and "Ketchup King" in names and "Parent / Teacher" not in names
    r = rows[0]
    assert len(r["activity"]) == 14 and {"explored", "reviews", "quizzes"} <= set(r["activity"][0])
    detail = admin.get(f"/api/admin/students/{r['id']}").json()
    assert len(detail["activity"]) == 30 and len(detail["levels"]) == 118
    assert sum(detail["level_counts"].values()) == 118
    assert admin.get("/api/admin/students/999999").status_code == 404


def test_trouble_elements_show_up(admin, client):
    sid = admin.post("/api/admin/users", json={"username": "trouble1", "display_name": "Trouble", "password": "pw1234"}).json()["id"]
    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"username": "trouble1", "password": "pw1234"})
    client.post("/api/me/explored/16")
    for c in client.get("/api/review/queue").json()["cards"]:
        client.post(f"/api/review/{c['card_id']}", json={"answer": "wrong", "duration_ms": 5000})
    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"username": "admin", "password": "admin-test-pass"})
    d = client.get(f"/api/admin/students/{sid}").json()
    assert d["trouble"][0]["symbol"] == "S" and d["trouble"][0]["wrong"] >= 3
    assert d["reviews_7d"] >= 3 and d["accuracy_7d"] == 0
    assert d["activity"][-1]["reviews"] >= 3


def test_account_management(admin, client):
    r = admin.post("/api/admin/users", json={"username": "newkid", "display_name": "New Kid", "password": "abcd", "avatar": "rocket"})
    assert r.status_code == 201
    uid = r.json()["id"]
    assert admin.post("/api/admin/users", json={"username": "newkid", "display_name": "Dup", "password": "abcd"}).status_code == 409
    assert admin.post("/api/admin/users", json={"username": "Bad Name!", "display_name": "x", "password": "abcd"}).status_code == 422
    assert admin.patch(f"/api/admin/users/{uid}", json={"display_name": "Newer Kid", "grade": "8"}).json()["display_name"] == "Newer Kid"
    assert admin.post(f"/api/admin/users/{uid}/password", json={"password": "zzzz"}).status_code == 204
    me = admin.get("/api/auth/me").json()
    assert admin.patch(f"/api/admin/users/{me['id']}", json={"is_active": False}).status_code == 400
    assert admin.patch(f"/api/admin/users/{uid}", json={"is_active": False}).json()["is_active"] is False
    profiles = [p["username"] for p in admin.get("/api/auth/profiles").json()]
    assert "newkid" not in profiles
    client.post("/api/auth/logout")
    assert client.post("/api/auth/login", json={"username": "newkid", "password": "zzzz"}).status_code == 401


def test_change_own_password(client):
    client.post("/api/admin/users")  # not signed in → 401, ignore
    client.post("/api/auth/login", json={"username": "admin", "password": "admin-test-pass"})
    client.post("/api/admin/users", json={"username": "pwkid", "display_name": "Pw", "password": "old1"})
    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"username": "pwkid", "password": "old1"})
    assert client.post("/api/auth/password", json={"current": "nope", "new": "new1"}).status_code == 400
    assert client.post("/api/auth/password", json={"current": "old1", "new": "new1"}).status_code == 204
    client.post("/api/auth/logout")
    assert client.post("/api/auth/login", json={"username": "pwkid", "password": "new1"}).status_code == 200


def test_edit_element_content(admin):
    original = admin.get("/api/elements/42").json()["content"]
    body = {"everyday_use": "Shiny new use.", "go_deeper": "Deeper.", "try_it": "", "featured": True,
            "check_question": {"question": "What is it?", "correct": "A", "wrong": ["B", "C", "D"], "explanation": "Because."}}
    r = admin.put("/api/admin/elements/42/content", json=body)
    assert r.status_code == 200 and r.json()["everyday_use"] == "Shiny new use" and r.json()["try_it"] is None
    mo = admin.get("/api/elements/42").json()
    assert mo["featured"] is True and mo["content"]["check_question"]["correct"] == "A"
    body["check_question"]["wrong"] = ["A", "C", "D"]
    assert admin.put("/api/admin/elements/42/content", json=body).status_code == 422
    assert admin.put("/api/admin/elements/999/content", json={"everyday_use": "abc"}).status_code == 404
    assert admin.put("/api/admin/elements/42/content", json=original).status_code == 200  # leave the seed data as it was


def test_materials_crud_and_misses(admin, client):
    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"username": "soysauce", "password": "elements"})
    client.post("/api/search-misses", json={"query": "Granite"})
    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"username": "admin", "password": "admin-test-pass"})
    misses = {m["query"]: m for m in client.get("/api/admin/search-misses").json()}
    assert misses["granite"]["students"] == ["Soy Sauce"]

    assert client.post("/api/admin/materials/preview", json={"formula": "H2O"}).json()["atoms"] == {"H": 2, "O": 1}
    assert client.post("/api/admin/materials/preview", json={"formula": "Xx2"}).status_code == 422
    assert client.post("/api/admin/materials/preview", json={"formula": "Ca(OH"}).status_code == 422

    granite = {"name": "Granite", "aliases": ["granite countertop"], "composition": {"O": 48, "Si": 32, "Al": 7.7, "K": 3.4},
               "note": "A speckled rock.", "featured": False}
    r = client.post("/api/admin/materials", json=granite)
    assert r.status_code == 201 and r.json()["kind"] == "mixture"
    assert "granite" not in {m["query"] for m in client.get("/api/admin/search-misses").json()}
    assert client.post("/api/admin/materials", json=granite).status_code == 409

    mid = r.json()["id"]
    upd = client.put(f"/api/admin/materials/{mid}", json={"name": "Granite", "formula": "SiO2"}).json()
    assert upd["kind"] == "compound" and upd["composition"]["O"] > 50
    assert client.put(f"/api/admin/materials/{mid}", json={"name": "Granite", "composition": {"O": 10}}).status_code == 422
    assert client.put(f"/api/admin/materials/{mid}", json={"name": "Granite", "formula": "SiO2", "composition": {"O": 100}}).status_code == 422
    assert client.delete(f"/api/admin/materials/{mid}").status_code == 204
    temp = client.post("/api/admin/materials", json={"name": "Temp", "formula": "C"}).json()
    assert temp["kind"] == "element"
    client.delete(f"/api/admin/materials/{temp['id']}")
    assert client.delete("/api/admin/search-misses", params={"query": "nothing-here"}).status_code == 204


def test_finders(admin):
    r = admin.post("/api/admin/collections", json={"label": "Your bike", "note": "Frames and spokes.", "symbols": ["al", "Ti", "C", "Fe", "fe"]})
    assert r.status_code == 201 and r.json()["slug"] == "your-bike" and r.json()["symbols"] == ["Al", "Ti", "C", "Fe"]
    assert admin.post("/api/admin/collections", json={"label": "Your bike", "note": "n", "symbols": ["H"]}).json()["slug"] == "your-bike-2"
    assert admin.put("/api/admin/collections/your-bike", json={"label": "Bikes", "note": "n", "symbols": ["Zz"]}).status_code == 422
    assert admin.put("/api/admin/collections/your-bike", json={"label": "Bikes", "note": "n", "symbols": ["Al"]}).json()["label"] == "Bikes"
    assert admin.delete("/api/admin/collections/your-bike-2").status_code == 204
    slugs = [c["slug"] for c in admin.get("/api/collections").json()]
    assert "your-bike" in slugs and "your-bike-2" not in slugs
