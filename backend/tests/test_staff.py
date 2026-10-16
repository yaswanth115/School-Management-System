from app.core.config import settings


def test_list_staff_directory(client, admin_headers):
    response = client.get(f"{settings.API_V1_STR}/staff", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    sarah = next((s for s in data if s["email"] == "teacher@school.com"), None)
    assert sarah is not None
    assert sarah["employee_id"] == "TCH-001"
    assert sarah["assigned_subjects_count"] >= 1


def test_save_staff_profile(client, admin_headers):
    # Fetch accountant user
    users_resp = client.get(f"{settings.API_V1_STR}/users?role=ACCOUNTANT", headers=admin_headers)
    accountant = users_resp.json()["items"][0]

    payload = {
        "user_id": accountant["id"],
        "employee_id": "ACC-001",
        "designation": "Chief Financial Officer",
        "department": "Finance",
        "qualification": "Chartered Accountant (CA), M.Com",
        "emergency_contact": "+91 9876500000",
    }
    response = client.post(
        f"{settings.API_V1_STR}/staff/profile",
        json=payload,
        headers=admin_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["employee_id"] == "ACC-001"
    assert data["department"] == "Finance"
