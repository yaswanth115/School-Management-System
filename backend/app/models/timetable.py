from datetime import time
import enum
from sqlalchemy import (
    Column,
    String,
    Integer,
    Time,
    ForeignKey,
    Enum as SAEnum,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import TimeStampedModel


class DayOfWeek(str, enum.Enum):
    MONDAY = "MONDAY"
    TUESDAY = "TUESDAY"
    WEDNESDAY = "WEDNESDAY"
    THURSDAY = "THURSDAY"
    FRIDAY = "FRIDAY"
    SATURDAY = "SATURDAY"
    SUNDAY = "SUNDAY"


class ClassTimetable(TimeStampedModel):
    """Institutional weekly schedule period for a class and section."""
    __tablename__ = "class_timetables"
    __table_args__ = (
        UniqueConstraint(
            "class_id",
            "section_id",
            "academic_year_id",
            "day_of_week",
            "period_number",
            name="uq_section_period",
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
    day_of_week = Column(
        SAEnum(DayOfWeek, name="day_of_week_enum", native_enum=False),
        nullable=False,
        index=True,
    )
    period_number = Column(Integer, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    subject_id = Column(
        UUID(as_uuid=True),
        ForeignKey("subjects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    teacher_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    room_number = Column(String(50), nullable=True)

    # Relationships
    school_class = relationship("SchoolClass")
    section = relationship("Section")
    academic_year = relationship("AcademicYear")
    subject = relationship("Subject")
    teacher = relationship("User")

    def __repr__(self) -> str:
        return f"<ClassTimetable {self.class_id}:{self.day_of_week} Period {self.period_number}>"
