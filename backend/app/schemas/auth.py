from typing import Optional, Union
from uuid import UUID
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from app.models.role import RoleEnum


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)


class UserAuthSummary(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str
    role: RoleEnum
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserAuthSummary


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=6)
    new_password: str = Field(..., min_length=8)
