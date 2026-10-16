import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.examination import Exam


def test_dashboard_stats_role_customization(
    client: TestClient,
    admin_headers: dict,
    accountant_headers: dict,
    teacher_headers: dict,
    parent_headers: dict,
    student_headers: dict,
):
    """Verify live database metrics are correctly structured for each role."""
    # 1. Admin Dashboard
    adm_res = client.get("/api/v1/dashboard/stats", headers=admin_headers)
    assert adm_res.status_code == 200
    adm_stats = adm_res.json()
    assert adm_stats["role"] == "ADMIN"
    assert adm_stats["total_students"] >= 1
    assert adm_stats["total_teachers"] >= 1
    assert adm_stats["total_classes"] >= 10
    assert float(adm_stats["total_fees_collected"]) > 0
    assert len(adm_stats["recent_notices"]) > 0
    assert len(adm_stats["recent_activities"]) > 0

    # 2. Accountant Dashboard
    acc_res = client.get("/api/v1/dashboard/stats", headers=accountant_headers)
    assert acc_res.status_code == 200
    acc_stats = acc_res.json()
    assert acc_stats["role"] == "ACCOUNTANT"
    assert acc_stats["total_invoiced"] > 0
    assert acc_stats["total_collected"] > 0
    assert len(acc_stats["recent_payments"]) > 0

    # 3. Teacher Dashboard
    tch_res = client.get("/api/v1/dashboard/stats", headers=teacher_headers)
    assert tch_res.status_code == 200
    tch_stats = tch_res.json()
    assert tch_stats["role"] == "TEACHER"
    assert tch_stats["assigned_classes_count"] >= 1

    # 4. Parent Dashboard
    prn_res = client.get("/api/v1/dashboard/stats", headers=parent_headers)
    assert prn_res.status_code == 200
    prn_stats = prn_res.json()
    assert prn_stats["role"] == "PARENT"
    assert prn_stats["children_count"] >= 2
    assert len(prn_stats["children"]) >= 2
    assert prn_stats["children"][0]["full_name"] in ["Alex Miller", "Emma Miller"]

    # 5. Student Dashboard
    std_res = client.get("/api/v1/dashboard/stats", headers=student_headers)
    assert std_res.status_code == 200
    std_stats = std_res.json()
    assert std_stats["role"] == "STUDENT"
    assert float(std_stats["attendance_percentage"]) > 0


def test_reports_json_and_csv_exports(
    client: TestClient,
    admin_headers: dict,
    db: Session,
):
    """Verify all four institutional reports generate valid JSON and RFC 4180 CSV exports."""
    # 1. Student Demographics Report
    # JSON
    std_json = client.get("/api/v1/reports/students", headers=admin_headers)
    assert std_json.status_code == 200
    assert std_json.json()["total_students"] >= 1
    assert len(std_json.json()["class_distribution"]) > 0

    # CSV
    std_csv = client.get("/api/v1/reports/students?export=csv", headers=admin_headers)
    assert std_csv.status_code == 200
    assert "text/csv" in std_csv.headers["content-type"]
    assert "Admission Number,Full Name,Class,Section" in std_csv.text
    assert "ADM-2026-0001" in std_csv.text

    # 2. Financial Summary Report
    # JSON
    fin_json = client.get("/api/v1/reports/finances", headers=admin_headers)
    assert fin_json.status_code == 200
    assert fin_json.json()["total_invoiced"] > 0
    assert len(fin_json.json()["defaulters"]) > 0

    # CSV
    fin_csv = client.get("/api/v1/reports/finances?export=csv", headers=admin_headers)
    assert fin_csv.status_code == 200
    assert "text/csv" in fin_csv.headers["content-type"]
    assert "Invoice Number,Student Name,Admission Number" in fin_csv.text
    assert "INV-2026-0001" in fin_csv.text

    # 3. Examination Performance Report
    exam = db.query(Exam).first()
    assert exam is not None
    # JSON
    ex_json = client.get(f"/api/v1/reports/examinations?exam_id={exam.id}", headers=admin_headers)
    assert ex_json.status_code == 200
    assert ex_json.json()["total_students_evaluated"] >= 1
    assert len(ex_json.json()["top_performers"]) > 0

    # CSV
    ex_csv = client.get(f"/api/v1/reports/examinations?exam_id={exam.id}&export=csv", headers=admin_headers)
    assert ex_csv.status_code == 200
    assert "text/csv" in ex_csv.headers["content-type"]
    assert "Rank,Student Name,Admission Number,Class,Section" in ex_csv.text
    assert "Alex Miller" in ex_csv.text

    # 4. Attendance Analytics Report
    # JSON
    att_json = client.get("/api/v1/reports/attendance", headers=admin_headers)
    assert att_json.status_code == 200
    assert len(att_json.json()["class_attendance_summary"]) > 0

    # CSV
    att_csv = client.get("/api/v1/reports/attendance?export=csv", headers=admin_headers)
    assert att_csv.status_code == 200
    assert "text/csv" in att_csv.headers["content-type"]
    assert "Student Name,Admission Number,Class,Section" in att_csv.text


def test_unauthorized_report_access(client: TestClient, student_headers: dict):
    """Verify students cannot view financial or staff reports."""
    fin_res = client.get("/api/v1/reports/finances", headers=student_headers)
    assert fin_res.status_code == 403

    std_res = client.get("/api/v1/reports/students", headers=student_headers)
    assert std_res.status_code == 403
