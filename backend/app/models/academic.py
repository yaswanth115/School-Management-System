import uuid
from sqlalchemy import Column, String, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import TimeStampedModel


class SchoolClass(TimeStampedModel):
    """School class/grade level (e.g. Grade 1, Grade 10)."""
    __tablename__ = "school_classes"

    name = Column(String(100), unique=True, index=True, nullable=False)
    numeric_order = Column(Integer, index=True, nullable=False)
    description = Column(String(255), nullable=True)

    # Relationships
    sections = relationship("Section", back_populates="school_class", cascade="all, delete-orphan", order_by="Section.name")
    class_subjects = relationship("ClassSubject", back_populates="school_class", cascade="all, delete-orphan")
    enrollments = relationship("EnrollmentHistory", back_populates="school_class")
    teacher_assignments = relationship("TeacherAssignment", back_populates="school_class")

    def __repr__(self) -> str:
        return f"<SchoolClass {self.name}>"


class Section(TimeStampedModel):
    """Class section (e.g. Section A, Section B)."""
    __tablename__ = "sections"
    __table_args__ = (
        UniqueConstraint("class_id", "name", name="uq_class_section_name"),
    )

    class_id = Column(UUID(as_uuid=True), ForeignKey("school_classes.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(50), nullable=False)
    room_number = Column(String(50), nullable=True)
    capacity = Column(Integer, default=40, nullable=False)

    # Relationships
    school_class = relationship("SchoolClass", back_populates="sections")
    enrollments = relationship("EnrollmentHistory", back_populates="section")
    teacher_assignments = relationship("TeacherAssignment", back_populates="section")

    def __repr__(self) -> str:
        return f"<Section {self.name} for Class {self.class_id}>"


class Subject(TimeStampedModel):
    """Subject/course taught in school (e.g. Mathematics, Science)."""
    __tablename__ = "subjects"

    name = Column(String(100), index=True, nullable=False)
    code = Column(String(50), unique=True, index=True, nullable=False)
    subject_type = Column(String(50), default="Core", nullable=False)  # Core, Elective, Practical
    description = Column(String(255), nullable=True)

    # Relationships
    class_subjects = relationship("ClassSubject", back_populates="subject", cascade="all, delete-orphan")
    teacher_assignments = relationship("TeacherAssignment", back_populates="subject")

    def __repr__(self) -> str:
        return f"<Subject {self.name} ({self.code})>"


class ClassSubject(TimeStampedModel):
    """Mapping between classes and their curriculum subjects."""
    __tablename__ = "class_subjects"
    __table_args__ = (
        UniqueConstraint("class_id", "subject_id", name="uq_class_subject"),
    )

    class_id = Column(UUID(as_uuid=True), ForeignKey("school_classes.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)

    # Relationships
    school_class = relationship("SchoolClass", back_populates="class_subjects")
    subject = relationship("Subject", back_populates="class_subjects")


class TeacherAssignment(TimeStampedModel):
    """Assignment of a teacher to a specific class, section, and subject for an academic year."""
    __tablename__ = "teacher_assignments"
    __table_args__ = (
        UniqueConstraint(
            "teacher_id", "class_id", "section_id", "subject_id", "academic_year_id",
            name="uq_teacher_assignment",
        ),
    )

    teacher_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    class_id = Column(UUID(as_uuid=True), ForeignKey("school_classes.id", ondelete="CASCADE"), nullable=False, index=True)
    section_id = Column(UUID(as_uuid=True), ForeignKey("sections.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    academic_year_id = Column(UUID(as_uuid=True), ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False, index=True)

    # Relationships
    teacher = relationship("User")
    school_class = relationship("SchoolClass", back_populates="teacher_assignments")
    section = relationship("Section", back_populates="teacher_assignments")
    subject = relationship("Subject", back_populates="teacher_assignments")
    academic_year = relationship("AcademicYear", back_populates="teacher_assignments")

    def __repr__(self) -> str:
        return f"<TeacherAssignment Teacher:{self.teacher_id} Class:{self.class_id} Subject:{self.subject_id}>"
