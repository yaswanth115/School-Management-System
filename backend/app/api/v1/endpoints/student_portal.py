from datetime import date
from typing import Optional, Dict, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.role import RoleEnum
from app.models.user import User
from app.models.student import Student, EnrollmentHistory, EnrollmentStatus
from app.schemas.portal import (
    StudentAcademicProfileResponse,
    ClassWeeklyTimetableResponse,
)
from app.schemas.examination import StudentReportCardResponse
from app.services.portal_service import PortalService
from app.services.attendance_service import AttendanceService
from app.services.examination_service import ExaminationService

router = APIRouter(prefix="/student", tags=["Student Portal"])


def _get_current_student(db: Session, current_user: User) -> Student:
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found for this user account.",
        )
    return student


@router.get("/profile", response_model=StudentAcademicProfileResponse)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.STUDENT, RoleEnum.ADMIN)),
):
    """
    Retrieve authenticated student's personal academic record, current class, and fee balance.
    """
    return PortalService.get_student_portal_profile(db, current_user)


@router.get("/attendance")
def get_my_attendance(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.STUDENT, RoleEnum.ADMIN)),
):
    """
    Retrieve personal attendance history and overall attendance percentage.
    """
    student = _get_current_student(db, current_user)
    return AttendanceService.get_student_attendance_history(
        db,
        student_id=student.id,
        start_date=start_date,
        end_date=end_date,
    )


@router.get("/timetable", response_model=ClassWeeklyTimetableResponse)
def get_my_timetable(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.STUDENT, RoleEnum.ADMIN)),
):
    """
    Retrieve weekly schedule timetable for the student's enrolled class and section.
    """
    student = _get_current_student(db, current_user)
    enrollment = (
        db.query(EnrollmentHistory)
        .filter(EnrollmentHistory.student_id == student.id, EnrollmentHistory.status == EnrollmentStatus.ENROLLED)
        .order_by(EnrollmentHistory.enrolled_at.desc())
        .first()
    )
    if not enrollment:
        raise HTTPException(status_code=404, detail="Active class enrollment not found.")

    return PortalService.get_class_timetable(db, enrollment.class_id, enrollment.section_id)


@router.get("/report-cards/{exam_id}", response_model=StudentReportCardResponse)
def get_my_report_card(
    exam_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.STUDENT, RoleEnum.ADMIN)),
):
    """
    Retrieve terminal examination report card with class rank for the authenticated student.
    """
    student = _get_current_student(db, current_user)
    return ExaminationService.generate_student_report_card(db, exam_id=exam_id, student_id=student.id)


@router.get("/invoices")
def get_my_invoices(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.STUDENT, RoleEnum.ADMIN)),
):
    """
    Retrieve personal fee invoices, payment receipts, and balance summary.
    """
    student = _get_current_student(db, current_user)
    return PortalService.get_child_invoices(db, student.id)
