import pytest
from datetime import date
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.academic import SchoolClass, Section
from app.models.student import Student
from app.models.attendance import AttendanceStatus, AttendanceRegister, AttendanceRecord


def test_get_or_init_daily_register(client: TestClient, teacher_headers: dict, db: Session):
    """Verify daily register retrieves active students defaulting to PRESENT when unrecorded."""
    grade_10 = db.query(SchoolClass).filter(SchoolClass.name == "Grade 10").first()
    sec_a = db.query(Section).filter(Section.class_id == grade_10.id, Section.name == "Section A").first()

    test_date = "2026-11-01"
    response = client.get(
        f"/api/v1/attendance/register?class_id={grade_10.id}&section_id={sec_a.id}&attendance_date={test_date}",
        headers=teacher_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["class_name"] == "Grade 10"
    assert data["section_name"] == "Section A"
    assert data["attendance_date"] == test_date
    assert data["is_submitted"] is False
    assert len(data["records"]) > 0
    # Every student in initialized roster defaults to PRESENT
    for r in data["records"]:
        assert r["status"] == "PRESENT"


def test_mark_daily_attendance_and_duplicate_prevention(
    client: TestClient, teacher_headers: dict, db: Session
):
    """Verify daily attendance submission and that double-marking on the same date is blocked."""
    grade_10 = db.query(SchoolClass).filter(SchoolClass.name == "Grade 10").first()
    sec_a = db.query(Section).filter(Section.class_id == grade_10.id, Section.name == "Section A").first()
    student = db.query(Student).filter(Student.admission_number == "ADM-2026-0001").first()

    test_date = "2026-11-02"

    payload = {
        "class_id": str(grade_10.id),
        "section_id": str(sec_a.id),
        "attendance_date": test_date,
        "notes": "Testing morning attendance",
        "records": [
            {
                "student_id": str(student.id),
                "status": "PRESENT",
                "remarks": "On time",
            }
        ],
    }

    # 1. First submission should succeed
    response = client.post(
        "/api/v1/attendance/register",
        json=payload,
        headers=teacher_headers,
    )
    assert response.status_code == 201
    reg_data = response.json()
    assert reg_data["is_submitted"] is True
    assert reg_data["present_count"] == 1
    assert reg_data["absent_count"] == 0

    # 2. Duplicate submission for same class, section, date must fail
    dup_res = client.post(
        "/api/v1/attendance/register",
        json=payload,
        headers=teacher_headers,
    )
    assert dup_res.status_code == 400
    assert "already been recorded" in dup_res.json()["detail"]


def test_attendance_correction_with_audit_reason(
    client: TestClient, teacher_headers: dict, db: Session
):
    """Verify status adjustment records an audit log entry and updates register counts."""
    grade_10 = db.query(SchoolClass).filter(SchoolClass.name == "Grade 10").first()
    sec_a = db.query(Section).filter(Section.class_id == grade_10.id, Section.name == "Section A").first()
    student = db.query(Student).filter(Student.admission_number == "ADM-2026-0001").first()

    test_date = "2026-11-03"

    # Mark as ABSENT first
    create_payload = {
        "class_id": str(grade_10.id),
        "section_id": str(sec_a.id),
        "attendance_date": test_date,
        "notes": "Initial absent roll call",
        "records": [
            {
                "student_id": str(student.id),
                "status": "ABSENT",
                "remarks": "Not seated at bell",
            }
        ],
    }
    res = client.post("/api/v1/attendance/register", json=create_payload, headers=teacher_headers)
    assert res.status_code == 201
    record_id = res.json()["records"][0]["id"]

    # Now apply authorized correction to LATE
    correction_payload = {
        "new_status": "LATE",
        "reason": "Student reported to principal office at 8:40 AM with late bus pass",
    }
    correct_res = client.put(
        f"/api/v1/attendance/records/{record_id}/correct",
        json=correction_payload,
        headers=teacher_headers,
    )
    assert correct_res.status_code == 200
    corrected = correct_res.json()
    assert corrected["status"] == "LATE"
    assert len(corrected["corrections"]) == 1
    assert corrected["corrections"][0]["previous_status"] == "ABSENT"
    assert corrected["corrections"][0]["new_status"] == "LATE"
    assert "late bus pass" in corrected["corrections"][0]["reason"]

    # Verify parent register recount reflects the change
    reg_res = client.get(
        f"/api/v1/attendance/register?class_id={grade_10.id}&section_id={sec_a.id}&attendance_date={test_date}",
        headers=teacher_headers,
    )
    reg_json = reg_res.json()
    assert reg_json["late_count"] == 1
    assert reg_json["absent_count"] == 0


def test_monthly_attendance_matrix_and_stats(
    client: TestClient, teacher_headers: dict, db: Session
):
    """Verify monthly matrix day 1-31 grid and section statistics."""
    grade_10 = db.query(SchoolClass).filter(SchoolClass.name == "Grade 10").first()
    sec_a = db.query(Section).filter(Section.class_id == grade_10.id, Section.name == "Section A").first()

    # Query October 2026 (seeded with 8 dates)
    matrix_res = client.get(
        f"/api/v1/attendance/matrix?class_id={grade_10.id}&section_id={sec_a.id}&year=2026&month=10",
        headers=teacher_headers,
    )
    assert matrix_res.status_code == 200
    matrix = matrix_res.json()
    assert matrix["year"] == 2026
    assert matrix["month"] == 10
    assert matrix["days_in_month"] == 31
    assert len(matrix["students"]) > 0

    # Student should have P on day 1 and 2, L on day 6, A on day 8
    student_row = matrix["students"][0]
    assert student_row["daily_statuses"]["1"] == "P"
    assert student_row["daily_statuses"]["2"] == "P"
    assert student_row["daily_statuses"]["6"] == "L"
    assert student_row["daily_statuses"]["8"] == "A"

    # Query stats for October 2026
    stats_res = client.get(
        f"/api/v1/attendance/monthly-stats?class_id={grade_10.id}&section_id={sec_a.id}&year=2026&month=10",
        headers=teacher_headers,
    )
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total_working_days"] >= 8
    assert float(stats["average_attendance_percentage"]) > 0


def test_student_attendance_history_scoping(
    client: TestClient, student_headers: dict, teacher_headers: dict, db: Session
):
    """Verify student attendance history endpoint and role scoping."""
    student = db.query(Student).filter(Student.admission_number == "ADM-2026-0001").first()

    # 1. Teacher can query student's attendance history
    res = client.get(
        f"/api/v1/attendance/students/{student.id}",
        headers=teacher_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["admission_number"] == "ADM-2026-0001"
    assert data["total_days"] >= 8
    assert len(data["records"]) >= 8

    # 2. Student can query their own attendance history
    std_res = client.get(
        f"/api/v1/attendance/students/{student.id}",
        headers=student_headers,
    )
    assert std_res.status_code == 200
