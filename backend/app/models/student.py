from datetime import date, datetime, timezone
import enum
from sqlalchemy import Column, String, Date, DateTime, Boolean, ForeignKey, Enum as SAEnum, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import TimeStampedModel


class StudentStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    TRANSFERRED = "TRANSFERRED"
    WITHDRAWN = "WITHDRAWN"
    ALUMNI = "ALUMNI"


class EnrollmentStatus(str, enum.Enum):
    ENROLLED = "ENROLLED"
    PROMOTED = "PROMOTED"
    TRANSFERRED = "TRANSFERRED"
    WITHDRAWN = "WITHDRAWN"


class Student(TimeStampedModel):
    """Student master record."""
    __tablename__ = "students"

    admission_number = Column(String(50), unique=True, index=True, nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, unique=True)
    first_name = Column(String(100), index=True, nullable=False)
    last_name = Column(String(100), index=True, nullable=False)
    date_of_birth = Column(Date, nullable=False)
    gender = Column(String(20), nullable=False)  # Male, Female, Other
    blood_group = Column(String(10), nullable=True)
    admission_date = Column(Date, default=date.today, nullable=False)
    address = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    postal_code = Column(String(20), nullable=True)
    emergency_contact = Column(String(50), nullable=True)
    status = Column(SAEnum(StudentStatus, name="student_status_enum", native_enum=False), default=StudentStatus.ACTIVE, nullable=False, index=True)
    photo_url = Column(String(500), nullable=True)

    # Relationships
    user = relationship("User")
    guardians = relationship("StudentGuardian", back_populates="student", cascade="all, delete-orphan")
    enrollment_history = relationship(
        "EnrollmentHistory",
        back_populates="student",
        cascade="all, delete-orphan",
        order_by="desc(EnrollmentHistory.enrolled_at)",
    )

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    def __repr__(self) -> str:
        return f"<Student {self.admission_number}: {self.full_name}>"


class Guardian(TimeStampedModel):
    """Parent or Guardian information."""
    __tablename__ = "guardians"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    full_name = Column(String(150), index=True, nullable=False)
    relationship_type = Column(String(50), default="Parent", nullable=False)  # Father, Mother, Guardian
    email = Column(String(255), index=True, nullable=True)
    phone = Column(String(50), index=True, nullable=False)
    occupation = Column(String(100), nullable=True)
    address = Column(String(255), nullable=True)

    # Relationships
    user = relationship("User")
    students = relationship("StudentGuardian", back_populates="guardian", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Guardian {self.full_name} ({self.relationship_type})>"


class StudentGuardian(TimeStampedModel):
    """Association table linking students to multiple guardians (e.g. Mother, Father)."""
    __tablename__ = "student_guardians"
    __table_args__ = (
        UniqueConstraint("student_id", "guardian_id", name="uq_student_guardian"),
    )

    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    guardian_id = Column(UUID(as_uuid=True), ForeignKey("guardians.id", ondelete="CASCADE"), nullable=False, index=True)
    is_primary = Column(Boolean, default=True, nullable=False)

    # Relationships
    student = relationship("Student", back_populates="guardians")
    guardian = relationship("Guardian", back_populates="students")


class EnrollmentHistory(TimeStampedModel):
    """Historical enrollment log linking a student to an academic year, class, and section."""
    __tablename__ = "enrollment_history"
    __table_args__ = (
        UniqueConstraint("student_id", "academic_year_id", name="uq_student_academic_year"),
    )

    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    academic_year_id = Column(UUID(as_uuid=True), ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False, index=True)
    class_id = Column(UUID(as_uuid=True), ForeignKey("school_classes.id", ondelete="CASCADE"), nullable=False, index=True)
    section_id = Column(UUID(as_uuid=True), ForeignKey("sections.id", ondelete="CASCADE"), nullable=False, index=True)
    roll_number = Column(String(50), nullable=True)
    status = Column(
        SAEnum(EnrollmentStatus, name="enrollment_status_enum", native_enum=False),
        default=EnrollmentStatus.ENROLLED,
        nullable=False,
    )
    enrolled_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    remarks = Column(String(255), nullable=True)

    # Relationships
    student = relationship("Student", back_populates="enrollment_history")
    academic_year = relationship("AcademicYear", back_populates="enrollments")
    school_class = relationship("SchoolClass", back_populates="enrollments")
    section = relationship("Section", back_populates="enrollments")

    def __repr__(self) -> str:
        return f"<EnrollmentHistory Student:{self.student_id} Year:{self.academic_year_id} Class:{self.class_id}>"
