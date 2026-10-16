import sys
import os
from datetime import date, time, datetime, timezone

# Add parent directory to path so script can run directly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.core.database import SessionLocal, Base, engine
from app.models.role import RoleEnum
from app.models.user import User
from app.core.security import hash_password
from app.services.audit_service import AuditService
from decimal import Decimal
from app.models.academic_year import AcademicYear
from app.models.academic import SchoolClass, Section, Subject, ClassSubject, TeacherAssignment
from app.models.student import Student, Guardian, StudentGuardian, EnrollmentHistory, StudentStatus, EnrollmentStatus
from app.models.staff import StaffProfile
from app.models.fee import (
    FeeType,
    FeeStructure,
    FeeStructureItem,
    Invoice,
    InvoiceItem,
    Payment,
    PaymentRefund,
    InvoiceStatus,
    PaymentMethod,
    PaymentStatus,
)
from app.models.examination import (
    Exam,
    ExamSchedule,
    GradingScale,
    GradeRule,
    ExamSubmissionBatch,
    StudentMark,
    ExamType,
    MarksSubmissionStatus,
)
from app.models.attendance import (
    AttendanceStatus,
    AttendanceRegister,
    AttendanceRecord,
    AttendanceCorrectionLog,
)
from app.models.timetable import DayOfWeek, ClassTimetable
from app.models.notice import Notice, NoticeAudience

DEFAULT_USERS = [
    {
        "email": "admin@school.com",
        "password": "Admin@12345",
        "full_name": "System Administrator",
        "phone": "+91 9876543210",
        "role": RoleEnum.ADMIN,
    },
    {
        "email": "principal@school.com",
        "password": "Principal@12345",
        "full_name": "Dr. Eleanor Vance",
        "phone": "+91 9876543211",
        "role": RoleEnum.PRINCIPAL,
    },
    {
        "email": "accountant@school.com",
        "password": "Accountant@12345",
        "full_name": "Marcus Sterling",
        "phone": "+91 9876543212",
        "role": RoleEnum.ACCOUNTANT,
    },
    {
        "email": "teacher@school.com",
        "password": "Teacher@12345",
        "full_name": "Sarah Jenkins",
        "phone": "+91 9876543213",
        "role": RoleEnum.TEACHER,
    },
    {
        "email": "parent@school.com",
        "password": "Parent@12345",
        "full_name": "Robert Miller",
        "phone": "+91 9876543214",
        "role": RoleEnum.PARENT,
    },
    {
        "email": "student@school.com",
        "password": "Student@12345",
        "full_name": "Alex Miller",
        "phone": "+91 9876543215",
        "role": RoleEnum.STUDENT,
    },
]

DEFAULT_SUBJECTS = [
    {"name": "Mathematics", "code": "MATH-10", "type": "Core"},
    {"name": "English Language", "code": "ENG-10", "type": "Core"},
    {"name": "Science", "code": "SCI-10", "type": "Core"},
    {"name": "Social Studies", "code": "SOC-10", "type": "Core"},
    {"name": "Computer Science", "code": "CS-10", "type": "Elective"},
]


