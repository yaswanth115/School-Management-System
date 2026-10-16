import uuid
from decimal import Decimal
from app.core.config import settings


def test_list_and_create_exam(client, principal_headers):
    # List exams
    resp = client.get(f"{settings.API_V1_STR}/exams", headers=principal_headers)
    assert resp.status_code == 200
    exams = resp.json()
    assert len(exams) >= 1
    assert any("Term 1 Midterm" in e["name"] for e in exams)

    # Create a new unit test exam
    curr_year_id = exams[0]["academic_year_id"]
    suffix = uuid.uuid4().hex[:4]
    new_exam_payload = {
        "academic_year_id": curr_year_id,
        "name": f"Unit Test 1 - 2026 ({suffix})",
        "exam_type": "UNIT_TEST",
        "start_date": "2026-07-10",
        "end_date": "2026-07-15",
        "description": "First monthly unit assessment",
    }
    create_resp = client.post(
        f"{settings.API_V1_STR}/exams",
        headers=principal_headers,
        json=new_exam_payload,
    )
    assert create_resp.status_code == 201
    created = create_resp.json()
    assert created["name"] == new_exam_payload["name"]
    assert created["exam_type"] == "UNIT_TEST"


def test_exam_schedules_and_marks_roster(client, principal_headers, teacher_headers):
    # Fetch midterm exam
    exams_resp = client.get(f"{settings.API_V1_STR}/exams", headers=principal_headers)
    midterm = next(e for e in exams_resp.json() if "Midterm" in e["name"])

    # List schedules
    scheds_resp = client.get(f"{settings.API_V1_STR}/exams/{midterm['id']}/schedules", headers=principal_headers)
    assert scheds_resp.status_code == 200
    schedules = scheds_resp.json()
    assert len(schedules) >= 5

    math_sched = next(s for s in schedules if s["subject_code"] == "MATH-10")
    assert float(math_sched["max_marks"]) == 100.00
    assert float(math_sched["pass_marks"]) == 35.00

    # Fetch Grade 10 Section A
    classes_resp = client.get(f"{settings.API_V1_STR}/academics/classes", headers=principal_headers)
    grade_10 = next(c for c in classes_resp.json() if c["name"] == "Grade 10")
    sec_a = next(s for s in grade_10["sections"] if s["name"] == "Section A")

    # Teacher gets marks roster
    roster_resp = client.get(
        f"{settings.API_V1_STR}/exams/schedules/{math_sched['id']}/sections/{sec_a['id']}/marks",
        headers=teacher_headers,
    )
    assert roster_resp.status_code == 200
    roster = roster_resp.json()
    assert roster["subject_name"] == "Mathematics"
    assert roster["section_name"] == "Section A"
    assert len(roster["marks"]) >= 1
    alex_mark = next(m for m in roster["marks"] if m["admission_number"] == "ADM-2026-0001")
    assert float(alex_mark["marks_obtained"]) == 92.00
    assert alex_mark["grade"] == "A1"


def test_teacher_score_validation(client, teacher_headers, principal_headers):
    # Fetch exam and math schedule
    exams_resp = client.get(f"{settings.API_V1_STR}/exams", headers=principal_headers)
    midterm = next(e for e in exams_resp.json() if "Midterm" in e["name"])
    scheds = client.get(f"{settings.API_V1_STR}/exams/{midterm['id']}/schedules", headers=principal_headers).json()
    cs_sched = next(s for s in scheds if s["subject_code"] == "CS-10")

    # Fetch student
    students_resp = client.get(f"{settings.API_V1_STR}/students", headers=principal_headers)
    alex = next(s for s in students_resp.json()["items"] if s["admission_number"] == "ADM-2026-0001")

    classes_resp = client.get(f"{settings.API_V1_STR}/academics/classes", headers=principal_headers)
    grade_10 = next(c for c in classes_resp.json() if c["name"] == "Grade 10")
    sec_b = next(s for s in grade_10["sections"] if s["name"] == "Section B")

    # Test 1: Score exceeding max marks (e.g. 150 > 100)
    over_resp = client.post(
        f"{settings.API_V1_STR}/exams/schedules/{cs_sched['id']}/sections/{sec_b['id']}/marks",
        headers=principal_headers,  # admin override for test
        json={
            "marks": [{"student_id": alex["id"], "marks_obtained": 150.00, "is_absent": False}],
            "is_submit": False,
        },
    )
    assert over_resp.status_code == 400
    assert "exceeds max marks" in over_resp.json()["detail"]

    # Test 2: Negative score
    neg_resp = client.post(
        f"{settings.API_V1_STR}/exams/schedules/{cs_sched['id']}/sections/{sec_b['id']}/marks",
        headers=principal_headers,
        json={
            "marks": [{"student_id": alex["id"], "marks_obtained": -5.00, "is_absent": False}],
            "is_submit": False,
        },
    )
    assert neg_resp.status_code == 400
    assert "negative" in neg_resp.json()["detail"]


def test_principal_review_workflow(client, teacher_headers, principal_headers):
    # Fetch exam and schedule for English
    exams_resp = client.get(f"{settings.API_V1_STR}/exams", headers=principal_headers)
    midterm = next(e for e in exams_resp.json() if "Midterm" in e["name"])
    scheds = client.get(f"{settings.API_V1_STR}/exams/{midterm['id']}/schedules", headers=principal_headers).json()
    eng_sched = next(s for s in scheds if s["subject_code"] == "ENG-10")

    classes_resp = client.get(f"{settings.API_V1_STR}/academics/classes", headers=principal_headers)
    grade_10 = next(c for c in classes_resp.json() if c["name"] == "Grade 10")
    sec_b = next(s for s in grade_10["sections"] if s["name"] == "Section B")

    # Fetch students in Section B or dummy student
    students_resp = client.get(f"{settings.API_V1_STR}/students", headers=principal_headers)
    student = students_resp.json()["items"][0]

    # 1. Admin/Teacher enters and submits marks for review
    submit_resp = client.post(
        f"{settings.API_V1_STR}/exams/schedules/{eng_sched['id']}/sections/{sec_b['id']}/marks",
        headers=principal_headers,
        json={
            "marks": [{"student_id": student["id"], "marks_obtained": 85.00, "is_absent": False}],
            "is_submit": True,
        },
    )
    assert submit_resp.status_code == 200
    batch = submit_resp.json()
    assert batch["status"] == "SUBMITTED"

    # 2. Check in pending submissions
    pending_resp = client.get(f"{settings.API_V1_STR}/exams/submissions/pending", headers=principal_headers)
    assert pending_resp.status_code == 200
    pending_list = pending_resp.json()
    assert any(b["id"] == batch["id"] for b in pending_list)

    # 3. Principal approves the submission
    review_resp = client.post(
        f"{settings.API_V1_STR}/exams/submissions/{batch['id']}/review",
        headers=principal_headers,
        json={
            "status": "APPROVED",
            "review_comments": "Verified and approved.",
        },
    )
    assert review_resp.status_code == 200
    approved_batch = review_resp.json()
    assert approved_batch["status"] == "APPROVED"


def test_student_report_card(client, principal_headers, student_headers):
    # Fetch midterm exam
    exams_resp = client.get(f"{settings.API_V1_STR}/exams", headers=principal_headers)
    midterm = next(e for e in exams_resp.json() if "Midterm" in e["name"])

    # Fetch Alex Miller
    students_resp = client.get(f"{settings.API_V1_STR}/students", headers=principal_headers)
    alex = next(s for s in students_resp.json()["items"] if s["admission_number"] == "ADM-2026-0001")

    # Generate Report Card
    rc_resp = client.get(
        f"{settings.API_V1_STR}/exams/{midterm['id']}/report-cards/students/{alex['id']}",
        headers=principal_headers,
    )
    assert rc_resp.status_code == 200
    rc = rc_resp.json()

    assert rc["student_name"] == "Alex Miller"
    assert rc["admission_number"] == "ADM-2026-0001"
    assert rc["class_name"] == "Grade 10"
    assert len(rc["subjects"]) == 5
    assert float(rc["total_max_marks"]) == 500.00
    assert float(rc["total_marks_obtained"]) >= 400.00
    assert float(rc["overall_percentage"]) >= 80.00
    assert rc["result_status"] == "PASS"
    assert rc["class_rank"] >= 1

    # Student can access their own report card
    student_rc_resp = client.get(
        f"{settings.API_V1_STR}/exams/{midterm['id']}/report-cards/students/{alex['id']}",
        headers=student_headers,
    )
    assert student_rc_resp.status_code == 200
