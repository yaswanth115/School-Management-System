from typing import Optional
from uuid import UUID
import math
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.role import RoleEnum
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.audit import AuditLogResponse
from app.services.audit_service import AuditService

router = APIRouter(prefix="/audit", tags=["Audit Logs"])


@router.get("", response_model=PaginatedResponse[AuditLogResponse])
def list_audit_logs(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(25, ge=1, le=100, description="Items per page"),
    user_id: Optional[UUID] = Query(None, description="Filter by user ID"),
    action: Optional[str] = Query(None, description="Filter by action name"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleEnum.ADMIN)),
):
    """Retrieve audit logs with filtering and pagination (Admin only)."""
    skip = (page - 1) * page_size
    logs, total = AuditService.get_logs(
        db=db,
        skip=skip,
        limit=page_size,
        user_id=user_id,
        action=action,
        resource_type=resource_type,
    )

    items = []
    for log in logs:
        user_email = log.user.email if log.user else None
        items.append(
            AuditLogResponse(
                id=log.id,
                user_id=log.user_id,
                user_email=user_email,
                action=log.action,
                resource_type=log.resource_type,
                resource_id=log.resource_id,
                details=log.details,
                ip_address=log.ip_address,
                timestamp=log.timestamp,
            )
        )

    total_pages = math.ceil(total / page_size) if total > 0 else 0
    return PaginatedResponse[AuditLogResponse](
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )
