from datetime import date, time, datetime, timezone
import enum
from sqlalchemy import Column, String, Date, Time, DateTime, Boolean, ForeignKey, Numeric, Enum as SAEnum, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import TimeStampedModel


class ExamType(str, enum.Enum):
    UNIT_TEST = "UNIT_TEST"
    MIDTERM = "MIDTERM"
    FINAL = "FINAL"
    PRACTICAL = "PRACTICAL"
    QUIZ = "QUIZ"


class MarksSubmissionStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    APPROVED = "APPROVED"
    RETURNED = "RETURNED"


class Exam(TimeStampedModel):
    """Institutional examination event (e.g. Term 1 Midterms)."""
    __tablename__ = "exams"

    academic_year_id = Column(UUID(as_uuid=True), ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    exam_type = Column(
        SAEnum(ExamType, name="exam_type_enum", native_enum=False),
        default=ExamType.MIDTERM,
        nullable=False,
    )
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    description = Column(String(500), nullable=True)

    # Relationships
    academic_year = relationship("AcademicYear")
    schedules = relationship("ExamSchedule", back_populates="exam", cascade="all, delete-orphan", order_by="ExamSchedule.exam_date")

    def __repr__(self) -> str:
        return f"<Exam {self.name} ({self.exam_type})>"


class ExamSchedule(TimeStampedModel):
    """Specific subject date/time schedule and marks cutoff within an exam."""
    __tablename__ = "exam_schedules"

    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True)
    class_id = Column(UUID(as_uuid=True), ForeignKey("school_classes.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    exam_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)
    max_marks = Column(Numeric(5, 2), default=100.00, nullable=False)
    pass_marks = Column(Numeric(5, 2), default=35.00, nullable=False)
    room_number = Column(String(50), nullable=True)

    # Unique constraint: a subject in a class can only be scheduled once per exam
    __table_args__ = (
        UniqueConstraint("exam_id", "class_id", "subject_id", name="uq_exam_class_subject"),
    )

    # Relationships
    exam = relationship("Exam", back_populates="schedules")
    school_class = relationship("SchoolClass")
    subject = relationship("Subject")
    submissions = relationship("ExamSubmissionBatch", back_populates="exam_schedule", cascade="all, delete-orphan")
    marks = relationship("StudentMark", back_populates="exam_schedule", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<ExamSchedule {self.exam_id} - Class: {self.class_id} Subject: {self.subject_id}>"


class GradingScale(TimeStampedModel):
    """Institutional grading scale (e.g. CBSE 10-Point Scale)."""
    __tablename__ = "grading_scales"

    name = Column(String(100), unique=True, nullable=False)
    is_default = Column(Boolean, default=False, nullable=False)
    description = Column(String(255), nullable=True)

    # Relationships
    rules = relationship("GradeRule", back_populates="grading_scale", cascade="all, delete-orphan", order_by="desc(GradeRule.min_percentage)")

    def __repr__(self) -> str:
        return f"<GradingScale {self.name} (default={self.is_default})>"


class GradeRule(TimeStampedModel):
    """Percentage bracket mapping to letter grade and grade point."""
    __tablename__ = "grade_rules"

    grading_scale_id = Column(UUID(as_uuid=True), ForeignKey("grading_scales.id", ondelete="CASCADE"), nullable=False, index=True)
    grade = Column(String(10), nullable=False)  # e.g. A1, A2, B1, B2, C1, C2, D, E
    min_percentage = Column(Numeric(5, 2), nullable=False)
    max_percentage = Column(Numeric(5, 2), nullable=False)
    grade_point = Column(Numeric(3, 1), default=0.0, nullable=False)
    remarks = Column(String(100), nullable=True)  # e.g. Outstanding, Excellent, Very Good

    # Relationships
    grading_scale = relationship("GradingScale", back_populates="rules")

    def __repr__(self) -> str:
        return f"<GradeRule {self.grade} ({self.min_percentage}% - {self.max_percentage}%)>"


class ExamSubmissionBatch(TimeStampedModel):
    """Submission and administrative approval tracking for a class section and subject exam."""
    __tablename__ = "exam_submission_batches"

    exam_schedule_id = Column(UUID(as_uuid=True), ForeignKey("exam_schedules.id", ondelete="CASCADE"), nullable=False, index=True)
    section_id = Column(UUID(as_uuid=True), ForeignKey("sections.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(
        SAEnum(MarksSubmissionStatus, name="marks_submission_status_enum", native_enum=False),
        default=MarksSubmissionStatus.DRAFT,
        nullable=False,
        index=True,
    )
    submitted_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    review_comments = Column(String(500), nullable=True)

    __table_args__ = (
        UniqueConstraint("exam_schedule_id", "section_id", name="uq_schedule_section_submission"),
    )

    # Relationships
    exam_schedule = relationship("ExamSchedule", back_populates="submissions")
    section = relationship("Section")
    submitted_by = relationship("User", foreign_keys=[submitted_by_id])
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_id])

    def __repr__(self) -> str:
        return f"<ExamSubmissionBatch Schedule: {self.exam_schedule_id} Sec: {self.section_id} ({self.status})>"


class StudentMark(TimeStampedModel):
    """Student mark for a scheduled subject exam."""
    __tablename__ = "student_marks"

    exam_schedule_id = Column(UUID(as_uuid=True), ForeignKey("exam_schedules.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    section_id = Column(UUID(as_uuid=True), ForeignKey("sections.id", ondelete="CASCADE"), nullable=False, index=True)
    marks_obtained = Column(Numeric(5, 2), nullable=True)  # Null if absent
    is_absent = Column(Boolean, default=False, nullable=False)
    remarks = Column(String(255), nullable=True)
    grade = Column(String(10), nullable=True)
    grade_point = Column(Numeric(3, 1), nullable=True)

    __table_args__ = (
        UniqueConstraint("exam_schedule_id", "student_id", name="uq_schedule_student_mark"),
    )

    # Relationships
    exam_schedule = relationship("ExamSchedule", back_populates="marks")
    student = relationship("Student")
    section = relationship("Section")

    def __repr__(self) -> str:
        return f"<StudentMark Student: {self.student_id} Score: {self.marks_obtained} (Absent={self.is_absent})>"
