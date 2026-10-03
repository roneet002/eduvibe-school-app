"""Backend API test suite for EduVibe school app.
Covers: health, auth (login/register/me), student dashboard, student leaves,
content endpoints, admin RBAC, admin CMS CRUD, admin leaves management.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://student-portal-1712.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

STUDENT_EMAIL = "student@eduvibe.com"
STUDENT_PASSWORD = "student123"
ADMIN_EMAIL = "admin@eduvibe.com"
ADMIN_PASSWORD = "admin123"


# ---------- fixtures ----------
@pytest.fixture(scope="session")
def http():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def student_token(http):
    r = http.post(f"{API}/auth/login", json={"email": STUDENT_EMAIL, "password": STUDENT_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["session_token"]


@pytest.fixture(scope="session")
def admin_token(http):
    r = http.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["session_token"]


def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- health ----------
def test_health_ok(http):
    r = http.get(f"{API}/health")
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


# ---------- auth: login ----------
def test_login_student_returns_role_student(http):
    r = http.post(f"{API}/auth/login", json={"email": STUDENT_EMAIL, "password": STUDENT_PASSWORD})
    assert r.status_code == 200
    data = r.json()
    assert "session_token" in data and data["session_token"]
    assert data["user"]["role"] == "student"
    assert data["user"]["email"] == STUDENT_EMAIL


def test_login_admin_returns_role_admin(http):
    r = http.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200
    data = r.json()
    assert data["user"]["role"] == "admin"


def test_login_wrong_password_401(http):
    r = http.post(f"{API}/auth/login", json={"email": STUDENT_EMAIL, "password": "wrongpass"})
    assert r.status_code == 401


# ---------- auth: register ----------
def test_register_creates_user_and_duplicate_fails(http):
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    payload = {"email": email, "password": "pw12345!", "name": "TEST User", "role": "student"}
    r = http.post(f"{API}/auth/register", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["session_token"]
    assert data["user"]["email"] == email
    assert data["user"]["role"] == "student"

    # duplicate
    r2 = http.post(f"{API}/auth/register", json=payload)
    assert r2.status_code == 400


# ---------- auth: me ----------
def test_me_returns_user_with_token(http, student_token):
    r = http.get(f"{API}/auth/me", headers=auth(student_token))
    assert r.status_code == 200
    assert r.json()["user"]["email"] == STUDENT_EMAIL


def test_me_without_token_401(http):
    r = http.get(f"{API}/auth/me")
    assert r.status_code == 401


# ---------- student dashboard ----------
def test_dashboard_requires_auth(http):
    r = http.get(f"{API}/student/dashboard")
    assert r.status_code == 401


def test_dashboard_has_30_modules_and_stats(http, student_token):
    r = http.get(f"{API}/student/dashboard", headers=auth(student_token))
    assert r.status_code == 200
    data = r.json()
    assert len(data["modules"]) == 30
    assert "stats" in data and "attendance" in data["stats"]
    assert "circulars" in data and isinstance(data["circulars"], list)
    assert "upcoming_class" in data
    assert data["student"]["class_name"]


# ---------- student leaves ----------
def test_create_and_list_my_leaves(http, student_token):
    payload = {"start_date": "2026-02-01", "end_date": "2026-02-02", "reason": "TEST leave"}
    r = http.post(f"{API}/student/leaves", json=payload, headers=auth(student_token))
    assert r.status_code == 200
    leave = r.json()["leave"]
    assert leave["status"] == "Pending"

    r2 = http.get(f"{API}/student/leaves", headers=auth(student_token))
    assert r2.status_code == 200
    ids = [l["id"] for l in r2.json()["leaves"]]
    assert leave["id"] in ids


# ---------- content ----------
def test_content_circulars_requires_auth(http):
    r = http.get(f"{API}/content/circulars")
    assert r.status_code == 401


def test_content_circulars_seeded(http, student_token):
    r = http.get(f"{API}/content/circulars", headers=auth(student_token))
    assert r.status_code == 200
    entries = r.json()["entries"]
    assert len(entries) >= 1


# ---------- admin RBAC ----------
def test_student_cannot_access_admin_stats(http, student_token):
    r = http.get(f"{API}/admin/stats", headers=auth(student_token))
    assert r.status_code == 403


def test_student_cannot_create_content(http, student_token):
    r = http.post(f"{API}/admin/content/circulars", json={"title": "x"}, headers=auth(student_token))
    assert r.status_code == 403


# ---------- admin CMS CRUD ----------
def test_admin_crud_circular_appears_in_student_view(http, admin_token, student_token):
    # CREATE
    unique = f"TEST_CIRC_{uuid.uuid4().hex[:6]}"
    r = http.post(
        f"{API}/admin/content/circulars",
        json={"title": unique, "subtitle": "TEST", "value": "today"},
        headers=auth(admin_token),
    )
    assert r.status_code == 200, r.text
    entry_id = r.json()["entry"]["id"]

    # student sees it
    r2 = http.get(f"{API}/content/circulars", headers=auth(student_token))
    titles = [e["title"] for e in r2.json()["entries"]]
    assert unique in titles

    # UPDATE
    r3 = http.put(
        f"{API}/admin/content/circulars/{entry_id}",
        json={"title": unique + "_UPD", "subtitle": "TEST", "value": "today"},
        headers=auth(admin_token),
    )
    assert r3.status_code == 200
    assert r3.json()["entry"]["title"].endswith("_UPD")

    # DELETE
    r4 = http.delete(f"{API}/admin/content/circulars/{entry_id}", headers=auth(admin_token))
    assert r4.status_code == 200

    # GET verifies deletion
    r5 = http.get(f"{API}/content/circulars", headers=auth(student_token))
    titles2 = [e["title"] for e in r5.json()["entries"]]
    assert unique + "_UPD" not in titles2


# ---------- admin leaves ----------
def test_admin_list_and_update_leaves(http, admin_token, student_token):
    # ensure one leave exists
    r = http.post(
        f"{API}/student/leaves",
        json={"start_date": "2026-03-01", "end_date": "2026-03-02", "reason": "TEST approve"},
        headers=auth(student_token),
    )
    leave_id = r.json()["leave"]["id"]

    r2 = http.get(f"{API}/admin/leaves", headers=auth(admin_token))
    assert r2.status_code == 200
    ids = [l["id"] for l in r2.json()["leaves"]]
    assert leave_id in ids

    r3 = http.put(f"{API}/admin/leaves/{leave_id}", json={"status": "Approved"}, headers=auth(admin_token))
    assert r3.status_code == 200
    assert r3.json()["status"] == "Approved"

    # verify via admin list
    r4 = http.get(f"{API}/admin/leaves", headers=auth(admin_token))
    row = next(l for l in r4.json()["leaves"] if l["id"] == leave_id)
    assert row["status"] == "Approved"


def test_admin_stats_shape(http, admin_token):
    r = http.get(f"{API}/admin/stats", headers=auth(admin_token))
    assert r.status_code == 200
    data = r.json()
    for key in ("students", "admins", "pending_leaves", "content_entries"):
        assert key in data
