from typing import Optional
from uuid import UUID
import math
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles, get_client_ip
from app.models.role import RoleEnum
from app.models.user import User
from app.schemas.common import MessageResponse, PaginatedResponse
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.services.audit_service import AuditService
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=PaginatedResponse[UserResponse])
def list_users(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    role: Optional[RoleEnum] = Query(None, description="Filter by role"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search by name, email, or phone"),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.PRINCIPAL)),
):
    """List users with filtering, searching, and pagination (Admin & Principal)."""
    skip = (page - 1) * page_size
    users, total = UserService.get_users(
        db=db,
        skip=skip,
        limit=page_size,
        role=role,
        is_active=is_active,
        search=search,
    )
    total_pages = math.ceil(total / page_size) if total > 0 else 0
    return PaginatedResponse[UserResponse](
        items=[UserResponse.model_validate(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.ADMIN)),
):
    """Create a new user account (Admin only)."""
    existing_user = UserService.get_by_email(db, user_in.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"User with email '{user_in.email}' already exists",
        )

    user = UserService.create_user(db, user_in)
    AuditService.log_event(
        db=db,
        action="USER_CREATED",
        resource_type="user",
        user_id=current_user.id,
        resource_id=str(user.id),
        details={"email": user.email, "role": user.role.value},
        ip_address=get_client_ip(request),
    )
    return user


@router.get("/{user_id}", response_model=UserResponse)
def get_user_by_id(
    user_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.PRINCIPAL)),
):
    """Retrieve details of a specific user."""
    user = UserService.get_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: UUID,
    user_in: UserUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.ADMIN)),
):
    """Update user information, role, or credentials (Admin only)."""
    user = UserService.get_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if user_in.email and user_in.email.lower() != user.email.lower():
        conflict = UserService.get_by_email(db, user_in.email)
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Email '{user_in.email}' is already in use",
            )

    updated_user = UserService.update_user(db, user, user_in)
    AuditService.log_event(
        db=db,
        action="USER_UPDATED",
        resource_type="user",
        user_id=current_user.id,
        resource_id=str(user.id),
        details={"email": updated_user.email, "role": updated_user.role.value},
        ip_address=get_client_ip(request),
    )
    return updated_user


@router.patch("/{user_id}/status", response_model=UserResponse)
def toggle_user_status(
    user_id: UUID,
    is_active: bool = Query(..., description="Target active status"),
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.ADMIN)),
):
    """Activate or deactivate a user account (Admin only)."""
    user = UserService.get_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if user.id == current_user.id and not is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot deactivate their own account",
        )

    user = UserService.toggle_status(db, user, is_active)
    AuditService.log_event(
        db=db,
        action="USER_STATUS_TOGGLED",
        resource_type="user",
        user_id=current_user.id,
        resource_id=str(user.id),
        details={"is_active": is_active},
        ip_address=get_client_ip(request) if request else None,
    )
    return user