def seed_database():
    """Seed initial database tables, roles, academic structures, and sample student."""
    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print("\n--- 1. Seeding User Accounts ---")
        user_map = {}
        for user_data in DEFAULT_USERS:
            existing = db.query(User).filter(User.email == user_data["email"]).first()
            if not existing:
                user = User(
                    email=user_data["email"],
                    hashed_password=hash_password(user_data["password"]),
                    full_name=user_data["full_name"],
                    phone=user_data["phone"],
                    role=user_data["role"],
                    is_active=True,
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                user_map[user.email] = user
                print(f" [CREATED] {user.role.value}: {user.email}")
            else:
                user_map[existing.email] = existing
                print(f" [EXISTS]  {existing.role.value}: {existing.email}")

        print("\n--- 2. Seeding Academic Year ---")
        curr_year = db.query(AcademicYear).filter(AcademicYear.name == "2026-2027").first()
        if not curr_year:
            curr_year = AcademicYear(
                name="2026-2027",
                start_date=date(2026, 6, 1),
                end_date=date(2027, 5, 31),
                is_current=True,
            )
            db.add(curr_year)
            db.commit()
            db.refresh(curr_year)
            print(f" [CREATED] Academic Year: {curr_year.name} (Current: True)")
        else:
            print(f" [EXISTS]  Academic Year: {curr_year.name}")

        print("\n--- 3. Seeding Classes & Sections ---")
        class_map = {}
        section_map = {}
        for grade_num in range(1, 11):
            class_name = f"Grade {grade_num}"
            cls = db.query(SchoolClass).filter(SchoolClass.name == class_name).first()
            if not cls:
                cls = SchoolClass(name=class_name, numeric_order=grade_num)
                db.add(cls)
                db.flush()

                # Create Section A and Section B
                for sec_letter in ["A", "B"]:
                    sec = Section(class_id=cls.id, name=f"Section {sec_letter}", room_number=f"Room {grade_num}0{sec_letter}")
                    db.add(sec)
                db.commit()
                db.refresh(cls)
                print(f" [CREATED] {cls.name} with Sections A & B")
            class_map[cls.name] = cls

            # Cache Grade 10 sections
            if grade_num == 10:
                for s in cls.sections:
                    section_map[s.name] = s

        print("\n--- 4. Seeding Subjects & Grade 10 Assignments ---")
        subject_map = {}
        grade_10 = class_map.get("Grade 10")
        for sub_data in DEFAULT_SUBJECTS:
            sub = db.query(Subject).filter(Subject.code == sub_data["code"]).first()
            if not sub:
                sub = Subject(name=sub_data["name"], code=sub_data["code"], subject_type=sub_data["type"])
                db.add(sub)
                db.flush()
                print(f" [CREATED] Subject: {sub.name} ({sub.code})")
            subject_map[sub.code] = sub

            # Link to Grade 10
            if grade_10:
                link_exists = db.query(ClassSubject).filter(ClassSubject.class_id == grade_10.id, ClassSubject.subject_id == sub.id).first()
                if not link_exists:
                    db.add(ClassSubject(class_id=grade_10.id, subject_id=sub.id))
        db.commit()

        print("\n--- 5. Seeding Staff Profiles & Teacher Assignment ---")
        teacher_user = user_map.get("teacher@school.com")
        if teacher_user:
            staff_prof = db.query(StaffProfile).filter(StaffProfile.user_id == teacher_user.id).first()
            if not staff_prof:
                staff_prof = StaffProfile(
                    user_id=teacher_user.id,
                    employee_id="TCH-001",
                    designation="Senior Mathematics Teacher",
                    department="Mathematics",
                    qualification="M.Sc. Mathematics, B.Ed",
                    joining_date=date(2023, 6, 1),
                )
                db.add(staff_prof)
                db.commit()
                print(f" [CREATED] Staff Profile: {staff_prof.employee_id} ({staff_prof.designation})")

            # Assign Teacher to Grade 10, Section A, Mathematics
            sec_a = section_map.get("Section A")
            math_sub = subject_map.get("MATH-10")
            if grade_10 and sec_a and math_sub and curr_year:
                assign_exists = db.query(TeacherAssignment).filter(
                    TeacherAssignment.teacher_id == teacher_user.id,
                    TeacherAssignment.class_id == grade_10.id,
                    TeacherAssignment.section_id == sec_a.id,
                    TeacherAssignment.subject_id == math_sub.id,
                    TeacherAssignment.academic_year_id == curr_year.id,
                ).first()
                if not assign_exists:
                    assign = TeacherAssignment(
                        teacher_id=teacher_user.id,
                        class_id=grade_10.id,
                        section_id=sec_a.id,
                        subject_id=math_sub.id,
                        academic_year_id=curr_year.id,
                    )
                    db.add(assign)
                    db.commit()
                    print(f" [CREATED] Teacher Assignment: {teacher_user.full_name} -> {grade_10.name} {sec_a.name} ({math_sub.name})")

        print("\n--- 6. Seeding Sample Student & Guardian ---")
        student_user = user_map.get("student@school.com")
        parent_user = user_map.get("parent@school.com")
        existing_student = db.query(Student).filter(Student.admission_number == "ADM-2026-0001").first()

        if not existing_student and grade_10 and section_map.get("Section A") and curr_year:
            student = Student(
                admission_number="ADM-2026-0001",
                user_id=student_user.id if student_user else None,
                first_name="Alex",
                last_name="Miller",
                date_of_birth=date(2010, 5, 14),
                gender="Male",
                blood_group="O+",
                admission_date=date(2026, 6, 1),
                city="Springfield",
                status=StudentStatus.ACTIVE,
            )
            db.add(student)
            db.flush()

            guardian = Guardian(
                user_id=parent_user.id if parent_user else None,
                full_name="Robert Miller",
                relationship_type="Father",
                email="parent@school.com",
                phone="+91 9876543214",
                occupation="Civil Engineer",
            )
            db.add(guardian)
            db.flush()

            db.add(StudentGuardian(student_id=student.id, guardian_id=guardian.id, is_primary=True))

            db.add(
                EnrollmentHistory(
                    student_id=student.id,
                    academic_year_id=curr_year.id,
                    class_id=grade_10.id,
                    section_id=section_map["Section A"].id,
                    roll_number="101",
                    status=EnrollmentStatus.ENROLLED,
                    enrolled_at=datetime.now(timezone.utc),
                    remarks="Initial Admission",
                )
            )
            db.commit()
            print(f" [CREATED] Student: {student.admission_number} - {student.full_name} enrolled in Grade 10 Section A")
        else:
            print(" [EXISTS]  Sample Student ADM-2026-0001 already seeded")

        print("\n--- 7. Seeding Standard Fee Types ---")
        fee_type_defs = [
            {"name": "Tuition Fee", "code": "TUIT", "description": "Academic tuition and classroom instruction fee"},
            {"name": "Admission Fee", "code": "ADM", "description": "One-time institutional admission and processing fee"},
            {"name": "Examination Fee", "code": "EXAM", "description": "Term and annual examination administration fee"},
            {"name": "Transport Fee", "code": "TRANS", "description": "School bus conveyance and route fee"},
            {"name": "Laboratory & Library Fee", "code": "LAB-LIB", "description": "Science labs and reading room access fee"},
            {"name": "Sports & Activities Fee", "code": "SPORT", "description": "Athletics and extracurricular activities fee"},
        ]
        fee_type_map = {}
        for ft_data in fee_type_defs:
            ft = db.query(FeeType).filter(FeeType.code == ft_data["code"]).first()
            if not ft:
                ft = FeeType(**ft_data)
                db.add(ft)
                db.commit()
                print(f" [CREATED] Fee Type: {ft.code} - {ft.name}")
            else:
                print(f" [EXISTS]  Fee Type: {ft.code} - {ft.name}")
            fee_type_map[ft.code] = ft

        print("\n--- 8. Seeding Grade 10 Fee Structure ---")
        existing_struct = (
            db.query(FeeStructure)
            .filter(
                FeeStructure.class_id == grade_10.id,
                FeeStructure.academic_year_id == curr_year.id,
            )
            .first()
        )
        if not existing_struct and grade_10 and curr_year:
            struct = FeeStructure(
                academic_year_id=curr_year.id,
                class_id=grade_10.id,
                name="Grade 10 Annual Academic Fee (2026-2027)",
                total_amount=Decimal("30000.00"),
                due_date=date(2026, 8, 31),
            )
            db.add(struct)
            db.flush()

            struct_items = [
                {"code": "TUIT", "amount": Decimal("20000.00")},
                {"code": "EXAM", "amount": Decimal("3000.00")},
                {"code": "LAB-LIB", "amount": Decimal("4000.00")},
                {"code": "SPORT", "amount": Decimal("3000.00")},
            ]
            for s_item in struct_items:
                ft = fee_type_map.get(s_item["code"])
                if ft:
                    db.add(
                        FeeStructureItem(
                            fee_structure_id=struct.id,
                            fee_type_id=ft.id,
                            amount=s_item["amount"],
                        )
                    )
            db.commit()
            print(f" [CREATED] Fee Structure: {struct.name} (Total: INR {struct.total_amount:,.2f})")
        else:
            print(" [EXISTS]  Fee Structure for Grade 10 already exists")

        print("\n--- 9. Seeding Sample Invoice & Payment for Alex Miller ---")
        student = db.query(Student).filter(Student.admission_number == "ADM-2026-0001").first()
        accountant_user = user_map.get("accountant@school.com")
        existing_inv = db.query(Invoice).filter(Invoice.invoice_number == "INV-2026-0001").first()

        if not existing_inv and student and curr_year:
            invoice = Invoice(
                invoice_number="INV-2026-0001",
                student_id=student.id,
                academic_year_id=curr_year.id,
                title="Grade 10 Term 1 Academic Fee",
                subtotal=Decimal("30000.00"),
                discount_amount=Decimal("0.00"),
                total_amount=Decimal("30000.00"),
                paid_amount=Decimal("10000.00"),
                balance_amount=Decimal("20000.00"),
                status=InvoiceStatus.PARTIALLY_PAID,
                issue_date=date(2026, 6, 5),
                due_date=date(2026, 12, 31),
                notes="Standard institutional enrollment fee",
            )
            db.add(invoice)
            db.flush()

            inv_items = [
                {"code": "TUIT", "desc": "Tuition Fee - Term 1", "amount": Decimal("20000.00")},
                {"code": "EXAM", "desc": "Examination Fee", "amount": Decimal("3000.00")},
                {"code": "LAB-LIB", "desc": "Science Labs & Library Fee", "amount": Decimal("4000.00")},
                {"code": "SPORT", "desc": "Athletics & Sports Facilities", "amount": Decimal("3000.00")},
            ]
            for item in inv_items:
                ft = fee_type_map.get(item["code"])
                if ft:
                    db.add(
                        InvoiceItem(
                            invoice_id=invoice.id,
                            fee_type_id=ft.id,
                            description=item["desc"],
                            amount=item["amount"],
                        )
                    )

            # Record initial payment of 10,000
            payment = Payment(
                receipt_number="REC-2026-0001",
                invoice_id=invoice.id,
                student_id=student.id,
                amount=Decimal("10000.00"),
                payment_method=PaymentMethod.UPI,
                payment_date=datetime(2026, 6, 10, 10, 30, 0, tzinfo=timezone.utc),
                transaction_reference="UPI-982348271039",
                collected_by_id=accountant_user.id if accountant_user else None,
                status=PaymentStatus.COMPLETED,
                notes="First installment collected via UPI",
            )
            db.add(payment)
            db.commit()
            print(f" [CREATED] Invoice {invoice.invoice_number} (Amount: INR 30,000, Paid: INR 10,000, Balance: INR 20,000)")
            print(f" [CREATED] Receipt {payment.receipt_number} (Amount: INR 10,000 via UPI)")
        else:
            print(" [EXISTS]  Sample Invoice INV-2026-0001 already seeded")

        print("\n--- 10. Seeding Standard CBSE Grading Scale ---")
        scale = db.query(GradingScale).filter(GradingScale.name == "CBSE 10-Point Scale").first()
        if not scale:
            scale = GradingScale(
                name="CBSE 10-Point Scale",
                is_default=True,
                description="Secondary school standard 10-point scholastic grading scale",
            )
            db.add(scale)
            db.flush()

            rules_data = [
                {"grade": "A1", "min": Decimal("91.00"), "max": Decimal("100.00"), "gp": Decimal("10.0"), "rem": "Outstanding"},
                {"grade": "A2", "min": Decimal("81.00"), "max": Decimal("90.99"), "gp": Decimal("9.0"), "rem": "Excellent"},
                {"grade": "B1", "min": Decimal("71.00"), "max": Decimal("80.99"), "gp": Decimal("8.0"), "rem": "Very Good"},
                {"grade": "B2", "min": Decimal("61.00"), "max": Decimal("70.99"), "gp": Decimal("7.0"), "rem": "Good"},
                {"grade": "C1", "min": Decimal("51.00"), "max": Decimal("60.99"), "gp": Decimal("6.0"), "rem": "Fair"},
                {"grade": "C2", "min": Decimal("41.00"), "max": Decimal("50.99"), "gp": Decimal("5.0"), "rem": "Average"},
                {"grade": "D", "min": Decimal("33.00"), "max": Decimal("40.99"), "gp": Decimal("4.0"), "rem": "Pass"},
                {"grade": "E", "min": Decimal("0.00"), "max": Decimal("32.99"), "gp": Decimal("0.0"), "rem": "Needs Improvement / Fail"},
            ]
            for r in rules_data:
                db.add(
                    GradeRule(
                        grading_scale_id=scale.id,
                        grade=r["grade"],
                        min_percentage=r["min"],
                        max_percentage=r["max"],
                        grade_point=r["gp"],
                        remarks=r["rem"],
                    )
                )
            db.commit()
            print(f" [CREATED] Grading Scale: {scale.name} (8 Grade Rules)")
        else:
            print(" [EXISTS]  Grading Scale already exists")

        print("\n--- 11. Seeding Midterm Examination & Schedules ---")
        exam = db.query(Exam).filter(Exam.name == "Term 1 Midterm Examinations (2026-2027)").first()
        if not exam and curr_year:
            exam = Exam(
                academic_year_id=curr_year.id,
                name="Term 1 Midterm Examinations (2026-2027)",
                exam_type=ExamType.MIDTERM,
                start_date=date(2026, 9, 15),
                end_date=date(2026, 9, 25),
                description="Comprehensive first-term scholastic assessment for all grades",
            )
            db.add(exam)
            db.flush()

            # Schedules for Grade 10 subjects
            schedules_spec = [
                {"code": "MATH-10", "dt": date(2026, 9, 15), "room": "Hall 101"},
                {"code": "ENG-10", "dt": date(2026, 9, 17), "room": "Hall 101"},
                {"code": "SCI-10", "dt": date(2026, 9, 19), "room": "Lab 2"},
                {"code": "SOC-10", "dt": date(2026, 9, 21), "room": "Hall 102"},
                {"code": "CS-10", "dt": date(2026, 9, 23), "room": "Computer Lab 1"},
            ]
            for s_spec in schedules_spec:
                subj = db.query(Subject).filter(Subject.code == s_spec["code"]).first()
                if subj and grade_10:
                    db.add(
                        ExamSchedule(
                            exam_id=exam.id,
                            class_id=grade_10.id,
                            subject_id=subj.id,
                            exam_date=s_spec["dt"],
                            start_time=time(9, 30),
                            end_time=time(12, 30),
                            max_marks=Decimal("100.00"),
                            pass_marks=Decimal("35.00"),
                            room_number=s_spec["room"],
                        )
                    )
            db.commit()
            print(f" [CREATED] Exam: {exam.name} with 5 Grade 10 Subject Schedules")
        else:
            print(" [EXISTS]  Midterm Exam already exists")

        print("\n--- 12. Seeding Sample Student Marks & Principal Review ---")
        student = db.query(Student).filter(Student.admission_number == "ADM-2026-0001").first()
        sec_a = section_map.get("Section A")
        teacher_user = user_map.get("teacher@school.com")
        principal_user = user_map.get("principal@school.com")

        if exam and student and sec_a:
            schedules = db.query(ExamSchedule).filter(ExamSchedule.exam_id == exam.id).all()
            sample_scores = {
                "MATH-10": Decimal("92.00"),  # A1
                "ENG-10": Decimal("85.00"),   # A2
                "SCI-10": Decimal("88.00"),   # A2
                "SOC-10": Decimal("78.00"),   # B1
                "CS-10": Decimal("95.00"),    # A1
            }

            for sched in schedules:
                subj = db.query(Subject).filter(Subject.id == sched.subject_id).first()
                code = subj.code if subj else ""
                score = sample_scores.get(code, Decimal("80.00"))

                # Create or update mark
                mark = (
                    db.query(StudentMark)
                    .filter(
                        StudentMark.exam_schedule_id == sched.id,
                        StudentMark.student_id == student.id,
                    )
                    .first()
                )
                if not mark:
                    db.add(
                        StudentMark(
                            exam_schedule_id=sched.id,
                            student_id=student.id,
                            section_id=sec_a.id,
                            marks_obtained=score,
                            is_absent=False,
                            grade="A1" if score >= 91 else ("A2" if score >= 81 else "B1"),
                            grade_point=Decimal("10.0") if score >= 91 else (Decimal("9.0") if score >= 81 else Decimal("8.0")),
                            remarks="Consistent academic performance",
                        )
                    )

                # Create submission batch (Approved by Principal)
                batch = (
                    db.query(ExamSubmissionBatch)
                    .filter(
                        ExamSubmissionBatch.exam_schedule_id == sched.id,
                        ExamSubmissionBatch.section_id == sec_a.id,
                    )
                    .first()
                )
                if not batch:
                    db.add(
                        ExamSubmissionBatch(
                            exam_schedule_id=sched.id,
                            section_id=sec_a.id,
                            status=MarksSubmissionStatus.APPROVED,
                            submitted_by_id=teacher_user.id if teacher_user else None,
                            submitted_at=datetime(2026, 9, 26, 14, 0, tzinfo=timezone.utc),
                            reviewed_by_id=principal_user.id if principal_user else None,
                            reviewed_at=datetime(2026, 9, 27, 10, 30, tzinfo=timezone.utc),
                            review_comments="Verified against answer keys. Approved for publication.",
                        )
                    )

            db.commit()
            print(" [CREATED] Seeded Approved Marks & Principal Approvals for Alex Miller")

        print("\n--- 12. Seeding Grade 10 Section A Attendance Records ---")
        if student and sec_a and grade_10 and curr_year:
            # 8 instructional dates in October 2026
            attendance_dates = [
                (date(2026, 10, 1), AttendanceStatus.PRESENT, None),
                (date(2026, 10, 2), AttendanceStatus.PRESENT, None),
                (date(2026, 10, 5), AttendanceStatus.PRESENT, None),
                (date(2026, 10, 6), AttendanceStatus.LATE, "Traffic delay on Route 4"),
                (date(2026, 10, 7), AttendanceStatus.PRESENT, None),
                (date(2026, 10, 8), AttendanceStatus.ABSENT, "Medical fever leave"),
                (date(2026, 10, 9), AttendanceStatus.PRESENT, None),
                (date(2026, 10, 12), AttendanceStatus.PRESENT, None),
            ]

            for att_date, st_status, remark in attendance_dates:
                existing_reg = (
                    db.query(AttendanceRegister)
                    .filter(
                        AttendanceRegister.class_id == grade_10.id,
                        AttendanceRegister.section_id == sec_a.id,
                        AttendanceRegister.attendance_date == att_date,
                    )
                    .first()
                )
                if not existing_reg:
                    reg = AttendanceRegister(
                        class_id=grade_10.id,
                        section_id=sec_a.id,
                        academic_year_id=curr_year.id,
                        attendance_date=att_date,
                        taken_by_id=teacher_user.id if teacher_user else None,
                        notes="Daily morning session roll call",
                        total_students=1,
                        present_count=1 if st_status in (AttendanceStatus.PRESENT, AttendanceStatus.LATE) else 0,
                        absent_count=1 if st_status == AttendanceStatus.ABSENT else 0,
                        late_count=1 if st_status == AttendanceStatus.LATE else 0,
                        half_day_count=0,
                        leave_count=0,
                    )
                    db.add(reg)
                    db.flush()

                    rec = AttendanceRecord(
                        register_id=reg.id,
                        student_id=student.id,
                        status=st_status,
                        remarks=remark,
                    )
                    db.add(rec)
                    db.flush()

                    # Seed sample correction log on the LATE date
                    if st_status == AttendanceStatus.LATE:
                        db.add(
                            AttendanceCorrectionLog(
                                attendance_record_id=rec.id,
                                previous_status=AttendanceStatus.ABSENT,
                                new_status=AttendanceStatus.LATE,
                                reason="Student arrived late by bus at 8:45 AM (rectified by teacher)",
                                changed_by_id=teacher_user.id if teacher_user else None,
                                changed_at=datetime(2026, 10, 6, 9, 0, tzinfo=timezone.utc),
                            )
                        )

            db.commit()
            print(" [CREATED] Seeded 8 Daily Attendance Registers and Student Records for Grade 10 Section A")

        print("\n--- 13. Seeding Second Child (Emma Miller) for Multi-Child Parent Portal ---")
        guardian = db.query(Guardian).filter(Guardian.email == "parent@school.com").first()
        grade_6 = db.query(SchoolClass).filter(SchoolClass.name == "Grade 6").first()
        sec_6a = db.query(Section).filter(Section.class_id == grade_6.id, Section.name == "Section A").first() if grade_6 else None
        existing_emma = db.query(Student).filter(Student.admission_number == "ADM-2026-0003").first()

        if not existing_emma and guardian and grade_6 and sec_6a and curr_year:
            emma = Student(
                admission_number="ADM-2026-0003",
                first_name="Emma",
                last_name="Miller",
                date_of_birth=date(2014, 8, 20),
                gender="Female",
                blood_group="B+",
                admission_date=date(2026, 6, 1),
                city="Springfield",
                status=StudentStatus.ACTIVE,
            )
            db.add(emma)
            db.flush()

            db.add(StudentGuardian(student_id=emma.id, guardian_id=guardian.id, is_primary=True))
            db.add(
                EnrollmentHistory(
                    student_id=emma.id,
                    academic_year_id=curr_year.id,
                    class_id=grade_6.id,
                    section_id=sec_6a.id,
                    roll_number="601",
                    status=EnrollmentStatus.ENROLLED,
                    enrolled_at=datetime.now(timezone.utc),
                    remarks="Middle School Enrollment",
                )
            )

            # Seed an invoice for Emma Miller
            db.add(
                Invoice(
                    invoice_number="INV-2026-0003",
                    student_id=emma.id,
                    academic_year_id=curr_year.id,
                    title="Grade 6 Term 1 Academic Fee",
                    subtotal=Decimal("24000.00"),
                    discount_amount=Decimal("0.00"),
                    total_amount=Decimal("24000.00"),
                    paid_amount=Decimal("0.00"),
                    balance_amount=Decimal("24000.00"),
                    status=InvoiceStatus.UNPAID,
                    issue_date=date(2026, 6, 5),
                    due_date=date(2026, 12, 31),
                    notes="Middle School Tuition & Activities",
                )
            )
            db.commit()
            print(" [CREATED] Seeded Second Child: Emma Miller (ADM-2026-0003, Grade 6 Section A)")
        else:
            print(" [EXISTS]  Emma Miller already exists or prerequisite missing")

        print("\n--- 14. Seeding Grade 10 Section A Weekly Timetable ---")
        if grade_10 and sec_a and curr_year:
            existing_timetable = (
                db.query(ClassTimetable)
                .filter(ClassTimetable.class_id == grade_10.id, ClassTimetable.section_id == sec_a.id)
                .first()
            )
            if not existing_timetable:
                math_subj = db.query(Subject).filter(Subject.code == "MATH-10").first()
                sci_subj = db.query(Subject).filter(Subject.code == "SCI-10").first()
                eng_subj = db.query(Subject).filter(Subject.code == "ENG-10").first()
                soc_subj = db.query(Subject).filter(Subject.code == "SOC-10").first()
                cs_subj = db.query(Subject).filter(Subject.code == "CS-10").first()

                days = [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY]
                daily_periods = [
                    (1, time(8, 30), time(9, 15), math_subj, teacher_user, "Room 101"),
                    (2, time(9, 15), time(10, 0), sci_subj, teacher_user, "Room 101"),
                    (3, time(10, 15), time(11, 0), eng_subj, None, "Room 101"),
                    (4, time(11, 0), time(11, 45), soc_subj, None, "Room 101"),
                    (5, time(12, 0), time(12, 45), cs_subj, None, "Computer Lab 2"),
                ]

                for day in days:
                    for period_num, s_time, e_time, subj, instructor, room in daily_periods:
                        if subj:
                            db.add(
                                ClassTimetable(
                                    class_id=grade_10.id,
                                    section_id=sec_a.id,
                                    academic_year_id=curr_year.id,
                                    day_of_week=day,
                                    period_number=period_num,
                                    start_time=s_time,
                                    end_time=e_time,
                                    subject_id=subj.id,
                                    teacher_id=instructor.id if instructor else None,
                                    room_number=room,
                                )
                            )
                db.commit()
                print(" [CREATED] Seeded Complete Monday-Friday Weekly Timetable for Grade 10 Section A")
            else:
                print(" [EXISTS]  Timetable for Grade 10 Section A already exists")

        print("\n--- 15. Seeding Institutional Announcements & Notices ---")
        admin_user = db.query(User).filter(User.email == "admin@school.com").first()
        if admin_user:
            notices_data = [
                {
                    "title": "Welcome to Academic Session 2026-2027",
                    "content": "We warmly welcome all students, parents, and faculty to the new academic year. Orientation assemblies will commence next Monday. Please review the updated handbook on the portal.",
                    "target_audience": NoticeAudience.ALL,
                    "is_pinned": True,
                    "class_id": None,
                },
                {
                    "title": "Faculty Curriculum & Departmental Review Meeting",
                    "content": "All department heads and teaching staff are requested to attend the quarterly syllabus pacing meeting this Friday at 3:30 PM in Conference Hall B.",
                    "target_audience": NoticeAudience.TEACHERS,
                    "is_pinned": False,
                    "class_id": None,
                },
                {
                    "title": "Quarterly Parent-Teacher Meeting (PTM) Schedule",
                    "content": "The Term 1 Parent-Teacher Meeting is scheduled for October 24th from 9:00 AM to 1:00 PM. Parents can check academic report cards and consult class instructors directly.",
                    "target_audience": NoticeAudience.PARENTS,
                    "is_pinned": True,
                    "class_id": None,
                },
                {
                    "title": "Grade 10 Science Practical & Project Submissions",
                    "content": "All Grade 10 students must submit their completed Physics and Chemistry lab record books before the end of next week for practical grading certification.",
                    "target_audience": NoticeAudience.CLASS_SPECIFIC,
                    "is_pinned": False,
                    "class_id": grade_10.id if grade_10 else None,
                },
            ]

            for n_info in notices_data:
                existing_notice = db.query(Notice).filter(Notice.title == n_info["title"]).first()
                if not existing_notice:
                    db.add(
                        Notice(
                            title=n_info["title"],
                            content=n_info["content"],
                            target_audience=n_info["target_audience"],
                            class_id=n_info["class_id"],
                            is_pinned=n_info["is_pinned"],
                            is_published=True,
                            publish_date=date.today(),
                            author_id=admin_user.id,
                        )
                    )
            db.commit()
            print(" [CREATED] Seeded 4 Standard Institutional Notices (School-wide, Faculty, Parents, Class 10)")
        else:
            print(" [SKIP]    Admin user not available for notice authoring")

        print("\n=== Phase 7 Database Seeding Successfully Completed! ===")
    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
