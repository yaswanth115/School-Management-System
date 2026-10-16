from typing import List, Optional
from uuid import UUID
import math
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.role import RoleEnum
from app.models.user import User
from app.models.student import StudentStatus
from app.schemas.common import PaginatedResponse
from app.schemas.student import (
    StudentAdmissionRequest,
    StudentUpdate,
    StudentResponse,
    StudentDetailResponse,
    GuardianResponse,
    EnrollmentResponse,
    StudentPromotionRequest,
    StudentStatusUpdateRequest,
    BulkStudentImportRequest,
)
from app.services.student_service import StudentService

router = APIRouter(prefix="/students", tags=["Students"])


@router.get("", response_model=PaginatedResponse[StudentResponse])
def list_students(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    academic_year_id: Optional[UUID] = Query(None),
    class_id: Optional[UUID] = Query(None),
    section_id: Optional[UUID] = Query(None),
    status: Optional[StudentStatus] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.PRINCIPAL, RoleEnum.ACCOUNTANT, RoleEnum.TEACHER)),
):
    """List students with multi-filter search and pagination."""
    skip = (page - 1) * page_size
    items, total = StudentService.list_students(
        db,
        skip=skip,
        limit=page_size,
        academic_year_id=academic_year_id,
        class_id=class_id,
        section_id=section_id,
        status=status,
        search=search,
    )
    total_pages = math.ceil(total / page_size) if total > 0 else 0
    return PaginatedResponse[StudentResponse](
        items=[StudentResponse(**item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post("/admission", response_model=StudentDetailResponse, status_code=status.HTTP_201_CREATED)
def admit_student(
    req: StudentAdmissionRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleEnum.ADMIN)),
):
    """Admit a new student with primary guardian and initial enrollment in one atomic transaction."""
    try:
        student = StudentService.admit_student(db, req)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

    detailed = StudentService.get_student_detail(db, student.id)
    return _build_student_detail_response(detailed)


@router.get("/next-admission-number")
def get_next_admission_number(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Preview next generated admission number."""
    return {"next_admission_number": StudentService.generate_admission_number(db)}


@router.get("/{student_id}", response_model=StudentDetailResponse)
def get_student(
    student_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Retrieve complete student profile with guardians and enrollment history."""
    student = StudentService.get_student_detail(db, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return _build_student_detail_response(student)


@router.put("/{student_id}", response_model=StudentResponse)
def update_student(
    student_id: UUID,
    update_in: StudentUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleEnum.ADMIN)),
):
    """Update student biographical information."""
    student = db.query(StudentService.get_student_detail(db, student_id))
    student_obj = StudentService.get_student_detail(db, student_id)
    if not student_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    updated = StudentService.update_student(db, student_obj, update_in)
    return StudentResponse(
        id=updated.id,
        admission_number=updated.admission_number,
        first_name=updated.first_name,
        last_name=updated.last_name,
        full_name=updated.full_name,
        date_of_birth=updated.date_of_birth,
        gender=updated.gender,
        blood_group=updated.blood_group,
        admission_date=updated.admission_date,
        status=updated.status,
        photo_url=updated.photo_url,
    )


@router.post("/{student_id}/promote", response_model=EnrollmentResponse)
def promote_student(
    student_id: UUID,
    promo: StudentPromotionRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.PRINCIPAL)),
):
    """Promote student to the next academic session or grade level."""
    try:
        new_enroll = StudentService.promote_student(db, student_id, promo)
        return EnrollmentResponse(
            id=new_enroll.id,
            academic_year_id=new_enroll.academic_year_id,
            class_id=new_enroll.class_id,
            section_id=new_enroll.section_id,
            roll_number=new_enroll.roll_number,
            status=new_enroll.status,
            enrolled_at=new_enroll.enrolled_at,
            remarks=new_enroll.remarks,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{student_id}/status")
def update_student_status(
    student_id: UUID,
    status_in: StudentStatusUpdateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleEnum.ADMIN)),
):
    """Transfer or withdraw student with formal reason."""
    try:
        StudentService.update_student_status(db, student_id, status_in)
        return {"message": f"Student status updated to {status_in.status.value}"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/bulk-import")
def bulk_import_students(
    req: BulkStudentImportRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleEnum.ADMIN)),
):
    """Bulk import multiple students with guardians into a class and section."""
    return StudentService.bulk_import(db, req)


def _build_student_detail_response(student) -> StudentDetailResponse:
    latest_enroll = student.enrollment_history[0] if student.enrollment_history else None
    primary_g = next((g.guardian for g in student.guardians if g.is_primary), None)
    if not primary_g and student.guardians:
        primary_g = student.guardians[0].guardian

    return StudentDetailResponse(
        id=student.id,
        admission_number=student.admission_number,
        first_name=student.first_name,
        last_name=student.last_name,
        full_name=student.full_name,
        date_of_birth=student.date_of_birth,
        gender=student.gender,
        blood_group=student.blood_group,
        admission_date=student.admission_date,
        address=student.address,
        city=student.city,
        state=student.state,
        postal_code=student.postal_code,
        emergency_contact=student.emergency_contact,
        status=student.status,
        photo_url=student.photo_url,
        current_class_name=latest_enroll.school_class.name if latest_enroll and latest_enroll.school_class else None,
        current_section_name=latest_enroll.section.name if latest_enroll and latest_enroll.section else None,
        current_roll_number=latest_enroll.roll_number if latest_enroll else None,
        guardian_name=primary_g.full_name if primary_g else None,
        guardian_phone=primary_g.phone if primary_g else None,
        guardians=[
            GuardianResponse(
                id=sg.guardian.id,
                full_name=sg.guardian.full_name,
                relationship_type=sg.guardian.relationship_type,
                email=sg.guardian.email,
                phone=sg.guardian.phone,
                occupation=sg.guardian.occupation,
                address=sg.guardian.address,
                is_primary=sg.is_primary,
            )
            for sg in student.guardians
        ],
        enrollment_history=[
            EnrollmentResponse(
                id=eh.id,
                academic_year_id=eh.academic_year_id,
                academic_year_name=eh.academic_year.name if eh.academic_year else None,
                class_id=eh.class_id,
                class_name=eh.school_class.name if eh.school_class else None,
                section_id=eh.section_id,
                section_name=eh.section.name if eh.section else None,
                roll_number=eh.roll_number,
                status=eh.status,
                enrolled_at=eh.enrolled_at,
                remarks=eh.remarks,
            )
            for eh in student.enrollment_history
        ],
    )
