import pytest
from datetime import date
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.notice import Notice, NoticeAudience
from app.models.academic import SchoolClass


def test_list_notices_admin_sees_all(client: TestClient, admin_headers: dict):
    """Verify administrator can retrieve all notices including pinned and unpinned."""
    response = client.get("/api/v1/notices", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 4
    assert len(data["items"]) >= 4

    # Verify pinned notices are at the beginning
    is_pinned_flags = [n["is_pinned"] for n in data["items"]]
    assert True in is_pinned_flags
    assert is_pinned_flags[0] is True  # Pinned first


def test_notice_audience_scoping(
    client: TestClient,
    parent_headers: dict,
    student_headers: dict,
    teacher_headers: dict,
):
    """Verify role-based audience filtering prevents unauthorized visibility."""
    # Parent should see ALL and PARENTS notices, but NOT TEACHERS notices
    p_res = client.get("/api/v1/notices", headers=parent_headers)
    assert p_res.status_code == 200
    p_data = p_res.json()
    p_audiences = [n["target_audience"] for n in p_data["items"]]
    assert "TEACHERS" not in p_audiences
    assert "PARENTS" in p_audiences or "ALL" in p_audiences

    # Teacher should see TEACHERS notices
    t_res = client.get("/api/v1/notices", headers=teacher_headers)
    assert t_res.status_code == 200
    t_data = t_res.json()
    t_audiences = [n["target_audience"] for n in t_data["items"]]
    assert "TEACHERS" in t_audiences

    # Student should see ALL notices and their enrolled class notices
    s_res = client.get("/api/v1/notices", headers=student_headers)
    assert s_res.status_code == 200
    s_data = s_res.json()
    s_audiences = [n["target_audience"] for n in s_data["items"]]
    assert "TEACHERS" not in s_audiences


def test_create_notice_and_pin_toggle(client: TestClient, admin_headers: dict, db: Session):
    """Verify admin can create, pin, and update announcements."""
    payload = {
        "title": "Winter Sports Day 2026 Announcement",
        "content": "Inter-house athletic trials will begin next Monday. Students can register with their physical education instructors.",
        "target_audience": "ALL",
        "is_pinned": False,
        "is_published": True,
    }

    create_res = client.post("/api/v1/notices", json=payload, headers=admin_headers)
    assert create_res.status_code == 201
    created_notice = create_res.json()
    notice_id = created_notice["id"]
    assert created_notice["title"] == payload["title"]
    assert created_notice["is_pinned"] is False

    # Toggle Pin
    pin_res = client.post(f"/api/v1/notices/{notice_id}/pin", headers=admin_headers)
    assert pin_res.status_code == 200
    assert pin_res.json()["is_pinned"] is True

    # Toggle Unpin
    unpin_res = client.post(f"/api/v1/notices/{notice_id}/pin", headers=admin_headers)
    assert unpin_res.status_code == 200
    assert unpin_res.json()["is_pinned"] is False

    # Clean up
    del_res = client.delete(f"/api/v1/notices/{notice_id}", headers=admin_headers)
    assert del_res.status_code == 204


def test_student_cannot_create_or_pin_notices(client: TestClient, student_headers: dict):
    """Verify RBAC: student cannot publish or pin announcements."""
    payload = {
        "title": "Unauthorized Student Post",
        "content": "This notice should be rejected by role authorization checks.",
        "target_audience": "ALL",
    }
    create_res = client.post("/api/v1/notices", json=payload, headers=student_headers)
    assert create_res.status_code == 403

    # Pin attempt
    pin_res = client.post("/api/v1/notices/00000000-0000-0000-0000-000000000000/pin", headers=student_headers)
    assert pin_res.status_code == 403
