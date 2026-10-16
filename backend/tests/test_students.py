import uuid
from app.core.config import settings
from app.models.student import StudentStatus


def test_list_students(client, admin_headers):
    response = client.get(f"{settings.API_V1_STR}/students", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert data["total"] >= 1
    assert any(s["admission_number"] == "ADM-2026-0001" for s in data["items"])


def test_atomic_student_admission(client, admin_headers):
    # Fetch academic year, class, and section
    years_resp = client.get(f"{settings.API_V1_STR}/academics/years", headers=admin_headers)
    active_year = next(y for y in years_resp.json() if y["is_current"])

    classes_resp = client.get(f"{settings.API_V1_STR}/academics/classes", headers=admin_headers)
    grade_1 = next(c for c in classes_resp.json() if c["name"] == "Grade 1")
    sec_a = grade_1["sections"][0]

    unique_suffix = uuid.uuid4().hex[:4]
    custom_adm = f"ADM-TEST-{unique_suffix}"

    payload = {
        "first_name": "Oliver",
        "last_name": f"Smith-{unique_suffix}",
        "date_of_birth": "2018-03-21",
        "gender": "Male",
        "blood_group": "A+",
        "admission_date": "2026-06-01",
        "city": "Springfield",
        "admission_number": custom_adm,
        "academic_year_id": active_year["id"],
        "class_id": grade_1["id"],
        "section_id": sec_a["id"],
        "roll_number": "101",
        "primary_guardian": {
            "full_name": f"Arthur Smith-{unique_suffix}",
            "relationship_type": "Father",
            "phone": "+91 9123456789",
            "email": f"arthur.{unique_suffix}@example.com",
            "occupation": "Architect",
        },
    }

    response = client.post(
        f"{settings.API_V1_STR}/students/admission",
        json=payload,
        headers=admin_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["admission_number"] == custom_adm
    assert data["full_name"] == f"Oliver Smith-{unique_suffix}"
    assert len(data["guardians"]) == 1
    assert data["guardians"][0]["full_name"] == f"Arthur Smith-{unique_suffix}"
    assert len(data["enrollment_history"]) == 1
    assert data["enrollment_history"][0]["class_name"] == "Grade 1"


def test_duplicate_admission_number_rejected(client, admin_headers):
    years_resp = client.get(f"{settings.API_V1_STR}/academics/years", headers=admin_headers)
    classes_resp = client.get(f"{settings.API_V1_STR}/academics/classes", headers=admin_headers)
    active_year = years_resp.json()[0]
    grade_1 = classes_resp.json()[0]
    sec_a = grade_1["sections"][0]

    payload = {
        "first_name": "Duplicate",
        "last_name": "Student",
        "date_of_birth": "2018-01-01",
        "gender": "Female",
        "admission_number": "ADM-2026-0001",  # Already exists!
        "academic_year_id": active_year["id"],
        "class_id": grade_1["id"],
        "section_id": sec_a["id"],
        "primary_guardian": {
            "full_name": "Jane Parent",
            "relationship_type": "Mother",
            "phone": "+91 9988776655",
        },
    }
    response = client.post(
        f"{settings.API_V1_STR}/students/admission",
        json=payload,
        headers=admin_headers,
    )
    assert response.status_code == 409


def test_student_promotion_preserves_history(client, admin_headers):
    # Fetch sample student
    list_resp = client.get(f"{settings.API_V1_STR}/students?search=Alex", headers=admin_headers)
    alex = next(s for s in list_resp.json()["items"] if s["admission_number"] == "ADM-2026-0001")

    # Fetch classes
    classes_resp = client.get(f"{settings.API_V1_STR}/academics/classes", headers=admin_headers)
    grade_10 = next(c for c in classes_resp.json() if c["name"] == "Grade 10")
    sec_b = next(s for s in grade_10["sections"] if s["name"] == "Section B")

    years_resp = client.get(f"{settings.API_V1_STR}/academics/years", headers=admin_headers)
    active_year = next(y for y in years_resp.json() if y["is_current"])

    # Create next year for promotion test
    next_year_name = f"2027-2028-promo-{uuid.uuid4().hex[:4]}"
    ny_resp = client.post(
        f"{settings.API_V1_STR}/academics/years",
        json={"name": next_year_name, "start_date": "2027-06-01", "end_date": "2028-05-31", "is_current": False},
        headers=admin_headers,
    )
    next_year_id = ny_resp.json()["id"]

    promo_payload = {
        "target_academic_year_id": next_year_id,
        "target_class_id": grade_10["id"],
        "target_section_id": sec_b["id"],
        "roll_number": "202",
        "remarks": "Promoted to Senior Batch",
    }
    promo_resp = client.post(
        f"{settings.API_V1_STR}/students/{alex['id']}/promote",
        json=promo_payload,
        headers=admin_headers,
    )
    assert promo_resp.status_code == 200

    # Verify student now has 2 enrollment history records
    detail_resp = client.get(f"{settings.API_V1_STR}/students/{alex['id']}", headers=admin_headers)
    assert detail_resp.status_code == 200
    enrollments = detail_resp.json()["enrollment_history"]
    assert len(enrollments) >= 2


def test_bulk_student_import(client, admin_headers):
    years_resp = client.get(f"{settings.API_V1_STR}/academics/years", headers=admin_headers)
    classes_resp = client.get(f"{settings.API_V1_STR}/academics/classes", headers=admin_headers)
    year_id = years_resp.json()[0]["id"]
    class_id = classes_resp.json()[0]["id"]
    section_id = classes_resp.json()[0]["sections"][0]["id"]

    suffix = uuid.uuid4().hex[:4]
    bulk_payload = {
        "academic_year_id": year_id,
        "class_id": class_id,
        "section_id": section_id,
        "students": [
            {
                "first_name": "BulkStudent1",
                "last_name": f"Test-{suffix}",
                "date_of_birth": "2017-04-10",
                "gender": "Female",
                "guardian_name": "Guardian One",
                "guardian_phone": "+91 9888877771",
            },
            {
                "first_name": "BulkStudent2",
                "last_name": f"Test-{suffix}",
                "date_of_birth": "2017-08-15",
                "gender": "Male",
                "guardian_name": "Guardian Two",
                "guardian_phone": "+91 9888877772",
            },
        ],
    }

    response = client.post(
        f"{settings.API_V1_STR}/students/bulk-import",
        json=bulk_payload,
        headers=admin_headers,
    )
    assert response.status_code == 200
    assert response.json()["successfully_imported"] == 2
