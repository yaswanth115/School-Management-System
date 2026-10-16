from datetime import date, datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

from app.models.notice import NoticeAudience


class NoticeCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    content: str = Field(..., min_length=5)
    target_audience: NoticeAudience = NoticeAudience.ALL
    class_id: Optional[UUID] = None
    section_id: Optional[UUID] = None
    is_published: bool = True
    is_pinned: bool = False
    publish_date: Optional[date] = None
    expires_at: Optional[date] = None


class NoticeUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=255)
    content: Optional[str] = Field(None, min_length=5)
    target_audience: Optional[NoticeAudience] = None
    class_id: Optional[UUID] = None
    section_id: Optional[UUID] = None
    is_published: Optional[bool] = None
    is_pinned: Optional[bool] = None
    publish_date: Optional[date] = None
    expires_at: Optional[date] = None


class NoticeResponse(BaseModel):
    id: UUID
    title: str
    content: str
    target_audience: NoticeAudience
    class_id: Optional[UUID] = None
    class_name: Optional[str] = None
    section_id: Optional[UUID] = None
    section_name: Optional[str] = None
    is_published: bool
    is_pinned: bool
    publish_date: date
    expires_at: Optional[date] = None
    author_id: UUID
    author_name: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NoticeListResponse(BaseModel):
    total: int
    items: List[NoticeResponse]
