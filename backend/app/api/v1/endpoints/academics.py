from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.role import RoleEnum
from app.models.user import User
from app.schemas.academics import (
    AcademicYearCreate,
    AcademicYearResponse,
    SchoolClassCreate,
    SchoolClassResponse,
    SectionCreate,
    SectionResponse,
    SubjectCreate,
    SubjectResponse,
    ClassSubjectAssignRequest,
    TeacherAssignmentCreate,
    TeacherAssignmentResponse,
)
from app.services.academic_service import AcademicService

router = APIRouter(prefix="/academics", tags=["Academics"])


# --- Academic Years ---
@router.get("/years", response_model=List[AcademicYearResponse])
def get_academic_years(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Retrieve all academic year sessions."""
    return AcademicService.list_years(db)


@router.post("/years", response_model=AcademicYearResponse, status_code=status.HTTP_201_CREATED)
def create_academic_year(
    year_in: AcademicYearCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleEnum.ADMIN)),
):
    """Create a new academic year session (Admin only)."""
    return AcademicService.create_year(db, year_in)


@router.post("/years/{year_id}/current", response_model=AcademicYearResponse)
def set_current_academic_year(
    year_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleEnum.ADMIN)),
):
    """Set the specified academic year as the active/current school session."""
    year = AcademicService.set_current_year(db, year_id)
    if not year:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Academic year not found")
    return year


# --- Classes & Sections ---
@router.get("/classes", response_model=List[SchoolClassResponse])
def get_classes(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """List all school classes and their configured sections."""
    return AcademicService.list_classes(db)


@router.post("/classes", response_model=SchoolClassResponse, status_code=status.HTTP_201_CREATED)
def create_class(
    class_in: SchoolClassCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleEnum.ADMIN)),
):
    """Create a new grade class and initialize default sections (Admin only)."""
    return AcademicService.create_class(db, class_in)


@router.post("/classes/{class_id}/sections", response_model=SectionResponse, status_code=status.HTTP_201_CREATED)
def add_section(
    class_id: UUID,
    section_in: SectionCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleEnum.ADMIN)),
):
    """Add a new section to an existing class (Admin only)."""
    school_class = AcademicService.get_class(db, class_id)
    if not school_class:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    return AcademicService.create_section(db, class_id, section_in)


@router.get("/sections", response_model=List[SectionResponse])
def get_sections(
    class_id: Optional[UUID] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Retrieve sections, optionally filtered by class_id."""
    return AcademicService.list_sections(db, class_id=class_id)


@router.get("/classes/{class_id}/sections", response_model=List[SectionResponse])
def get_class_sections(
    class_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Retrieve sections belonging to a specific class."""
    return AcademicService.list_sections(db, class_id=class_id)


# --- Subjects ---
@router.get("/subjects", response_model=List[SubjectResponse])
def get_subjects(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """List all subjects in curriculum."""
    return AcademicService.list_subjects(db)


@router.post("/subjects", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
def create_subject(
    sub_in: SubjectCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleEnum.ADMIN)),
):
    """Define a new curriculum subject (Admin only)."""
    return AcademicService.create_subject(db, sub_in)


@router.post("/classes/{class_id}/subjects", response_model=List[SubjectResponse])
def assign_subjects_to_class(
    class_id: UUID,
    req: ClassSubjectAssignRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleEnum.ADMIN)),
):
    """Assign subjects to a class grade (Admin only)."""
    AcademicService.assign_subjects_to_class(db, class_id, req.subject_ids)
    return AcademicService.get_class_subjects(db, class_id)


@router.get("/classes/{class_id}/subjects", response_model=List[SubjectResponse])
def get_class_subjects(
    class_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get subjects linked to a class."""
    return AcademicService.get_class_subjects(db, class_id)


# --- Teacher Assignments ---
@router.get("/assignments", response_model=List[TeacherAssignmentResponse])
def get_teacher_assignments(
    academic_year_id: Optional[UUID] = Query(None),
    teacher_id: Optional[UUID] = Query(None),
    class_id: Optional[UUID] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Query teacher class-subject assignments."""
    assignments = AcademicService.list_assignments(
        db,
        academic_year_id=academic_year_id,
        teacher_id=teacher_id,
        class_id=class_id,
    )
    return [
        TeacherAssignmentResponse(
            id=a.id,
            teacher_id=a.teacher_id,
            teacher_name=a.teacher.full_name if a.teacher else None,
            teacher_email=a.teacher.email if a.teacher else None,
            class_id=a.class_id,
            class_name=a.school_class.name if a.school_class else None,
            section_id=a.section_id,
            section_name=a.section.name if a.section else None,
            subject_id=a.subject_id,
            subject_name=a.subject.name if a.subject else None,
            subject_code=a.subject.code if a.subject else None,
            academic_year_id=a.academic_year_id,
            academic_year_name=a.academic_year.name if a.academic_year else None,
        )
        for a in assignments
    ]


@router.post("/assignments", response_model=TeacherAssignmentResponse, status_code=status.HTTP_201_CREATED)
def assign_teacher(
    assign_in: TeacherAssignmentCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.PRINCIPAL)),
):
    """Assign a teacher to a class, section, and subject for an academic year (Admin / Principal)."""
    assignment = AcademicService.assign_teacher(db, assign_in)
    return TeacherAssignmentResponse(
        id=assignment.id,
        teacher_id=assignment.teacher_id,
        teacher_name=assignment.teacher.full_name if assignment.teacher else None,
        teacher_email=assignment.teacher.email if assignment.teacher else None,
        class_id=assignment.class_id,
        class_name=assignment.school_class.name if assignment.school_class else None,
        section_id=assignment.section_id,
        section_name=assignment.section.name if assignment.section else None,
        subject_id=assignment.subject_id,
        subject_name=assignment.subject.name if assignment.subject else None,
        subject_code=assignment.subject.code if assignment.subject else None,
        academic_year_id=assignment.academic_year_id,
        academic_year_name=assignment.academic_year.name if assignment.academic_year else None,
    )
