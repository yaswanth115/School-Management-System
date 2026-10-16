from datetime import date
from sqlalchemy import Column, String, Date, Boolean
from sqlalchemy.orm import relationship
from app.models.base import TimeStampedModel


class AcademicYear(TimeStampedModel):
    """Academic year session (e.g. 2026-2027) with active flag."""
    __tablename__ = "academic_years"

    name = Column(String(50), unique=True, index=True, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_current = Column(Boolean, default=False, nullable=False, index=True)

    # Relationships
    teacher_assignments = relationship("TeacherAssignment", back_populates="academic_year", cascade="all, delete-orphan")
    enrollments = relationship("EnrollmentHistory", back_populates="academic_year", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<AcademicYear {self.name} (Current: {self.is_current})>"
