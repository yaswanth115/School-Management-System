from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from app.models.academic_year import AcademicYear
from app.models.academic import SchoolClass, Section, Subject, ClassSubject, TeacherAssignment
from app.schemas.academics import (
    AcademicYearCreate,
    AcademicYearUpdate,
    SchoolClassCreate,
    SchoolClassUpdate,
    SectionCreate,
    SubjectCreate,
    SubjectUpdate,
    TeacherAssignmentCreate,
)


class AcademicService:
    # --- Academic Years ---
    @staticmethod
    def get_current_year(db: Session) -> Optional[AcademicYear]:
        return db.query(AcademicYear).filter(AcademicYear.is_current == True).first()

    @staticmethod
    def list_years(db: Session) -> List[AcademicYear]:
        return db.query(AcademicYear).order_by(desc(AcademicYear.start_date)).all()

    @staticmethod
    def create_year(db: Session, year_in: AcademicYearCreate) -> AcademicYear:
        if year_in.is_current:
            db.query(AcademicYear).update({AcademicYear.is_current: False})

        year = AcademicYear(
            name=year_in.name.strip(),
            start_date=year_in.start_date,
            end_date=year_in.end_date,
            is_current=year_in.is_current,
        )
        db.add(year)
        db.commit()
        db.refresh(year)
        return year

    @staticmethod
    def set_current_year(db: Session, year_id: UUID) -> Optional[AcademicYear]:
        year = db.query(AcademicYear).filter(AcademicYear.id == year_id).first()
        if not year:
            return None

        db.query(AcademicYear).update({AcademicYear.is_current: False})
        year.is_current = True
        db.commit()
        db.refresh(year)
        return year

    # --- Classes & Sections ---
    @staticmethod
    def list_classes(db: Session) -> List[SchoolClass]:
        return (
            db.query(SchoolClass)
            .options(joinedload(SchoolClass.sections))
            .order_by(SchoolClass.numeric_order)
            .all()
        )

    @staticmethod
    def get_class(db: Session, class_id: UUID) -> Optional[SchoolClass]:
        return (
            db.query(SchoolClass)
            .options(joinedload(SchoolClass.sections))
            .filter(SchoolClass.id == class_id)
            .first()
        )

    @staticmethod
    def create_class(db: Session, class_in: SchoolClassCreate) -> SchoolClass:
        school_class = SchoolClass(
            name=class_in.name.strip(),
            numeric_order=class_in.numeric_order,
            description=class_in.description.strip() if class_in.description else None,
        )
        db.add(school_class)
        db.flush()

        sections_to_add = class_in.initial_sections or ["Section A"]
        for sec_name in sections_to_add:
            section = Section(class_id=school_class.id, name=sec_name.strip())
            db.add(section)

        db.commit()
        db.refresh(school_class)
        return school_class

    @staticmethod
    def create_section(db: Session, class_id: UUID, section_in: SectionCreate) -> Section:
        section = Section(
            class_id=class_id,
            name=section_in.name.strip(),
            room_number=section_in.room_number.strip() if section_in.room_number else None,
            capacity=section_in.capacity,
        )
        db.add(section)
        db.commit()
        db.refresh(section)
        return section

    # --- Subjects ---
    @staticmethod
    def list_subjects(db: Session) -> List[Subject]:
        return db.query(Subject).order_by(Subject.name).all()

    @staticmethod
    def create_subject(db: Session, sub_in: SubjectCreate) -> Subject:
        subject = Subject(
            name=sub_in.name.strip(),
            code=sub_in.code.upper().strip(),
            subject_type=sub_in.subject_type.strip(),
            description=sub_in.description.strip() if sub_in.description else None,
        )
        db.add(subject)
        db.commit()
        db.refresh(subject)
        return subject

    @staticmethod
    def assign_subjects_to_class(db: Session, class_id: UUID, subject_ids: List[UUID]) -> List[ClassSubject]:
        db.query(ClassSubject).filter(ClassSubject.class_id == class_id).delete()
        created = []
        for sid in subject_ids:
            cs = ClassSubject(class_id=class_id, subject_id=sid)
            db.add(cs)
            created.append(cs)
        db.commit()
        return created

    @staticmethod
    def get_class_subjects(db: Session, class_id: UUID) -> List[Subject]:
        return (
            db.query(Subject)
            .join(ClassSubject, ClassSubject.subject_id == Subject.id)
            .filter(ClassSubject.class_id == class_id)
            .all()
        )

    # --- Teacher Assignments ---
    @staticmethod
    def assign_teacher(db: Session, assign_in: TeacherAssignmentCreate) -> TeacherAssignment:
        assignment = TeacherAssignment(
            teacher_id=assign_in.teacher_id,
            class_id=assign_in.class_id,
            section_id=assign_in.section_id,
            subject_id=assign_in.subject_id,
            academic_year_id=assign_in.academic_year_id,
        )
        db.add(assignment)
        db.commit()
        db.refresh(assignment)
        return assignment

    @staticmethod
    def list_assignments(
        db: Session,
        academic_year_id: Optional[UUID] = None,
        teacher_id: Optional[UUID] = None,
        class_id: Optional[UUID] = None,
    ) -> List[TeacherAssignment]:
        query = db.query(TeacherAssignment).options(
            joinedload(TeacherAssignment.teacher),
            joinedload(TeacherAssignment.school_class),
            joinedload(TeacherAssignment.section),
            joinedload(TeacherAssignment.subject),
            joinedload(TeacherAssignment.academic_year),
        )
        if academic_year_id:
            query = query.filter(TeacherAssignment.academic_year_id == academic_year_id)
        if teacher_id:
            query = query.filter(TeacherAssignment.teacher_id == teacher_id)
        if class_id:
            query = query.filter(TeacherAssignment.class_id == class_id)
        return query.all()
