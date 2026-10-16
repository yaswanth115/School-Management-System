from datetime import date
from typing import List, Optional, Dict, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.role import RoleEnum
from app.models.user import User
from app.models.student import EnrollmentHistory, EnrollmentStatus
from app.schemas.portal import (
    ChildSummaryResponse,
    ClassWeeklyTimetableResponse,
    OnlinePaymentSimulationRequest,
    OnlinePaymentSimulationResponse,
)
from app.schemas.examination import StudentReportCardResponse
from app.services.portal_service import PortalService
from app.services.audit_service import AuditService

router = APIRouter(prefix="/parent", tags=["Parent Portal"])


@router.get("/children", response_model=List[ChildSummaryResponse])
def get_parent_children(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.PARENT, RoleEnum.ADMIN)),
):
    """
    Retrieve all linked children for the authenticated parent with attendance % and fee balances.
    Supports multi-child switching.
    """
    return PortalService.get_parent_children(db, current_user)


@router.get("/children/{student_id}/profile")
def get_child_profile(
    student_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.PARENT, RoleEnum.ADMIN)),
):
    """
    Retrieve full academic and enrollment profile for a linked child.
    Enforces server-side IDOR authorization check.
    """
    if current_user.role != RoleEnum.ADMIN:
        student = PortalService.verify_parent_child_access(db, current_user, student_id)
    else:
        from app.models.student import Student
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found.")

    att_data = PortalService.get_child_attendance(db, student_id)
    invoices_data = PortalService.get_child_invoices(db, student_id)

    enrollment = (
        db.query(EnrollmentHistory)
        .filter(EnrollmentHistory.student_id == student_id, EnrollmentHistory.status == EnrollmentStatus.ENROLLED)
        .order_by(EnrollmentHistory.enrolled_at.desc())
        .first()
    )

    return {
        "student_id": str(student.id),
        "admission_number": student.admission_number,
        "full_name": student.full_name,
        "first_name": student.first_name,
        "last_name": student.last_name,
        "date_of_birth": str(student.date_of_birth),
        "gender": student.gender,
        "blood_group": student.blood_group,
        "admission_date": str(student.admission_date),
        "photo_url": student.photo_url,
        "class_id": str(enrollment.class_id) if enrollment else None,
        "class_name": enrollment.school_class.name if enrollment and enrollment.school_class else "Unassigned",
        "section_id": str(enrollment.section_id) if enrollment else None,
        "section_name": enrollment.section.name if enrollment and enrollment.section else "Unassigned",
        "roll_number": enrollment.roll_number if enrollment else None,
        "attendance": att_data,
        "fees": invoices_data,
    }


@router.get("/children/{student_id}/attendance")
def get_child_attendance(
    student_id: UUID,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.PARENT, RoleEnum.ADMIN)),
):
    """
    Retrieve real-time attendance records and percentage for a linked child.
    """
    if current_user.role != RoleEnum.ADMIN:
        PortalService.verify_parent_child_access(db, current_user, student_id)

    return PortalService.get_child_attendance(db, student_id)


@router.get("/children/{student_id}/report-cards/{exam_id}", response_model=StudentReportCardResponse)
def get_child_report_card(
    student_id: UUID,
    exam_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.PARENT, RoleEnum.ADMIN)),
):
    """
    Retrieve official terminal examination report card with class rank for a linked child.
    """
    if current_user.role != RoleEnum.ADMIN:
        PortalService.verify_parent_child_access(db, current_user, student_id)

    return PortalService.get_child_report_card(db, student_id, exam_id)


@router.get("/children/{student_id}/invoices")
def get_child_invoices(
    student_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.PARENT, RoleEnum.ADMIN)),
):
    """
    Retrieve fee invoices, payment receipts, and balance summary for a linked child.
    """
    if current_user.role != RoleEnum.ADMIN:
        PortalService.verify_parent_child_access(db, current_user, student_id)

    return PortalService.get_child_invoices(db, student_id)


@router.post("/children/{student_id}/invoices/{invoice_id}/pay", response_model=OnlinePaymentSimulationResponse)
def pay_child_invoice_online(
    student_id: UUID,
    invoice_id: UUID,
    req: OnlinePaymentSimulationRequest,
    http_req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.PARENT, RoleEnum.ADMIN)),
):
    """
    Simulate real-time online fee payment (UPI, Credit Card, Net Banking).
    Verifies child link, updates invoice balance, and issues an official receipt.
    """
    if current_user.role != RoleEnum.ADMIN:
        PortalService.verify_parent_child_access(db, current_user, student_id)

    if req.invoice_id != invoice_id:
        req.invoice_id = invoice_id

    result = PortalService.simulate_online_payment(db, student_id, req, current_user)

    AuditService.log_event(
        db,
        action="ONLINE_FEE_PAYMENT",
        resource_type="Payment",
        user_id=current_user.id,
        resource_id=str(result.payment_id),
        details={
            "invoice_number": result.invoice_number,
            "receipt_number": result.receipt_number,
            "amount": float(result.amount_paid),
            "method": req.payment_method,
        },
        ip_address=http_req.client.host if http_req.client else None,
    )

    return result


@router.get("/children/{student_id}/timetable", response_model=ClassWeeklyTimetableResponse)
def get_child_timetable(
    student_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.PARENT, RoleEnum.ADMIN)),
):
    """
    Retrieve weekly period-by-period class timetable for a linked child.
    """
    if current_user.role != RoleEnum.ADMIN:
        PortalService.verify_parent_child_access(db, current_user, student_id)

    enrollment = (
        db.query(EnrollmentHistory)
        .filter(EnrollmentHistory.student_id == student_id, EnrollmentHistory.status == EnrollmentStatus.ENROLLED)
        .order_by(EnrollmentHistory.enrolled_at.desc())
        .first()
    )
    if not enrollment:
        raise HTTPException(status_code=404, detail="Active enrollment not found for this child.")

    return PortalService.get_class_timetable(db, enrollment.class_id, enrollment.section_id)
