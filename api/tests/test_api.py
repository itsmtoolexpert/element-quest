def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_profiles_list_seeded_accounts_without_secrets(client):
    rows = client.get("/api/auth/profiles").json()
    names = {r["display_name"] for r in rows}
    assert {"Soy Sauce", "Ketchup King", "Parent / Teacher"} <= names
    assert all("password_hash" not in r for r in rows)


def test_elements_require_login(client):
    assert client.get("/api/elements").status_code == 401


def test_login_and_me(student):
    me = student.get("/api/auth/me").json()
    assert me["username"] == "soysauce" and me["role"] == "student"


def test_username_is_case_insensitive(client):
    assert client.post("/api/auth/login", json={"username": "KetchupKing", "password": "elements"}).status_code == 200


def test_wrong_password_then_lockout(client):
    for _ in range(5):
        assert client.post("/api/auth/login", json={"username": "ketchupking", "password": "nope"}).status_code == 401
    r = client.post("/api/auth/login", json={"username": "ketchupking", "password": "elements"})
    assert r.status_code == 429


def test_logout(student):
    assert student.post("/api/auth/logout").status_code == 204
    assert student.get("/api/auth/me").status_code == 401


def test_all_118_elements(student):
    rows = student.get("/api/elements").json()
    assert len(rows) == 118
    assert [r["number"] for r in rows] == list(range(1, 119))
    assert sum(r["featured"] for r in rows) == 30


def test_element_detail_by_symbol_and_number(student):
    cl = student.get("/api/elements/cl").json()
    assert cl["name"] == "Chlorine"
    assert cl["valence_electrons"] == 7
    assert cl["electron_config"] == "[Ne] 3s² 3p⁵"
    assert cl["shells"] == [2, 8, 7]
    assert cl["family"]["code"] == "hl"
    fe = student.get("/api/elements/26").json()
    assert fe["latin_name"] == "ferrum"
    assert fe["content"]["check_question"]["correct"] == "Carries oxygen"
    assert student.get("/api/elements/Xx").status_code == 404


def test_exception_configs(student):
    assert student.get("/api/elements/Cr").json()["electron_config"] == "[Ar] 3d⁵ 4s¹"
    assert student.get("/api/elements/Cu").json()["electron_config"] == "[Ar] 3d¹⁰ 4s¹"


def test_collections_and_families(student):
    cols = student.get("/api/collections").json()
    assert [c["slug"] for c in cols][:2] == ["phone", "kitchen"]
    assert len(student.get("/api/families").json()) == 11
