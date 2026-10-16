from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, desc, func

from app.models.student import (
    Student,
    Guardian,
    StudentGuardian,
    EnrollmentHistory,
    StudentStatus,
    EnrollmentStatus,
)
from app.models.academic_year import AcademicYear
from app.models.academic import SchoolClass, Section
from app.schemas.student import (
    StudentAdmissionRequest,
    StudentUpdate,
    StudentPromotionRequest,
    StudentStatusUpdateRequest,
    BulkStudentImportRequest,
)


class StudentService:
    @staticmethod
    def generate_admission_number(db: Session, year: Optional[int] = None) -> str:
        current_year = year or date.today().year
        prefix = f"ADM-{current_year}-"

        # Count existing students with this year's prefix
        count = (
            db.query(func.count(Student.id))
            .filter(Student.admission_number.like(f"{prefix}%"))
            .scalar()
            or 0
        )
        return f"{prefix}{count + 1:04d}"

    @staticmethod
    def admit_student(db: Session, req: StudentAdmissionRequest) -> Student:
        # Check or generate admission number
        adm_no = req.admission_number.strip() if req.admission_number else StudentService.generate_admission_number(db)
        existing = db.query(Student).filter(Student.admission_number == adm_no).first()
        if existing:
            raise ValueError(f"Admission number '{adm_no}' is already assigned")

        # 1. Create Student record
        student = Student(
            admission_number=adm_no,
            first_name=req.first_name.strip(),
            last_name=req.last_name.strip(),
            date_of_birth=req.date_of_birth,
            gender=req.gender,
            blood_group=req.blood_group,
            admission_date=req.admission_date,
            address=req.address.strip() if req.address else None,
            city=req.city.strip() if req.city else None,
            state=req.state.strip() if req.state else None,
            postal_code=req.postal_code.strip() if req.postal_code else None,
            emergency_contact=req.emergency_contact.strip() if req.emergency_contact else None,
            photo_url=req.photo_url,
            status=StudentStatus.ACTIVE,
        )
        db.add(student)
        db.flush()

        # 2. Create Guardian record
        g_in = req.primary_guardian
        guardian = Guardian(
            full_name=g_in.full_name.strip(),
            relationship_type=g_in.relationship_type.strip(),
            email=g_in.email.lower().strip() if g_in.email else None,
            phone=g_in.phone.strip(),
            occupation=g_in.occupation.strip() if g_in.occupation else None,
            address=g_in.address.strip() if g_in.address else req.address,
        )
        db.add(guardian)
        db.flush()

        # 3. Link Student & Guardian
        link = StudentGuardian(
            student_id=student.id,
            guardian_id=guardian.id,
            is_primary=True,
        )
        db.add(link)

        # 4. Create Initial Enrollment Record
        enrollment = EnrollmentHistory(
            student_id=student.id,
            academic_year_id=req.academic_year_id,
            class_id=req.class_id,
            section_id=req.section_id,
            roll_number=req.roll_number.strip() if req.roll_number else None,
            status=EnrollmentStatus.ENROLLED,
            enrolled_at=datetime.now(timezone.utc),
            remarks="Initial admission enrollment",
        )
        db.add(enrollment)

        db.commit()
        db.refresh(student)
        return student

    @staticmethod
    def get_student_detail(db: Session, student_id: UUID) -> Optional[Student]:
        return (
            db.query(Student)
            .options(
                joinedload(Student.guardians).joinedload(StudentGuardian.guardian),
                joinedload(Student.enrollment_history).joinedload(EnrollmentHistory.academic_year),
                joinedload(Student.enrollment_history).joinedload(EnrollmentHistory.school_class),
                joinedload(Student.enrollment_history).joinedload(EnrollmentHistory.section),
            )
            .filter(Student.id == student_id)
            .first()
        )

    @staticmethod
    def list_students(
        db: Session,
        skip: int = 0,
        limit: int = 20,
        academic_year_id: Optional[UUID] = None,
        class_id: Optional[UUID] = None,
        section_id: Optional[UUID] = None,
        status: Optional[StudentStatus] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[Dict[str, Any]], int]:
        # Base query joining latest enrollment
        query = db.query(Student).join(EnrollmentHistory, EnrollmentHistory.student_id == Student.id)

        if academic_year_id:
            query = query.filter(EnrollmentHistory.academic_year_id == academic_year_id)
        if class_id:
            query = query.filter(EnrollmentHistory.class_id == class_id)
        if section_id:
            query = query.filter(EnrollmentHistory.section_id == section_id)
        if status:
            query = query.filter(Student.status == status)

        if search:
            s_term = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Student.first_name.ilike(s_term),
                    Student.last_name.ilike(s_term),
                    Student.admission_number.ilike(s_term),
                    EnrollmentHistory.roll_number.ilike(s_term),
                )
            )

        total = query.distinct().count()

        students = (
            query.options(
                joinedload(Student.enrollment_history).joinedload(EnrollmentHistory.school_class),
                joinedload(Student.enrollment_history).joinedload(EnrollmentHistory.section),
                joinedload(Student.guardians).joinedload(StudentGuardian.guardian),
            )
            .order_by(Student.last_name, Student.first_name)
            .offset(skip)
            .limit(limit)
            .all()
        )

        results = []
        for s in students:
            # Latest enrollment
            latest_enroll = s.enrollment_history[0] if s.enrollment_history else None
            # Primary guardian
            primary_g = next((g.guardian for g in s.guardians if g.is_primary), None)
            if not primary_g and s.guardians:
                primary_g = s.guardians[0].guardian

            results.append(
                {
                    "id": s.id,
                    "admission_number": s.admission_number,
                    "first_name": s.first_name,
                    "last_name": s.last_name,
                    "full_name": s.full_name,
                    "date_of_birth": s.date_of_birth,
                    "gender": s.gender,
                    "blood_group": s.blood_group,
                    "admission_date": s.admission_date,
                    "status": s.status,
                    "photo_url": s.photo_url,
                    "current_class_name": latest_enroll.school_class.name if latest_enroll and latest_enroll.school_class else None,
                    "current_section_name": latest_enroll.section.name if latest_enroll and latest_enroll.section else None,
                    "current_roll_number": latest_enroll.roll_number if latest_enroll else None,
                    "guardian_name": primary_g.full_name if primary_g else None,
                    "guardian_phone": primary_g.phone if primary_g else None,
                }
            )

        return results, total

    @staticmethod
    def update_student(db: Session, student: Student, update_in: StudentUpdate) -> Student:
        for field, value in update_in.model_dump(exclude_unset=True).items():
            if value is not None and hasattr(student, field):
                setattr(student, field, value)
        db.commit()
        db.refresh(student)
        return student

    @staticmethod
    def promote_student(db: Session, student_id: UUID, promo: StudentPromotionRequest) -> EnrollmentHistory:
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise ValueError("Student not found")

        # Mark latest enrollment as PROMOTED
        latest_enrollment = (
            db.query(EnrollmentHistory)
            .filter(EnrollmentHistory.student_id == student_id)
            .order_by(desc(EnrollmentHistory.enrolled_at))
            .first()
        )
        if latest_enrollment:
            latest_enrollment.status = EnrollmentStatus.PROMOTED

        # Create new enrollment for target academic year and class
        new_enrollment = EnrollmentHistory(
            student_id=student_id,
            academic_year_id=promo.target_academic_year_id,
            class_id=promo.target_class_id,
            section_id=promo.target_section_id,
            roll_number=promo.roll_number,
            status=EnrollmentStatus.ENROLLED,
            enrolled_at=datetime.now(timezone.utc),
            remarks=promo.remarks,
        )
        db.add(new_enrollment)
        db.commit()
        db.refresh(new_enrollment)
        return new_enrollment

    @staticmethod
    def update_student_status(db: Session, student_id: UUID, req: StudentStatusUpdateRequest) -> Student:
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise ValueError("Student not found")

        student.status = req.status

        # Also update current enrollment status
        latest_enrollment = (
            db.query(EnrollmentHistory)
            .filter(EnrollmentHistory.student_id == student_id)
            .order_by(desc(EnrollmentHistory.enrolled_at))
            .first()
        )
        if latest_enrollment:
            if req.status == StudentStatus.TRANSFERRED:
                latest_enrollment.status = EnrollmentStatus.TRANSFERRED
            elif req.status == StudentStatus.WITHDRAWN:
                latest_enrollment.status = EnrollmentStatus.WITHDRAWN
            if req.remarks:
                latest_enrollment.remarks = req.remarks

        db.commit()
        db.refresh(student)
        return student

    @staticmethod
    def bulk_import(db: Session, req: BulkStudentImportRequest) -> Dict[str, Any]:
        success_count = 0
        errors = []

        for idx, item in enumerate(req.students):
            try:
                adm_no = StudentService.generate_admission_number(db)
                student = Student(
                    admission_number=adm_no,
                    first_name=item.first_name.strip(),
                    last_name=item.last_name.strip(),
                    date_of_birth=item.date_of_birth,
                    gender=item.gender.strip(),
                    status=StudentStatus.ACTIVE,
                )
                db.add(student)
                db.flush()

                guardian = Guardian(
                    full_name=item.guardian_name.strip(),
                    relationship_type=item.guardian_relation.strip(),
                    phone=item.guardian_phone.strip(),
                    email=item.guardian_email.lower().strip() if item.guardian_email else None,
                )
                db.add(guardian)
                db.flush()

                link = StudentGuardian(student_id=student.id, guardian_id=guardian.id, is_primary=True)
                db.add(link)

                enrollment = EnrollmentHistory(
                    student_id=student.id,
                    academic_year_id=req.academic_year_id,
                    class_id=req.class_id,
                    section_id=req.section_id,
                    roll_number=item.roll_number.strip() if item.roll_number else None,
                    status=EnrollmentStatus.ENROLLED,
                    enrolled_at=datetime.now(timezone.utc),
                    remarks="Bulk CSV/JSON Import",
                )
                db.add(enrollment)
                db.commit()
                success_count += 1
            except Exception as e:
                db.rollback()
                errors.append(f"Row {idx + 1} ({item.first_name} {item.last_name}): {str(e)}")

        return {
            "total_submitted": len(req.students),
            "successfully_imported": success_count,
            "failed_count": len(errors),
            "errors": errors,
        }
