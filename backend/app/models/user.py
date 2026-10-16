from sqlalchemy import Column, String, DateTime, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.models.base import TimeStampedModel
from app.models.role import RoleEnum


class User(TimeStampedModel):
    """User account model for all school portal actors."""
    __tablename__ = "users"

    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    role = Column(SAEnum(RoleEnum, name="role_enum", native_enum=False), default=RoleEnum.STUDENT, nullable=False, index=True)
    avatar_url = Column(String(500), nullable=True)
    last_login = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<User {self.email} ({self.role})>"
