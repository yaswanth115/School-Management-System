from datetime import date, datetime, timezone
import enum
from sqlalchemy import (
    Column,
    String,
    Date,
    DateTime,
    Integer,
    ForeignKey,
    Enum as SAEnum,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import TimeStampedModel


class AttendanceStatus(str, enum.Enum):
    PRESENT = "PRESENT"
    ABSENT = "ABSENT"
    LATE = "LATE"
    HALF_DAY = "HALF_DAY"
    APPROVED_LEAVE = "APPROVED_LEAVE"


class AttendanceRegister(TimeStampedModel):
    """Daily classroom attendance register for a specific section and date."""
    __tablename__ = "attendance_registers"
    __table_args__ = (
        UniqueConstraint(
            "class_id",
            "section_id",
            "attendance_date",
            name="uq_class_section_attendance_date",
        ),
    )

    class_id = Column(
        UUID(as_uuid=True),
        ForeignKey("school_classes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    section_id = Column(
        UUID(as_uuid=True),
        ForeignKey("sections.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    academic_year_id = Column(
        UUID(as_uuid=True),
        ForeignKey("academic_years.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    attendance_date = Column(Date, nullable=False, index=True)
    taken_by_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    notes = Column(String(255), nullable=True)

    # Roll-up summary counts for fast analytics and queries
    total_students = Column(Integer, default=0, nullable=False)
    present_count = Column(Integer, default=0, nullable=False)
    absent_count = Column(Integer, default=0, nullable=False)
    late_count = Column(Integer, default=0, nullable=False)
    half_day_count = Column(Integer, default=0, nullable=False)
    leave_count = Column(Integer, default=0, nullable=False)

    # Relationships
    school_class = relationship("SchoolClass")
    section = relationship("Section")
    academic_year = relationship("AcademicYear")
    taken_by = relationship("User")
    records = relationship(
        "AttendanceRecord",
        back_populates="register",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<AttendanceRegister {self.class_id}:{self.section_id} on {self.attendance_date}>"


class AttendanceRecord(TimeStampedModel):
    """Individual student attendance entry within a daily register."""
    __tablename__ = "attendance_records"
    __table_args__ = (
        UniqueConstraint("register_id", "student_id", name="uq_register_student"),
    )

    register_id = Column(
        UUID(as_uuid=True),
        ForeignKey("attendance_registers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    student_id = Column(
        UUID(as_uuid=True),
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status = Column(
        SAEnum(AttendanceStatus, name="attendance_status_enum", native_enum=False),
        default=AttendanceStatus.PRESENT,
        nullable=False,
        index=True,
    )
    remarks = Column(String(255), nullable=True)

    # Relationships
    register = relationship("AttendanceRegister", back_populates="records")
    student = relationship("Student")
    corrections = relationship(
        "AttendanceCorrectionLog",
        back_populates="attendance_record",
        cascade="all, delete-orphan",
        order_by="desc(AttendanceCorrectionLog.changed_at)",
    )

    def __repr__(self) -> str:
        return f"<AttendanceRecord {self.student_id}: {self.status}>"


class AttendanceCorrectionLog(TimeStampedModel):
    """Immutable audit trail of authorized attendance corrections."""
    __tablename__ = "attendance_correction_logs"

    attendance_record_id = Column(
        UUID(as_uuid=True),
        ForeignKey("attendance_records.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    previous_status = Column(
        SAEnum(AttendanceStatus, name="attendance_status_enum", native_enum=False),
        nullable=False,
    )
    new_status = Column(
        SAEnum(AttendanceStatus, name="attendance_status_enum", native_enum=False),
        nullable=False,
    )
    reason = Column(String(500), nullable=False)
    changed_by_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    changed_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    attendance_record = relationship("AttendanceRecord", back_populates="corrections")
    changed_by = relationship("User")

    def __repr__(self) -> str:
        return f"<AttendanceCorrectionLog {self.previous_status} -> {self.new_status}>"
