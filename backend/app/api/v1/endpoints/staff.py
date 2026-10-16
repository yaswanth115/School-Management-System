from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.role import RoleEnum
from app.models.user import User
from app.schemas.staff import StaffProfileCreate, StaffProfileResponse
from app.services.staff_service import StaffService

router = APIRouter(prefix="/staff", tags=["Staff"])


@router.get("", response_model=List[StaffProfileResponse])
def list_staff_directory(
    department: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.PRINCIPAL)),
):
    """Retrieve faculty and staff directory with teaching load indicators."""
    items = StaffService.list_staff(db, department=department, search=search)
    return [StaffProfileResponse(**item) for item in items]


@router.post("/profile", response_model=StaffProfileResponse, status_code=status.HTTP_200_OK)
def save_staff_profile(
    profile_in: StaffProfileCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleEnum.ADMIN)),
):
    """Create or update extended staff employment profile (Admin only)."""
    profile = StaffService.create_or_update_profile(db, profile_in)
    items = StaffService.list_staff(db)
    item = next((i for i in items if i["user_id"] == profile.user_id), None)
    return StaffProfileResponse(**item)
