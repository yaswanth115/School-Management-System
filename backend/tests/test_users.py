import uuid
from app.core.config import settings
from app.models.role import RoleEnum


def test_list_users_as_admin(client, admin_headers):
    response = client.get(f"{settings.API_V1_STR}/users", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 6


def test_create_user_success(client, admin_headers):
    unique_email = f"test.teacher.{uuid.uuid4().hex[:6]}@school.com"
    payload = {
        "email": unique_email,
        "password": "TeacherPassword@123",
        "full_name": "Test Teacher User",
        "phone": "+91 9999988888",
        "role": RoleEnum.TEACHER.value,
        "is_active": True,
    }
    response = client.post(
        f"{settings.API_V1_STR}/users",
        json=payload,
        headers=admin_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == unique_email
    assert data["role"] == "TEACHER"
    assert data["full_name"] == "Test Teacher User"


def test_create_user_duplicate_email(client, admin_headers):
    payload = {
        "email": "admin@school.com",
        "password": "Password@123",
        "full_name": "Duplicate Admin",
        "role": RoleEnum.ADMIN.value,
        "is_active": True,
    }
    response = client.post(
        f"{settings.API_V1_STR}/users",
        json=payload,
        headers=admin_headers,
    )
    assert response.status_code == 409


def test_toggle_user_status(client, admin_headers):
    # Create temporary user to toggle
    unique_email = f"toggle.{uuid.uuid4().hex[:6]}@school.com"
    create_resp = client.post(
        f"{settings.API_V1_STR}/users",
        json={
            "email": unique_email,
            "password": "Password@12345",
            "full_name": "Toggle User",
            "role": RoleEnum.STUDENT.value,
            "is_active": True,
        },
        headers=admin_headers,
    )
    user_id = create_resp.json()["id"]

    # Deactivate
    deact_resp = client.patch(
        f"{settings.API_V1_STR}/users/{user_id}/status?is_active=false",
        headers=admin_headers,
    )
    assert deact_resp.status_code == 200
    assert deact_resp.json()["is_active"] is False

    # Reactivate
    react_resp = client.patch(
        f"{settings.API_V1_STR}/users/{user_id}/status?is_active=true",
        headers=admin_headers,
    )
    assert react_resp.status_code == 200
    assert react_resp.json()["is_active"] is True
