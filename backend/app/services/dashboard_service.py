from datetime import date, datetime
from decimal import Decimal
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_

from app.models.user import User
from app.models.role import RoleEnum
from app.models.academic import SchoolClass, Section, TeacherAssignment
from app.models.student import Student, Guardian, StudentGuardian, EnrollmentHistory, EnrollmentStatus
from app.models.staff import StaffProfile
from app.models.fee import Invoice, Payment, InvoiceStatus
from app.models.examination import Exam, ExamSchedule, ExamSubmissionBatch, MarksSubmissionStatus, StudentMark
from app.models.attendance import AttendanceRegister, AttendanceRecord, AttendanceStatus
from app.models.timetable import ClassTimetable, DayOfWeek
from app.models.notice import Notice, NoticeAudience
from app.models.audit import AuditLog
from app.schemas.dashboard import (
    DashboardNoticeItem,
    AdminDashboardStats,
    AccountantDashboardStats,
    TeacherDashboardStats,
    ParentDashboardStats,
    StudentDashboardStats,
)
from app.services.attendance_service import AttendanceService
from app.services.notice_service import NoticeService


class DashboardService:

    @staticmethod
    def _get_recent_notices(db: Session, current_user: User, limit: int = 5) -> List[DashboardNoticeItem]:
        res = NoticeService.list_notices(db, current_user=current_user, limit=limit)
        return [
            DashboardNoticeItem(
                id=item.id,
                title=item.title,
                target_audience=item.target_audience,
                publish_date=item.publish_date,
                is_pinned=item.is_pinned,
                author_name=item.author_name,
            )
            for item in res.items
        ]

    @classmethod
    def get_dashboard_stats(cls, db: Session, current_user: User) -> Dict[str, Any]:
        """
        Aggregate live role-tailored metrics across the institutional database.
        """
        role = current_user.role

        if role in [RoleEnum.ADMIN, RoleEnum.PRINCIPAL]:
            return cls._get_admin_stats(db, current_user).model_dump()
        elif role == RoleEnum.ACCOUNTANT:
            return cls._get_accountant_stats(db, current_user).model_dump()
        elif role == RoleEnum.TEACHER:
            return cls._get_teacher_stats(db, current_user).model_dump()
        elif role == RoleEnum.PARENT:
            return cls._get_parent_stats(db, current_user).model_dump()
        elif role == RoleEnum.STUDENT:
            return cls._get_student_stats(db, current_user).model_dump()
        else:
            return cls._get_admin_stats(db, current_user).model_dump()

    @classmethod
    def _get_admin_stats(cls, db: Session, current_user: User) -> AdminDashboardStats:
        total_students = db.query(func.count(Student.id)).filter(Student.is_active == True).scalar() or 0
        total_teachers = db.query(func.count(StaffProfile.id)).filter(StaffProfile.is_active == True).scalar() or 0
        total_classes = db.query(func.count(SchoolClass.id)).filter(SchoolClass.is_active == True).scalar() or 0

        # Attendance calculation
        latest_register = db.query(AttendanceRegister).order_by(AttendanceRegister.attendance_date.desc()).first()
        today_att_pct = 0.0
        if latest_register:
            # Aggregate stats from all registers on latest register date
            day_registers = db.query(AttendanceRegister).filter(AttendanceRegister.attendance_date == latest_register.attendance_date).all()
            tot_students_day = sum(r.total_students for r in day_registers)
            tot_present_day = sum((r.present_count + (r.late_count or 0) + (r.half_day_count or 0) * 0.5) for r in day_registers)
            if tot_students_day > 0:
                today_att_pct = round((tot_present_day / tot_students_day) * 100, 1)

        # Financials
        total_collected = db.query(func.sum(Payment.amount)).scalar() or Decimal("0.00")
        total_pending = db.query(func.sum(Invoice.balance_amount)).filter(Invoice.status != InvoiceStatus.CANCELLED).scalar() or Decimal("0.00")

        # Examination pending reviews
        pending_reviews = (
            db.query(func.count(ExamSubmissionBatch.id))
            .filter(ExamSubmissionBatch.status == MarksSubmissionStatus.SUBMITTED)
            .scalar()
            or 0
        )

        active_notices_count = db.query(func.count(Notice.id)).filter(Notice.is_active == True, Notice.is_published == True).scalar() or 0
        recent_notices = cls._get_recent_notices(db, current_user, limit=5)

        # Recent activities from AuditLog
        recent_audits = (
            db.query(AuditLog)
            .order_by(AuditLog.timestamp.desc())
            .limit(6)
            .all()
        )
        recent_activities = [
            {
                "id": str(a.id),
                "action": a.action,
                "entity": a.resource_type or "SYSTEM",
                "details": str(a.details) if a.details else a.action,
                "timestamp": a.timestamp.isoformat() if a.timestamp else None,
                "user_name": a.user.full_name if a.user else "System",
            }
            for a in recent_audits
        ]

        return AdminDashboardStats(
            role=current_user.role,
            total_students=total_students,
            total_teachers=total_teachers,
            total_classes=total_classes,
            today_attendance_percentage=float(today_att_pct),
            total_fees_collected=float(total_collected),
            total_fees_pending=float(total_pending),
            pending_marks_reviews=pending_reviews,
            active_notices_count=active_notices_count,
            recent_notices=recent_notices,
            recent_activities=recent_activities,
        )

    @classmethod
    def _get_accountant_stats(cls, db: Session, current_user: User) -> AccountantDashboardStats:
        invoices = db.query(Invoice).filter(Invoice.status != InvoiceStatus.CANCELLED).all()
        total_invoiced = sum((i.total_amount for i in invoices), Decimal("0.00"))
        total_collected = sum((i.paid_amount for i in invoices), Decimal("0.00"))
        total_outstanding = sum((i.balance_amount for i in invoices), Decimal("0.00"))

        overdue_count = sum(
            1 for i in invoices if i.status == InvoiceStatus.OVERDUE or (i.balance_amount > 0 and i.due_date and i.due_date < date.today())
        )

        recent_payments_objs = (
            db.query(Payment)
            .order_by(Payment.payment_date.desc())
            .limit(6)
            .all()
        )
        recent_payments = [
            {
                "id": str(p.id),
                "receipt_number": p.receipt_number,
                "amount": float(p.amount),
                "payment_method": p.payment_method,
                "payment_date": p.payment_date.isoformat() if p.payment_date else None,
                "student_name": p.student.full_name if p.student else (p.invoice.student.full_name if p.invoice and p.invoice.student else "Student"),
                "invoice_number": p.invoice.invoice_number if p.invoice else None,
            }
            for p in recent_payments_objs
        ]

        return AccountantDashboardStats(
            role=RoleEnum.ACCOUNTANT,
            total_invoiced=float(total_invoiced),
            total_collected=float(total_collected),
            total_outstanding=float(total_outstanding),
            total_invoices_count=len(invoices),
            overdue_invoices_count=overdue_count,
            recent_payments=recent_payments,
            recent_notices=cls._get_recent_notices(db, current_user, limit=5),
        )

    @classmethod
    def _get_teacher_stats(cls, db: Session, current_user: User) -> TeacherDashboardStats:
        staff = db.query(StaffProfile).filter(StaffProfile.user_id == current_user.id).first()
        assigned_classes_count = 0
        total_students_taught = 0
        today_attendance_marked = False
        today_periods = []
        pending_marks_entry = 0

        if current_user:
            assignments = db.query(TeacherAssignment).filter(TeacherAssignment.teacher_id == current_user.id).all()
            assigned_classes_count = len(assignments)

            section_ids = list(set([a.section_id for a in assignments]))
            if section_ids:
                total_students_taught = (
                    db.query(func.count(EnrollmentHistory.id))
                    .filter(
                        EnrollmentHistory.section_id.in_(section_ids),
                        EnrollmentHistory.status == EnrollmentStatus.ENROLLED,
                    )
                    .scalar()
                    or 0
                )

                # Check if today's attendance has been marked for these sections
                marked_count = (
                    db.query(func.count(AttendanceRegister.id))
                    .filter(
                        AttendanceRegister.section_id.in_(section_ids),
                        AttendanceRegister.attendance_date == date.today(),
                    )
                    .scalar()
                    or 0
                )
                today_attendance_marked = (marked_count >= len(section_ids)) if section_ids else False

            # Timetable for today
            day_name = date.today().strftime("%A").upper()
            try:
                curr_day_enum = DayOfWeek(day_name)
            except ValueError:
                curr_day_enum = DayOfWeek.MONDAY

            periods = (
                db.query(ClassTimetable)
                .filter(
                    ClassTimetable.teacher_id == current_user.id,
                    ClassTimetable.day_of_week == curr_day_enum,
                )
                .order_by(ClassTimetable.period_number)
                .all()
            )
            today_periods = [
                {
                    "period_number": p.period_number,
                    "start_time": str(p.start_time)[:5],
                    "end_time": str(p.end_time)[:5],
                    "subject_name": p.subject.name if p.subject else "Subject",
                    "class_name": p.school_class.name if p.school_class else "",
                    "section_name": p.section.name if p.section else "",
                    "room_number": p.room_number or "Assigned Room",
                }
                for p in periods
            ]

        return TeacherDashboardStats(
            role=RoleEnum.TEACHER,
            assigned_classes_count=assigned_classes_count,
            total_students_taught=total_students_taught,
            today_attendance_marked=today_attendance_marked,
            pending_marks_entry=pending_marks_entry,
            today_periods=today_periods,
            recent_notices=cls._get_recent_notices(db, current_user, limit=5),
        )

    @classmethod
    def _get_parent_stats(cls, db: Session, current_user: User) -> ParentDashboardStats:
        from app.services.portal_service import PortalService
        children_summaries = PortalService.get_parent_children(db, current_user)

        children_list = [
            {
                "student_id": str(c.student_id),
                "full_name": c.full_name,
                "admission_number": c.admission_number,
                "class_name": c.class_name,
                "section_name": c.section_name,
                "attendance_percentage": float(c.attendance_percentage),
                "outstanding_fee_amount": float(c.outstanding_fee_amount),
            }
            for c in children_summaries
        ]

        total_outstanding = sum((c["outstanding_fee_amount"] for c in children_list), 0.0)

        return ParentDashboardStats(
            role=RoleEnum.PARENT,
            children_count=len(children_list),
            children=children_list,
            total_outstanding_fees=float(total_outstanding),
            recent_notices=cls._get_recent_notices(db, current_user, limit=5),
        )

    @classmethod
    def _get_student_stats(cls, db: Session, current_user: User) -> StudentDashboardStats:
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        attendance_percentage = 0.0
        fee_balance = 0.0
        today_periods = []
        recent_exam_score = None

        if student:
            # Attendance
            att_data = AttendanceService.get_student_attendance_history(db, student.id)
            attendance_percentage = float(att_data.get("attendance_percentage", 0.0))

            # Outstanding fees
            invoices = (
                db.query(Invoice)
                .filter(
                    Invoice.student_id == student.id,
                    Invoice.status.in_([InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE]),
                )
                .all()
            )
            fee_balance = float(sum((i.balance_amount for i in invoices), Decimal("0.00")))

            # Timetable for today
            enrollment = (
                db.query(EnrollmentHistory)
                .filter(EnrollmentHistory.student_id == student.id, EnrollmentHistory.status == EnrollmentStatus.ENROLLED)
                .order_by(EnrollmentHistory.enrolled_at.desc())
                .first()
            )
            if enrollment:
                day_name = date.today().strftime("%A").upper()
                try:
                    curr_day_enum = DayOfWeek(day_name)
                except ValueError:
                    curr_day_enum = DayOfWeek.MONDAY

                periods = (
                    db.query(ClassTimetable)
                    .filter(
                        ClassTimetable.class_id == enrollment.class_id,
                        ClassTimetable.section_id == enrollment.section_id,
                        ClassTimetable.day_of_week == curr_day_enum,
                    )
                    .order_by(ClassTimetable.period_number)
                    .all()
                )
                today_periods = [
                    {
                        "period_number": p.period_number,
                        "start_time": str(p.start_time)[:5],
                        "end_time": str(p.end_time)[:5],
                        "subject_name": p.subject.name if p.subject else "Subject",
                        "teacher_name": p.teacher.full_name if p.teacher else "Teacher",
                        "room_number": p.room_number or "Classroom",
                    }
                    for p in periods
                ]

            # Latest exam score
            latest_mark = (
                db.query(StudentMark)
                .filter(StudentMark.student_id == student.id)
                .order_by(StudentMark.created_at.desc())
                .first()
            )
            if latest_mark and latest_mark.exam_schedule and latest_mark.exam_schedule.exam:
                recent_exam_score = f"{latest_mark.exam_schedule.exam.name} ({latest_mark.marks_obtained}/{latest_mark.exam_schedule.max_marks})"

        return StudentDashboardStats(
            role=RoleEnum.STUDENT,
            attendance_percentage=attendance_percentage,
            today_periods=today_periods,
            fee_balance=fee_balance,
            recent_exam_score=recent_exam_score,
            recent_notices=cls._get_recent_notices(db, current_user, limit=5),
        )
