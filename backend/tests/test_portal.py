import pytest
from datetime import date
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.student import Student, Guardian, StudentGuardian
from app.models.fee import Invoice, InvoiceStatus
from app.models.examination import Exam


def test_parent_portal_children_list_and_switcher(
    client: TestClient, parent_headers: dict, db: Session
):
    """Verify parent portal returns all linked children with live metrics."""
    response = client.get("/api/v1/parent/children", headers=parent_headers)
    assert response.status_code == 200
    children = response.json()
    assert len(children) >= 2  # Alex Miller and Emma Miller

    names = [c["full_name"] for c in children]
    assert "Alex Miller" in names
    assert "Emma Miller" in names

    alex = next(c for c in children if c["full_name"] == "Alex Miller")
    assert alex["class_name"] == "Grade 10"
    assert alex["section_name"] == "Section A"
    assert float(alex["attendance_percentage"]) > 0


def test_parent_child_idor_protection(
    client: TestClient, parent_headers: dict, db: Session
):
    """Verify parent cannot access an unrelated student's details (IDOR prevention)."""
    # Create an independent unlinked student
    unlinked_student = Student(
        admission_number="ADM-TEST-9999",
        first_name="Unlinked",
        last_name="Child",
        date_of_birth=date(2012, 1, 1),
        gender="Female",
        admission_date=date(2026, 6, 1),
    )
    db.add(unlinked_student)
    db.commit()

    # Attempt to query unlinked student profile as parent
    response = client.get(
        f"/api/v1/parent/children/{unlinked_student.id}/profile",
        headers=parent_headers,
    )
    assert response.status_code == 403
    assert "not linked to your guardian account" in response.json()["detail"]

    # Attempt to query attendance
    att_res = client.get(
        f"/api/v1/parent/children/{unlinked_student.id}/attendance",
        headers=parent_headers,
    )
    assert att_res.status_code == 403


def test_parent_online_fee_payment_simulation(
    client: TestClient, parent_headers: dict, db: Session
):
    """Verify parent can simulate online fee payment and receive an official receipt."""
    student = db.query(Student).filter(Student.admission_number == "ADM-2026-0001").first()

    # Get child invoices
    inv_res = client.get(
        f"/api/v1/parent/children/{student.id}/invoices",
        headers=parent_headers,
    )
    assert inv_res.status_code == 200
    invoices_data = inv_res.json()
    assert len(invoices_data["invoices"]) > 0

    target_invoice = next(
        (i for i in invoices_data["invoices"] if i["balance_amount"] > 0),
        invoices_data["invoices"][0],
    )

    pay_amount = 5000.00
    pay_payload = {
        "invoice_id": target_invoice["id"],
        "amount": pay_amount,
        "payment_method": "ONLINE_GATEWAY",
        "gateway_provider": "Simulated Razorpay UPI",
        "transaction_reference": "TXN-UPI-TEST-12345",
    }

    pay_res = client.post(
        f"/api/v1/parent/children/{student.id}/invoices/{target_invoice['id']}/pay",
        json=pay_payload,
        headers=parent_headers,
    )
    assert pay_res.status_code == 200
    pay_data = pay_res.json()
    assert "REC-" in pay_data["receipt_number"]
    assert float(pay_data["amount_paid"]) == pay_amount
    assert float(pay_data["remaining_balance"]) == float(target_invoice["balance_amount"]) - pay_amount


def test_parent_child_report_card_and_timetable(
    client: TestClient, parent_headers: dict, db: Session
):
    """Verify parent can access linked child's terminal report card and weekly timetable."""
    student = db.query(Student).filter(Student.admission_number == "ADM-2026-0001").first()
    exam = db.query(Exam).filter(Exam.name.ilike("%Midterm%")).first()

    # 1. Report card
    if exam:
        rc_res = client.get(
            f"/api/v1/parent/children/{student.id}/report-cards/{exam.id}",
            headers=parent_headers,
        )
        assert rc_res.status_code == 200
        rc = rc_res.json()
        assert rc["student_name"] == "Alex Miller"
        assert len(rc["subjects"]) > 0
        assert rc["class_rank"] is not None

    # 2. Timetable
    tt_res = client.get(
        f"/api/v1/parent/children/{student.id}/timetable",
        headers=parent_headers,
    )
    assert tt_res.status_code == 200
    tt = tt_res.json()
    assert tt["class_name"] == "Grade 10"
    assert len(tt["periods"]) >= 5


def test_student_portal_profile_and_features(
    client: TestClient, student_headers: dict, db: Session
):
    """Verify student portal returns authenticated student's profile, timetable, and attendance."""
    # 1. Profile
    prof_res = client.get("/api/v1/student/profile", headers=student_headers)
    assert prof_res.status_code == 200
    prof = prof_res.json()
    assert prof["admission_number"] == "ADM-2026-0001"
    assert prof["full_name"] == "Alex Miller"
    assert prof["class_name"] == "Grade 10"
    assert len(prof["guardians"]) > 0

    # 2. Timetable
    tt_res = client.get("/api/v1/student/timetable", headers=student_headers)
    assert tt_res.status_code == 200
    tt = tt_res.json()
    assert tt["class_name"] == "Grade 10"
    assert len(tt["periods"]) >= 5

    # 3. Attendance
    att_res = client.get("/api/v1/student/attendance", headers=student_headers)
    assert att_res.status_code == 200
    att = att_res.json()
    assert att["total_days"] >= 8
    assert float(att["attendance_percentage"]) > 0

    # 4. Invoices
    inv_res = client.get("/api/v1/student/invoices", headers=student_headers)
    assert inv_res.status_code == 200
