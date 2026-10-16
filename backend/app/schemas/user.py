from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from app.models.role import RoleEnum


class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    role: RoleEnum
    is_active: bool = True


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, description="Password with minimum 8 characters")


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    phone: Optional[str] = None
    role: Optional[RoleEnum] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=8)


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    phone: Optional[str] = None
    avatar_url: Optional[str] = None


class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    role: RoleEnum
    avatar_url: Optional[str] = None
    is_active: bool
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
