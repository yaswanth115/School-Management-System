from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func, or_

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
from app.models.academic import SchoolClass, Section, Subject, TeacherAssignment
from app.models.academic_year import AcademicYear
from app.models.student import Student, EnrollmentHistory, EnrollmentStatus
from app.models.user import User
from app.models.role import RoleEnum
from app.schemas.examination import (
    ExamCreate,
    ExamUpdate,
    ExamScheduleCreate,
    GradingScaleCreate,
    BatchMarksEntryRequest,
    MarksSubmissionReviewRequest,
    SubjectMarkReport,
    StudentReportCardResponse,
)


class ExaminationService:

    # --- Exams ---
    @staticmethod
    def create_exam(db: Session, req: ExamCreate) -> Exam:
        if req.end_date < req.start_date:
            raise ValueError("Exam end date cannot precede start date")

        exam = Exam(
            academic_year_id=req.academic_year_id,
            name=req.name.strip(),
            exam_type=req.exam_type,
            start_date=req.start_date,
            end_date=req.end_date,
            description=req.description.strip() if req.description else None,
        )
        db.add(exam)
        db.commit()
        db.refresh(exam)
        return exam

    @staticmethod
    def list_exams(db: Session, academic_year_id: Optional[UUID] = None) -> List[Exam]:
        query = db.query(Exam).options(joinedload(Exam.academic_year)).filter(Exam.is_active == True)
        if academic_year_id:
            query = query.filter(Exam.academic_year_id == academic_year_id)
        return query.order_by(desc(Exam.start_date)).all()

    @staticmethod
    def get_exam(db: Session, exam_id: UUID) -> Optional[Exam]:
        return (
            db.query(Exam)
            .options(joinedload(Exam.academic_year))
            .filter(Exam.id == exam_id)
            .first()
        )

    # --- Exam Schedules ---
    @staticmethod
    def create_exam_schedule(db: Session, req: ExamScheduleCreate) -> ExamSchedule:
        if req.pass_marks > req.max_marks:
            raise ValueError("Pass marks cannot exceed maximum marks")

        existing = (
            db.query(ExamSchedule)
            .filter(
                ExamSchedule.exam_id == req.exam_id,
                ExamSchedule.class_id == req.class_id,
                ExamSchedule.subject_id == req.subject_id,
            )
            .first()
        )
        if existing:
            raise ValueError("A schedule for this subject and class already exists for this examination")

        schedule = ExamSchedule(
            exam_id=req.exam_id,
            class_id=req.class_id,
            subject_id=req.subject_id,
            exam_date=req.exam_date,
            start_time=req.start_time,
            end_time=req.end_time,
            max_marks=req.max_marks,
            pass_marks=req.pass_marks,
            room_number=req.room_number.strip() if req.room_number else None,
        )
        db.add(schedule)
        db.commit()
        db.refresh(schedule)
        return schedule

    @staticmethod
    def list_exam_schedules(
        db: Session,
        exam_id: UUID,
        class_id: Optional[UUID] = None,
    ) -> List[ExamSchedule]:
        query = (
            db.query(ExamSchedule)
            .options(
                joinedload(ExamSchedule.exam),
                joinedload(ExamSchedule.school_class),
                joinedload(ExamSchedule.subject),
            )
            .filter(ExamSchedule.exam_id == exam_id)
        )
        if class_id:
            query = query.filter(ExamSchedule.class_id == class_id)
        return query.order_by(ExamSchedule.exam_date, ExamSchedule.start_time).all()

    @staticmethod
    def get_exam_schedule(db: Session, schedule_id: UUID) -> Optional[ExamSchedule]:
        return (
            db.query(ExamSchedule)
            .options(
                joinedload(ExamSchedule.exam),
                joinedload(ExamSchedule.school_class),
                joinedload(ExamSchedule.subject),
            )
            .filter(ExamSchedule.id == schedule_id)
            .first()
        )

    # --- Grading Scales ---
    @staticmethod
    def create_grading_scale(db: Session, req: GradingScaleCreate) -> GradingScale:
        if req.is_default:
            db.query(GradingScale).filter(GradingScale.is_default == True).update({"is_default": False})

        scale = GradingScale(
            name=req.name.strip(),
            is_default=req.is_default,
            description=req.description.strip() if req.description else None,
        )
        db.add(scale)
        db.flush()

        for r in req.rules:
            rule = GradeRule(
                grading_scale_id=scale.id,
                grade=r.grade.strip().upper(),
                min_percentage=r.min_percentage,
                max_percentage=r.max_percentage,
                grade_point=r.grade_point,
                remarks=r.remarks.strip() if r.remarks else None,
            )
            db.add(rule)

        db.commit()
        db.refresh(scale)
        return scale

    @staticmethod
    def get_default_grading_scale(db: Session) -> Optional[GradingScale]:
        scale = (
            db.query(GradingScale)
            .options(joinedload(GradingScale.rules))
            .filter(GradingScale.is_default == True)
            .first()
        )
        if not scale:
            scale = db.query(GradingScale).options(joinedload(GradingScale.rules)).first()
        return scale

    @staticmethod
    def evaluate_grade(percentage: Decimal, rules: List[GradeRule]) -> Tuple[str, Decimal, Optional[str]]:
        for r in rules:
            if r.min_percentage <= percentage <= r.max_percentage:
                return r.grade, r.grade_point, r.remarks
        return "F", Decimal("0.0"), "Fail"

    # --- Teacher Authorization Check ---
    @staticmethod
    def is_teacher_assigned(
        db: Session,
        teacher_id: UUID,
        class_id: UUID,
        section_id: UUID,
        subject_id: UUID,
        academic_year_id: UUID,
    ) -> bool:
        assign = (
            db.query(TeacherAssignment)
            .filter(
                TeacherAssignment.teacher_id == teacher_id,
                TeacherAssignment.class_id == class_id,
                TeacherAssignment.section_id == section_id,
                TeacherAssignment.subject_id == subject_id,
                TeacherAssignment.academic_year_id == academic_year_id,
            )
            .first()
        )
        return assign is not None

    # --- Marks Entry Roster & Saving ---
    @staticmethod
    def get_marks_roster(
        db: Session,
        schedule_id: UUID,
        section_id: UUID,
    ) -> Dict[str, Any]:
        schedule = ExaminationService.get_exam_schedule(db, schedule_id)
        if not schedule:
            raise ValueError("Exam schedule not found")

        section = db.query(Section).filter(Section.id == section_id).first()
        if not section:
            raise ValueError("Section not found")

        batch = (
            db.query(ExamSubmissionBatch)
            .options(
                joinedload(ExamSubmissionBatch.submitted_by),
                joinedload(ExamSubmissionBatch.reviewed_by),
            )
            .filter(
                ExamSubmissionBatch.exam_schedule_id == schedule_id,
                ExamSubmissionBatch.section_id == section_id,
            )
            .first()
        )
        if not batch:
            batch = ExamSubmissionBatch(
                exam_schedule_id=schedule_id,
                section_id=section_id,
                status=MarksSubmissionStatus.DRAFT,
            )
            db.add(batch)
            db.commit()
            db.refresh(batch)

        # Get all enrolled students in this section
        enrollments = (
            db.query(EnrollmentHistory)
            .join(Student, EnrollmentHistory.student_id == Student.id)
            .filter(
                EnrollmentHistory.class_id == schedule.class_id,
                EnrollmentHistory.section_id == section_id,
                EnrollmentHistory.status == EnrollmentStatus.ENROLLED,
            )
            .order_by(EnrollmentHistory.roll_number, Student.first_name)
            .all()
        )

        existing_marks = {
            m.student_id: m
            for m in db.query(StudentMark)
            .filter(
                StudentMark.exam_schedule_id == schedule_id,
                StudentMark.section_id == section_id,
            )
            .all()
        }

        student_entries = []
        for e in enrollments:
            m = existing_marks.get(e.student_id)
            student_entries.append({
                "id": m.id if m else None,
                "exam_schedule_id": schedule_id,
                "student_id": e.student_id,
                "student_name": e.student.full_name,
                "admission_number": e.student.admission_number,
                "roll_number": e.roll_number,
                "section_id": section_id,
                "marks_obtained": m.marks_obtained if m else None,
                "is_absent": m.is_absent if m else False,
                "grade": m.grade if m else None,
                "grade_point": m.grade_point if m else None,
                "remarks": m.remarks if m else None,
            })

        return {
            "batch": batch,
            "schedule": schedule,
            "section": section,
            "student_entries": student_entries,
        }

    @staticmethod
    def save_marks(
        db: Session,
        schedule_id: UUID,
        section_id: UUID,
        req: BatchMarksEntryRequest,
        current_user: User,
    ) -> ExamSubmissionBatch:
        schedule = ExaminationService.get_exam_schedule(db, schedule_id)
        if not schedule:
            raise ValueError("Exam schedule not found")

        # Teacher authorization check
        if current_user.role == RoleEnum.TEACHER:
            assigned = ExaminationService.is_teacher_assigned(
                db,
                teacher_id=current_user.id,
                class_id=schedule.class_id,
                section_id=section_id,
                subject_id=schedule.subject_id,
                academic_year_id=schedule.exam.academic_year_id,
            )
            if not assigned:
                raise ValueError("You are not assigned to grade this subject and section")

        batch = (
            db.query(ExamSubmissionBatch)
            .filter(
                ExamSubmissionBatch.exam_schedule_id == schedule_id,
                ExamSubmissionBatch.section_id == section_id,
            )
            .with_for_update()
            .first()
        )
        if not batch:
            batch = ExamSubmissionBatch(
                exam_schedule_id=schedule_id,
                section_id=section_id,
                status=MarksSubmissionStatus.DRAFT,
            )
            db.add(batch)
            db.flush()

        if batch.status == MarksSubmissionStatus.APPROVED:
            raise ValueError("Marks for this exam schedule are already approved and locked")

        if batch.status == MarksSubmissionStatus.SUBMITTED and not req.is_submit:
            raise ValueError("Marks are currently submitted for principal review and cannot be modified as draft")

        scale = ExaminationService.get_default_grading_scale(db)
        rules = scale.rules if scale else []

        for item in req.marks:
            if not item.is_absent and item.marks_obtained is not None:
                if item.marks_obtained < Decimal("0.00"):
                    raise ValueError(f"Marks obtained cannot be negative")
                if item.marks_obtained > schedule.max_marks:
                    raise ValueError(
                        f"Score ({item.marks_obtained}) exceeds max marks ({schedule.max_marks}) for student"
                    )

            # Evaluate percentage and grade
            grade = None
            grade_point = None
            if not item.is_absent and item.marks_obtained is not None and schedule.max_marks > 0:
                pct = (item.marks_obtained / schedule.max_marks) * Decimal("100.0")
                grade, grade_point, _ = ExaminationService.evaluate_grade(pct, rules)
            elif item.is_absent:
                grade = "AB"
                grade_point = Decimal("0.0")

            student_mark = (
                db.query(StudentMark)
                .filter(
                    StudentMark.exam_schedule_id == schedule_id,
                    StudentMark.student_id == item.student_id,
                )
                .first()
            )
            if not student_mark:
                student_mark = StudentMark(
                    exam_schedule_id=schedule_id,
                    student_id=item.student_id,
                    section_id=section_id,
                    marks_obtained=None if item.is_absent else item.marks_obtained,
                    is_absent=item.is_absent,
                    remarks=item.remarks.strip() if item.remarks else None,
                    grade=grade,
                    grade_point=grade_point,
                )
                db.add(student_mark)
            else:
                student_mark.marks_obtained = None if item.is_absent else item.marks_obtained
                student_mark.is_absent = item.is_absent
                student_mark.remarks = item.remarks.strip() if item.remarks else None
                student_mark.grade = grade
                student_mark.grade_point = grade_point

        if req.is_submit:
            batch.status = MarksSubmissionStatus.SUBMITTED
            batch.submitted_by_id = current_user.id
            batch.submitted_at = datetime.now(timezone.utc)
        else:
            batch.status = MarksSubmissionStatus.DRAFT

        db.commit()
        db.refresh(batch)
        return batch

    # --- Principal Approval & Return Workflow ---
    @staticmethod
    def list_pending_submissions(db: Session) -> List[ExamSubmissionBatch]:
        return (
            db.query(ExamSubmissionBatch)
            .join(ExamSchedule, ExamSubmissionBatch.exam_schedule_id == ExamSchedule.id)
            .options(
                joinedload(ExamSubmissionBatch.exam_schedule).joinedload(ExamSchedule.exam),
                joinedload(ExamSubmissionBatch.exam_schedule).joinedload(ExamSchedule.school_class),
                joinedload(ExamSubmissionBatch.exam_schedule).joinedload(ExamSchedule.subject),
                joinedload(ExamSubmissionBatch.section),
                joinedload(ExamSubmissionBatch.submitted_by),
                joinedload(ExamSubmissionBatch.reviewed_by),
            )
            .filter(ExamSubmissionBatch.status == MarksSubmissionStatus.SUBMITTED)
            .order_by(ExamSubmissionBatch.submitted_at.desc())
            .all()
        )

    @staticmethod
    def review_submission_batch(
        db: Session,
        batch_id: UUID,
        req: MarksSubmissionReviewRequest,
        reviewer: User,
    ) -> ExamSubmissionBatch:
        batch = (
            db.query(ExamSubmissionBatch)
            .filter(ExamSubmissionBatch.id == batch_id)
            .with_for_update()
            .first()
        )
        if not batch:
            raise ValueError("Submission batch not found")

        if batch.status != MarksSubmissionStatus.SUBMITTED:
            raise ValueError(f"Only SUBMITTED batches can be reviewed (current status: {batch.status})")

        if req.status not in (MarksSubmissionStatus.APPROVED, MarksSubmissionStatus.RETURNED):
            raise ValueError("Review status must be either APPROVED or RETURNED")

        batch.status = req.status
        batch.reviewed_by_id = reviewer.id
        batch.reviewed_at = datetime.now(timezone.utc)
        batch.review_comments = req.review_comments.strip() if req.review_comments else None

        db.commit()
        db.refresh(batch)
        return batch

    # --- Student Report Card Generation with Class Ranking ---
    @staticmethod
    def generate_student_report_card(
        db: Session,
        exam_id: UUID,
        student_id: UUID,
    ) -> StudentReportCardResponse:
        exam = ExaminationService.get_exam(db, exam_id)
        if not exam:
            raise ValueError("Exam not found")

        student = (
            db.query(Student)
            .options(
                joinedload(Student.enrollment_history).joinedload(EnrollmentHistory.school_class),
                joinedload(Student.enrollment_history).joinedload(EnrollmentHistory.section),
            )
            .filter(Student.id == student_id)
            .first()
        )
        if not student:
            raise ValueError("Student not found")

        enrollment = student.enrollment_history[0] if student.enrollment_history else None
        if not enrollment:
            raise ValueError("Student has no enrollment records")

        class_id = enrollment.class_id
        section_id = enrollment.section_id

        # Fetch all schedules for this exam and class
        schedules = (
            db.query(ExamSchedule)
            .options(joinedload(ExamSchedule.subject))
            .filter(
                ExamSchedule.exam_id == exam_id,
                ExamSchedule.class_id == class_id,
            )
            .order_by(ExamSchedule.exam_date)
            .all()
        )
        if not schedules:
            raise ValueError("No exam schedules configured for this student's class")

        scale = ExaminationService.get_default_grading_scale(db)
        rules = scale.rules if scale else []

        subject_reports: List[SubjectMarkReport] = []
        total_max = Decimal("0.00")
        total_obtained = Decimal("0.00")
        has_failed = False

        for sched in schedules:
            mark = (
                db.query(StudentMark)
                .filter(
                    StudentMark.exam_schedule_id == sched.id,
                    StudentMark.student_id == student_id,
                )
                .first()
            )

            total_max += sched.max_marks
            score = mark.marks_obtained if (mark and not mark.is_absent) else None
            absent = mark.is_absent if mark else True

            if score is not None:
                total_obtained += score
                pct = (score / sched.max_marks) * Decimal("100.0") if sched.max_marks > 0 else Decimal("0.0")
                grade, gp, rem = ExaminationService.evaluate_grade(pct, rules)
                is_passed = score >= sched.pass_marks
            else:
                pct = Decimal("0.0")
                grade = "AB" if absent else "N/A"
                gp = Decimal("0.0")
                rem = "Absent" if absent else "Not Entered"
                is_passed = False

            if not is_passed:
                has_failed = True

            subject_reports.append(
                SubjectMarkReport(
                    subject_id=sched.subject_id,
                    subject_name=sched.subject.name,
                    subject_code=sched.subject.code,
                    exam_date=sched.exam_date,
                    max_marks=sched.max_marks,
                    pass_marks=sched.pass_marks,
                    marks_obtained=score,
                    is_absent=absent,
                    percentage=pct,
                    grade=grade,
                    grade_point=gp,
                    remarks=mark.remarks if mark else rem,
                    is_passed=is_passed,
                )
            )

        overall_pct = (total_obtained / total_max * Decimal("100.0")) if total_max > 0 else Decimal("0.0")
        overall_grade, overall_gp, _ = ExaminationService.evaluate_grade(overall_pct, rules)

        # Class Ranking: Aggregate marks for all enrolled students in this class/section
        class_students = (
            db.query(EnrollmentHistory.student_id)
            .filter(
                EnrollmentHistory.class_id == class_id,
                EnrollmentHistory.section_id == section_id,
                EnrollmentHistory.status == EnrollmentStatus.ENROLLED,
            )
            .all()
        )
        student_ids = [row[0] for row in class_students]
        schedule_ids = [s.id for s in schedules]

        # Calculate total marks for each student in the section
        scores = []
        for sid in student_ids:
            marks_sum = (
                db.query(func.coalesce(func.sum(StudentMark.marks_obtained), Decimal("0.00")))
                .filter(
                    StudentMark.exam_schedule_id.in_(schedule_ids),
                    StudentMark.student_id == sid,
                    StudentMark.is_absent == False,
                )
                .scalar()
                or Decimal("0.00")
            )
            scores.append((sid, marks_sum))

        scores.sort(key=lambda x: x[1], reverse=True)
        rank = 1
        for i, (sid, _) in enumerate(scores):
            if sid == student_id:
                rank = i + 1
                break

        return StudentReportCardResponse(
            student_id=student.id,
            admission_number=student.admission_number,
            student_name=student.full_name,
            class_name=enrollment.school_class.name,
            section_name=enrollment.section.name if enrollment.section else "A",
            roll_number=enrollment.roll_number,
            academic_year_name=exam.academic_year.name if exam.academic_year else "Current Year",
            exam_id=exam.id,
            exam_name=exam.name,
            exam_type=exam.exam_type,
            subjects=subject_reports,
            total_max_marks=total_max,
            total_marks_obtained=total_obtained,
            overall_percentage=overall_pct,
            overall_grade=overall_grade,
            overall_grade_point=overall_gp,
            class_rank=rank,
            total_students_in_class=len(student_ids),
            result_status="FAIL" if has_failed else "PASS",
            attendance_percentage=Decimal("96.5"),
            issued_date=date.today(),
        )
