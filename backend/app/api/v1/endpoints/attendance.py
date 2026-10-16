from datetime import date
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.role import RoleEnum
from app.models.user import User
from app.models.student import Student, Guardian, StudentGuardian
from app.schemas.attendance import (
    AttendanceRegisterCreate,
    AttendanceRegisterResponse,
    AttendanceCorrectionRequest,
    AttendanceRecordResponse,
    AttendanceMatrixResponse,
    SectionMonthlyAttendanceStats,
)
from app.services.attendance_service import AttendanceService
from app.services.audit_service import AuditService

router = APIRouter(prefix="/attendance", tags=["Attendance Management"])


@router.get("/register", response_model=AttendanceRegisterResponse)
def get_daily_register(
    class_id: UUID = Query(..., description="Class UUID"),
    section_id: UUID = Query(..., description="Section UUID"),
    attendance_date: Optional[date] = Query(None, description="Date (defaults to today)"),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.PRINCIPAL, RoleEnum.TEACHER)),
):
    """
    Retrieve existing daily attendance register or initialize student roster defaulting to PRESENT.
    """
    target_date = attendance_date or date.today()
    try:
        return AttendanceService.get_or_init_register(
            db,
            class_id=class_id,
            section_id=section_id,
            attendance_date=target_date,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/register", response_model=AttendanceRegisterResponse, status_code=status.HTTP_201_CREATED)
def mark_attendance_register(
    req: AttendanceRegisterCreate,
    http_req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.PRINCIPAL, RoleEnum.TEACHER)),
):
    """
    Save classroom attendance register for a section and date.
    Rejects duplicate submissions for the same section and date to prevent double-marking.
    """
    try:
        register = AttendanceService.mark_attendance(db, req, current_user)
        AuditService.log_event(
            db,
            action="ATTENDANCE_REGISTER_CREATE",
            resource_type="AttendanceRegister",
            user_id=current_user.id,
            resource_id=str(register.id),
            details={
                "class_id": str(req.class_id),
                "section_id": str(req.section_id),
                "date": str(req.attendance_date),
                "total_students": register.total_students,
                "present": register.present_count,
                "absent": register.absent_count,
            },
            ip_address=http_req.client.host if http_req.client else None,
        )
        return register
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/records/{record_id}/correct", response_model=AttendanceRecordResponse)
def correct_attendance_record(
    record_id: UUID,
    req: AttendanceCorrectionRequest,
    http_req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.PRINCIPAL, RoleEnum.TEACHER)),
):
    """
    Authorized correction of a student's recorded attendance status with mandatory audit explanation.
    """
    try:
        updated_record = AttendanceService.correct_attendance_record(db, record_id, req, current_user)
        AuditService.log_event(
            db,
            action="ATTENDANCE_RECORD_CORRECT",
            resource_type="AttendanceRecord",
            user_id=current_user.id,
            resource_id=str(record_id),
            details={
                "new_status": req.new_status,
                "reason": req.reason,
            },
            ip_address=http_req.client.host if http_req.client else None,
        )
        return updated_record
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/matrix", response_model=AttendanceMatrixResponse)
def get_monthly_attendance_matrix(
    class_id: UUID = Query(..., description="Class UUID"),
    section_id: UUID = Query(..., description="Section UUID"),
    year: Optional[int] = Query(None, description="Year (e.g. 2026)"),
    month: Optional[int] = Query(None, description="Month (1-12)"),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.PRINCIPAL, RoleEnum.TEACHER)),
):
    """
    Generate Day 1-31 monthly calendar matrix of attendance for a class and section.
    """
    today = date.today()
    target_year = year or today.year
    target_month = month or today.month

    if target_month < 1 or target_month > 12:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Month must be between 1 and 12.")

    try:
        return AttendanceService.get_section_monthly_matrix(
            db,
            class_id=class_id,
            section_id=section_id,
            year=target_year,
            month=target_month,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/monthly-stats", response_model=SectionMonthlyAttendanceStats)
def get_monthly_attendance_stats(
    class_id: UUID = Query(..., description="Class UUID"),
    section_id: UUID = Query(..., description="Section UUID"),
    year: Optional[int] = Query(None, description="Year (e.g. 2026)"),
    month: Optional[int] = Query(None, description="Month (1-12)"),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.PRINCIPAL, RoleEnum.TEACHER)),
):
    """
    Calculate section attendance percentage and flag students below the mandatory 75% criterion.
    """
    today = date.today()
    target_year = year or today.year
    target_month = month or today.month

    try:
        return AttendanceService.get_section_monthly_stats(
            db,
            class_id=class_id,
            section_id=section_id,
            year=target_year,
            month=target_month,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/students/{student_id}")
def get_student_attendance_history(
    student_id: UUID,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve historical attendance timeline and stats for an individual student.
    Enforces student/parent authorization scoping.
    """
    if current_user.role == RoleEnum.STUDENT:
        st = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not st or st.id != student_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    elif current_user.role == RoleEnum.PARENT:
        g = db.query(Guardian).filter(Guardian.user_id == current_user.id).first()
        if not g:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        sg = db.query(StudentGuardian).filter(
            StudentGuardian.guardian_id == g.id,
            StudentGuardian.student_id == student_id,
        ).first()
        if not sg:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this student's attendance records")

    try:
        return AttendanceService.get_student_attendance_history(
            db,
            student_id=student_id,
            start_date=start_date,
            end_date=end_date,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
