import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List, Optional, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status

from app.models.user import User
from app.models.role import RoleEnum
from app.models.academic_year import AcademicYear
from app.models.academic import SchoolClass, Section, Subject
from app.models.student import Student, Guardian, StudentGuardian, EnrollmentHistory, EnrollmentStatus
from app.models.fee import Invoice, Payment, InvoiceStatus, PaymentMethod
from app.models.timetable import ClassTimetable, DayOfWeek
from app.models.examination import Exam
from app.schemas.portal import (
    ChildSummaryResponse,
    TimetablePeriodResponse,
    ClassWeeklyTimetableResponse,
    OnlinePaymentSimulationRequest,
    OnlinePaymentSimulationResponse,
    GuardianProfileItem,
    StudentAcademicProfileResponse,
)
from app.schemas.fee import PaymentCreate
from app.services.fee_service import FeeService
from app.services.attendance_service import AttendanceService
from app.services.examination_service import ExaminationService


class PortalService:

    @staticmethod
    def get_parent_children(db: Session, parent_user: User) -> List[ChildSummaryResponse]:
        """
        Retrieve all children linked to the authenticated guardian with live academic indicators.
        """
        guardian = db.query(Guardian).filter(Guardian.user_id == parent_user.id).first()
        if not guardian:
            return []

        links = (
            db.query(StudentGuardian, Student)
            .join(Student, Student.id == StudentGuardian.student_id)
            .filter(StudentGuardian.guardian_id == guardian.id)
            .all()
        )

        curr_year = db.query(AcademicYear).filter(AcademicYear.is_current == True).first()
        if not curr_year:
            curr_year = db.query(AcademicYear).order_by(AcademicYear.start_date.desc()).first()

        results: List[ChildSummaryResponse] = []

        for sg, st in links:
            # Current enrollment
            enrollment = (
                db.query(EnrollmentHistory)
                .filter(
                    EnrollmentHistory.student_id == st.id,
                    EnrollmentHistory.status == EnrollmentStatus.ENROLLED,
                )
                .order_by(EnrollmentHistory.enrolled_at.desc())
                .first()
            )

            class_id = enrollment.class_id if enrollment else uuid.UUID("00000000-0000-0000-0000-000000000000")
            class_name = enrollment.school_class.name if enrollment and enrollment.school_class else "Unassigned"
            section_id = enrollment.section_id if enrollment else uuid.UUID("00000000-0000-0000-0000-000000000000")
            section_name = enrollment.section.name if enrollment and enrollment.section else "Unassigned"
            roll_number = enrollment.roll_number if enrollment else None

            # Calculate attendance percentage
            att_data = AttendanceService.get_student_attendance_history(db, st.id)
            att_percentage = att_data["attendance_percentage"]

            # Calculate outstanding fees balance
            invoices = (
                db.query(Invoice)
                .filter(
                    Invoice.student_id == st.id,
                    Invoice.status.in_([InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE]),
                )
                .all()
            )
            outstanding_fee = sum((inv.balance_amount for inv in invoices), Decimal("0.00"))

            results.append(
                ChildSummaryResponse(
                    student_id=st.id,
                    admission_number=st.admission_number,
                    full_name=st.full_name,
                    first_name=st.first_name,
                    last_name=st.last_name,
                    class_id=class_id,
                    class_name=class_name,
                    section_id=section_id,
                    section_name=section_name,
                    roll_number=roll_number,
                    photo_url=st.photo_url,
                    attendance_percentage=att_percentage,
                    outstanding_fee_amount=outstanding_fee,
                    is_primary_guardian=sg.is_primary,
                )
            )

        return results

    @staticmethod
    def verify_parent_child_access(db: Session, parent_user: User, student_id: UUID) -> Student:
        """
        Enforce server-side IDOR security: verify parent is genuinely linked to the student.
        """
        guardian = db.query(Guardian).filter(Guardian.user_id == parent_user.id).first()
        if not guardian:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Guardian profile not found for this user account.",
            )

        link = (
            db.query(StudentGuardian)
            .filter(
                StudentGuardian.guardian_id == guardian.id,
                StudentGuardian.student_id == student_id,
            )
            .first()
        )
        if not link:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. This student is not linked to your guardian account.",
            )

        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student record not found.",
            )
        return student

    @staticmethod
    def get_child_attendance(
        db: Session,
        student_id: UUID,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        """
        Retrieve attendance history and percentage for a child.
        """
        return AttendanceService.get_student_attendance_history(
            db, student_id=student_id, start_date=start_date, end_date=end_date
        )

    @staticmethod
    def get_child_report_card(db: Session, student_id: UUID, exam_id: UUID):
        """
        Retrieve terminal report card with class rank for a child.
        """
        return ExaminationService.generate_student_report_card(
            db, exam_id=exam_id, student_id=student_id
        )

    @staticmethod
    def get_child_invoices(db: Session, student_id: UUID) -> Dict[str, Any]:
        """
        Retrieve all fee invoices and payment vouchers for a child.
        """
        invoices = (
            db.query(Invoice)
            .filter(Invoice.student_id == student_id)
            .order_by(Invoice.created_at.desc())
            .all()
        )

        total_invoiced = sum((inv.total_amount for inv in invoices), Decimal("0.00"))
        total_paid = sum((inv.paid_amount for inv in invoices), Decimal("0.00"))
        total_outstanding = sum((inv.balance_amount for inv in invoices if inv.status != InvoiceStatus.CANCELLED), Decimal("0.00"))

        invoice_list = [
            {
                "id": str(inv.id),
                "invoice_number": inv.invoice_number,
                "title": inv.title,
                "total_amount": float(inv.total_amount),
                "paid_amount": float(inv.paid_amount),
                "balance_amount": float(inv.balance_amount),
                "status": inv.status,
                "issue_date": str(inv.issue_date),
                "due_date": str(inv.due_date),
                "items": [
                    {
                        "fee_type_name": item.fee_type.name if item.fee_type else "Fee Item",
                        "amount": float(item.amount),
                    }
                    for item in inv.items
                ],
                "payments": [
                    {
                        "receipt_number": p.receipt_number,
                        "amount": float(p.amount),
                        "payment_method": p.payment_method,
                        "payment_date": str(p.payment_date),
                        "status": p.status,
                    }
                    for p in inv.payments
                ],
            }
            for inv in invoices
        ]

        return {
            "student_id": str(student_id),
            "total_invoiced": float(total_invoiced),
            "total_paid": float(total_paid),
            "total_outstanding": float(total_outstanding),
            "invoices": invoice_list,
        }

    @staticmethod
    def simulate_online_payment(
        db: Session,
        student_id: UUID,
        req: OnlinePaymentSimulationRequest,
        parent_user: User,
    ) -> OnlinePaymentSimulationResponse:
        """
        Process simulated real-time online fee payment (UPI, Credit Card, Net Banking).
        Updates invoice balance and issues unique official receipt voucher.
        """
        invoice = db.query(Invoice).filter(Invoice.id == req.invoice_id, Invoice.student_id == student_id).first()
        if not invoice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Fee invoice not found for this student.",
            )

        if invoice.status == InvoiceStatus.PAID:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This invoice has already been fully paid.",
            )

        if req.amount > invoice.balance_amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Payment amount of INR {req.amount} exceeds invoice balance of INR {invoice.balance_amount}.",
            )

        sim_txn_ref = req.transaction_reference or f"PAY-SIM-{uuid.uuid4().hex[:10].upper()}"

        payment_create = PaymentCreate(
            invoice_id=invoice.id,
            amount=req.amount,
            payment_method=req.payment_method,
            transaction_reference=sim_txn_ref,
            notes=f"Online payment via {req.gateway_provider} by {parent_user.full_name}",
        )

        payment = FeeService.collect_payment(db, payment_create, collected_by_id=parent_user.id)

        # Reload updated invoice
        db.refresh(invoice)

        return OnlinePaymentSimulationResponse(
            payment_id=payment.id,
            receipt_number=payment.receipt_number,
            invoice_id=invoice.id,
            invoice_number=invoice.invoice_number,
            amount_paid=payment.amount,
            remaining_balance=invoice.balance_amount,
            invoice_status=invoice.status,
            transaction_reference=payment.transaction_reference or sim_txn_ref,
            payment_date=payment.payment_date,
        )

    @staticmethod
    def get_student_portal_profile(db: Session, student_user: User) -> StudentAcademicProfileResponse:
        """
        Retrieve personal student profile, active enrollment, guardian contact, and fee status.
        """
        student = db.query(Student).filter(Student.user_id == student_user.id).first()
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student profile not found for authenticated user.",
            )

        enrollment = (
            db.query(EnrollmentHistory)
            .filter(
                EnrollmentHistory.student_id == student.id,
                EnrollmentHistory.status == EnrollmentStatus.ENROLLED,
            )
            .order_by(EnrollmentHistory.enrolled_at.desc())
            .first()
        )

        class_name = enrollment.school_class.name if enrollment and enrollment.school_class else "Unassigned"
        section_name = enrollment.section.name if enrollment and enrollment.section else "Unassigned"
        academic_year_name = enrollment.academic_year.name if enrollment and enrollment.academic_year else "Current"
        roll_number = enrollment.roll_number if enrollment else None

        # Attendance calculation
        att_data = AttendanceService.get_student_attendance_history(db, student.id)
        att_percentage = att_data["attendance_percentage"]

        # Outstanding fees calculation
        invoices = (
            db.query(Invoice)
            .filter(
                Invoice.student_id == student.id,
                Invoice.status.in_([InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE]),
            )
            .all()
        )
        outstanding_fee = sum((inv.balance_amount for inv in invoices), Decimal("0.00"))

        # Guardians
        guardians_list: List[GuardianProfileItem] = []
        for sg in student.guardians:
            g = sg.guardian
            if g:
                guardians_list.append(
                    GuardianProfileItem(
                        id=g.id,
                        full_name=g.full_name,
                        relationship_type=g.relationship_type,
                        email=g.email,
                        phone=g.phone,
                        occupation=g.occupation,
                        is_primary=sg.is_primary,
                    )
                )

        return StudentAcademicProfileResponse(
            student_id=student.id,
            admission_number=student.admission_number,
            full_name=student.full_name,
            first_name=student.first_name,
            last_name=student.last_name,
            date_of_birth=student.date_of_birth,
            gender=student.gender,
            blood_group=student.blood_group,
            admission_date=student.admission_date,
            photo_url=student.photo_url,
            class_name=class_name,
            section_name=section_name,
            roll_number=roll_number,
            academic_year_name=academic_year_name,
            guardians=guardians_list,
            attendance_percentage=att_percentage,
            outstanding_fee_amount=outstanding_fee,
        )

    @staticmethod
    def get_class_timetable(
        db: Session,
        class_id: UUID,
        section_id: UUID,
    ) -> ClassWeeklyTimetableResponse:
        """
        Retrieve weekly period-by-period class timetable.
        """
        school_class = db.query(SchoolClass).filter(SchoolClass.id == class_id).first()
        if not school_class:
            raise HTTPException(status_code=404, detail="Class not found.")
        section = db.query(Section).filter(Section.id == section_id).first()
        if not section:
            raise HTTPException(status_code=404, detail="Section not found.")

        curr_year = db.query(AcademicYear).filter(AcademicYear.is_current == True).first()
        if not curr_year:
            curr_year = db.query(AcademicYear).order_by(AcademicYear.start_date.desc()).first()

        periods = (
            db.query(ClassTimetable)
            .filter(
                ClassTimetable.class_id == class_id,
                ClassTimetable.section_id == section_id,
            )
            .order_by(ClassTimetable.day_of_week, ClassTimetable.period_number)
            .all()
        )

        period_responses = [
            TimetablePeriodResponse(
                id=p.id,
                day_of_week=p.day_of_week,
                period_number=p.period_number,
                start_time=p.start_time,
                end_time=p.end_time,
                subject_id=p.subject_id,
                subject_name=p.subject.name if p.subject else "Subject",
                subject_code=p.subject.code if p.subject else "",
                teacher_name=p.teacher.full_name if p.teacher else "Instructor",
                room_number=p.room_number,
            )
            for p in periods
        ]

        return ClassWeeklyTimetableResponse(
            class_id=class_id,
            class_name=school_class.name,
            section_id=section_id,
            section_name=section.name,
            academic_year_name=curr_year.name if curr_year else "2026-2027",
            periods=period_responses,
        )
