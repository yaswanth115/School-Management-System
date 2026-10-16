from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.role import RoleEnum
from app.models.user import User
from app.models.notice import NoticeAudience
from app.schemas.notice import (
    NoticeCreate,
    NoticeUpdate,
    NoticeResponse,
    NoticeListResponse,
)
from app.services.notice_service import NoticeService
from app.services.audit_service import AuditService

router = APIRouter(prefix="/notices", tags=["Notices & Announcements"])


@router.get("", response_model=NoticeListResponse)
def list_notices(
    search: Optional[str] = Query(None, description="Search notice title or content"),
    audience: Optional[NoticeAudience] = Query(None, description="Filter by audience scope"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List announcements scoped to authenticated user's role and enrolled classes.
    """
    return NoticeService.list_notices(
        db,
        current_user=current_user,
        search=search,
        audience_filter=audience,
        skip=skip,
        limit=limit,
    )


@router.post("", response_model=NoticeResponse, status_code=status.HTTP_201_CREATED)
def create_notice(
    req: NoticeCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.PRINCIPAL, RoleEnum.TEACHER)),
):
    """
    Publish a new institutional or class-specific notice.
    """
    notice = NoticeService.create_notice(db, req=req, author_user=current_user)

    AuditService.log_event(
        db=db,
        action="CREATE_NOTICE",
        resource_type="Notice",
        user_id=current_user.id,
        resource_id=str(notice.id),
        details={"title": notice.title, "target_audience": str(notice.target_audience)},
        ip_address=request.client.host if request.client else None,
    )

    return NoticeResponse(
        id=notice.id,
        title=notice.title,
        content=notice.content,
        target_audience=notice.target_audience,
        class_id=notice.class_id,
        class_name=notice.school_class.name if notice.school_class else None,
        section_id=notice.section_id,
        section_name=notice.section.name if notice.section else None,
        is_published=notice.is_published,
        is_pinned=notice.is_pinned,
        publish_date=notice.publish_date,
        expires_at=notice.expires_at,
        author_id=notice.author_id,
        author_name=current_user.full_name,
        created_at=notice.created_at,
        updated_at=notice.updated_at,
    )


@router.get("/{notice_id}", response_model=NoticeResponse)
def get_notice_details(
    notice_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve notice details by ID.
    """
    from app.models.notice import Notice
    notice = db.query(Notice).filter(Notice.id == notice_id, Notice.is_active == True).first()
    if not notice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notice not found.")

    return NoticeResponse(
        id=notice.id,
        title=notice.title,
        content=notice.content,
        target_audience=notice.target_audience,
        class_id=notice.class_id,
        class_name=notice.school_class.name if notice.school_class else None,
        section_id=notice.section_id,
        section_name=notice.section.name if notice.section else None,
        is_published=notice.is_published,
        is_pinned=notice.is_pinned,
        publish_date=notice.publish_date,
        expires_at=notice.expires_at,
        author_id=notice.author_id,
        author_name=notice.author.full_name if notice.author else "Administrator",
        created_at=notice.created_at,
        updated_at=notice.updated_at,
    )


@router.put("/{notice_id}", response_model=NoticeResponse)
def update_notice(
    notice_id: UUID,
    req: NoticeUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.PRINCIPAL, RoleEnum.TEACHER)),
):
    """
    Update announcement content, publication schedule, or audience targeting.
    """
    notice = NoticeService.update_notice(db, notice_id=notice_id, req=req, current_user=current_user)

    AuditService.log_event(
        db=db,
        action="UPDATE_NOTICE",
        resource_type="Notice",
        user_id=current_user.id,
        resource_id=str(notice.id),
        details={"title": notice.title},
        ip_address=request.client.host if request.client else None,
    )

    return NoticeResponse(
        id=notice.id,
        title=notice.title,
        content=notice.content,
        target_audience=notice.target_audience,
        class_id=notice.class_id,
        class_name=notice.school_class.name if notice.school_class else None,
        section_id=notice.section_id,
        section_name=notice.section.name if notice.section else None,
        is_published=notice.is_published,
        is_pinned=notice.is_pinned,
        publish_date=notice.publish_date,
        expires_at=notice.expires_at,
        author_id=notice.author_id,
        author_name=notice.author.full_name if notice.author else "Administrator",
        created_at=notice.created_at,
        updated_at=notice.updated_at,
    )


@router.delete("/{notice_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notice(
    notice_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.PRINCIPAL, RoleEnum.TEACHER)),
):
    """
    Remove / delete a notice from the active board.
    """
    NoticeService.delete_notice(db, notice_id=notice_id, current_user=current_user)

    AuditService.log_event(
        db=db,
        action="DELETE_NOTICE",
        resource_type="Notice",
        user_id=current_user.id,
        resource_id=str(notice_id),
        details={"notice_id": str(notice_id)},
        ip_address=request.client.host if request.client else None,
    )


@router.post("/{notice_id}/pin", response_model=NoticeResponse)
def toggle_pin_notice(
    notice_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.PRINCIPAL)),
):
    """
    Toggle pinned highlight status of an announcement.
    """
    notice = NoticeService.toggle_pin(db, notice_id=notice_id, current_user=current_user)

    AuditService.log_event(
        db=db,
        action="PIN_NOTICE",
        resource_type="Notice",
        user_id=current_user.id,
        resource_id=str(notice.id),
        details={"title": notice.title, "is_pinned": notice.is_pinned},
        ip_address=request.client.host if request.client else None,
    )

    return NoticeResponse(
        id=notice.id,
        title=notice.title,
        content=notice.content,
        target_audience=notice.target_audience,
        class_id=notice.class_id,
        class_name=notice.school_class.name if notice.school_class else None,
        section_id=notice.section_id,
        section_name=notice.section.name if notice.section else None,
        is_published=notice.is_published,
        is_pinned=notice.is_pinned,
        publish_date=notice.publish_date,
        expires_at=notice.expires_at,
        author_id=notice.author_id,
        author_name=notice.author.full_name if notice.author else "Administrator",
        created_at=notice.created_at,
        updated_at=notice.updated_at,
    )
