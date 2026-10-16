from datetime import date
from sqlalchemy import Column, String, Date, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import TimeStampedModel


class StaffProfile(TimeStampedModel):
    """Staff and Teacher extended employment profile."""
    __tablename__ = "staff_profiles"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    employee_id = Column(String(50), unique=True, index=True, nullable=False)
    designation = Column(String(100), nullable=False)  # e.g. Senior Teacher, Head of Department
    department = Column(String(100), nullable=False, index=True)  # Science, Mathematics, Humanities, Administration
    qualification = Column(String(150), nullable=True)  # M.Sc, B.Ed, Ph.D
    joining_date = Column(Date, default=date.today, nullable=False)
    emergency_contact = Column(String(50), nullable=True)

    # Relationship
    user = relationship("User")

    def __repr__(self) -> str:
        return f"<StaffProfile {self.employee_id}: {self.designation}>"
