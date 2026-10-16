from app.core.config import settings
from app.models.role import RoleEnum


def test_student_cannot_list_users(client, student_headers):
    response = client.get(f"{settings.API_V1_STR}/users", headers=student_headers)
    assert response.status_code == 403


def test_teacher_cannot_create_users(client, teacher_headers):
    payload = {
        "email": "unauthorized.teacher.create@school.com",
        "password": "Password@123",
        "full_name": "Unauthorized Attempt",
        "role": RoleEnum.STUDENT.value,
    }
    response = client.post(
        f"{settings.API_V1_STR}/users",
        json=payload,
        headers=teacher_headers,
    )
    assert response.status_code == 403


def test_student_cannot_view_audit_logs(client, student_headers):
    response = client.get(f"{settings.API_V1_STR}/audit", headers=student_headers)
    assert response.status_code == 403


def test_admin_can_view_audit_logs(client, admin_headers):
    response = client.get(f"{settings.API_V1_STR}/audit", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
