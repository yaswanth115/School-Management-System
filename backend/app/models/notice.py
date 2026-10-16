from datetime import date
import enum
from sqlalchemy import (
    Column,
    String,
    Text,
    Date,
    Boolean,
    ForeignKey,
    Enum as SAEnum,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import TimeStampedModel


class NoticeAudience(str, enum.Enum):
    ALL = "ALL"
    TEACHERS = "TEACHERS"
    PARENTS = "PARENTS"
    STUDENTS = "STUDENTS"
    CLASS_SPECIFIC = "CLASS_SPECIFIC"


class Notice(TimeStampedModel):
    """
    Institutional announcements and targeted notices board.
    Audience can be targeted across the entire school, specific roles, or specific classes/sections.
    """
    __tablename__ = "notices"

    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    target_audience = Column(
        SAEnum(NoticeAudience, name="noticeaudience"),
        nullable=False,
        default=NoticeAudience.ALL,
        index=True,
    )
    class_id = Column(
        UUID(as_uuid=True),
        ForeignKey("school_classes.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    section_id = Column(
        UUID(as_uuid=True),
        ForeignKey("sections.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    is_published = Column(Boolean, default=True, nullable=False, index=True)
    is_pinned = Column(Boolean, default=False, nullable=False, index=True)
    publish_date = Column(Date, default=date.today, nullable=False, index=True)
    expires_at = Column(Date, nullable=True)

    author_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Relationships
    author = relationship("User", foreign_keys=[author_id])
    school_class = relationship("SchoolClass", foreign_keys=[class_id])
    section = relationship("Section", foreign_keys=[section_id])
