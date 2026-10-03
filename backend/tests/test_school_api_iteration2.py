import os
import requests

BASE_URL = os.environ.get("EXPO_BACKEND_URL", "https://student-portal-1712.preview.emergentagent.com").rstrip("/")


def test_health_and_dashboard():
    health = requests.get(f"{BASE_URL}/api/health", timeout=15)
    assert health.status_code == 200 and health.json()["status"] == "ok"
    dashboard = requests.get(f"{BASE_URL}/api/student/dashboard", timeout=15)
    body = dashboard.json()
    assert dashboard.status_code == 200
    assert body["student"]["name"] == "Aarav Sharma"
    assert len(body["modules"]) == 30
    assert body["attendance"]["percentage"] == 94.2


def test_leave_create_persists():
    payload = {"start_date": "05 Feb", "end_date": "06 Feb", "reason": "TEST_iteration2"}
    response = requests.post(f"{BASE_URL}/api/student/leaves", json=payload, timeout=15)
    assert response.status_code == 200
    leaves = response.json()["leaves"]
    assert any(item["reason"] == payload["reason"] and item["status"] == "Pending" for item in leaves)