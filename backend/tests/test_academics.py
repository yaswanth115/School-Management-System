import uuid
from datetime import date
from app.core.config import settings


def test_list_academic_years(client, admin_headers):
    response = client.get(f"{settings.API_V1_STR}/academics/years", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert any(y["is_current"] for y in data)


def test_create_academic_year(client, admin_headers):
    unique_name = f"2027-2028-{uuid.uuid4().hex[:4]}"
    payload = {
        "name": unique_name,
        "start_date": "2027-06-01",
        "end_date": "2028-05-31",
        "is_current": False,
    }
    response = client.post(
        f"{settings.API_V1_STR}/academics/years",
        json=payload,
        headers=admin_headers,
    )
    assert response.status_code == 201
    assert response.json()["name"] == unique_name


def test_list_classes_and_sections(client, admin_headers):
    response = client.get(f"{settings.API_V1_STR}/academics/classes", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 10
    grade_10 = next(c for c in data if c["name"] == "Grade 10")
    assert len(grade_10["sections"]) >= 2


def test_create_class_and_section(client, admin_headers):
    unique_class = f"Grade 11-{uuid.uuid4().hex[:4]}"
    payload = {
        "name": unique_class,
        "numeric_order": 11,
        "initial_sections": ["Section Alpha", "Section Beta"],
    }
    response = client.post(
        f"{settings.API_V1_STR}/academics/classes",
        json=payload,
        headers=admin_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == unique_class
    assert len(data["sections"]) == 2

    # Add another section to this class
    class_id = data["id"]
    sec_resp = client.post(
        f"{settings.API_V1_STR}/academics/classes/{class_id}/sections",
        json={"name": "Section Gamma", "capacity": 35},
        headers=admin_headers,
    )
    assert sec_resp.status_code == 201
    assert sec_resp.json()["name"] == "Section Gamma"


def test_list_and_create_subjects(client, admin_headers):
    response = client.get(f"{settings.API_V1_STR}/academics/subjects", headers=admin_headers)
    assert response.status_code == 200
    assert len(response.json()) >= 5

    unique_code = f"BIO-{uuid.uuid4().hex[:4].upper()}"
    create_resp = client.post(
        f"{settings.API_V1_STR}/academics/subjects",
        json={
            "name": "Biology Laboratory",
            "code": unique_code,
            "subject_type": "Practical",
        },
        headers=admin_headers,
    )
    assert create_resp.status_code == 201
    assert create_resp.json()["code"] == unique_code


def test_teacher_assignments_query(client, admin_headers):
    response = client.get(f"{settings.API_V1_STR}/academics/assignments", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert any(a["subject_name"] == "Mathematics" for a in data)
