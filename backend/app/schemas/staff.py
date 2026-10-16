from datetime import date, datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class StaffProfileCreate(BaseModel):
    user_id: UUID
    employee_id: str = Field(..., min_length=2, max_length=50)
    designation: str = Field(..., min_length=2, max_length=100)
    department: str = Field(..., min_length=2, max_length=100)
    qualification: Optional[str] = None
    joining_date: date = Field(default_factory=date.today)
    emergency_contact: Optional[str] = None


class StaffProfileUpdate(BaseModel):
    designation: Optional[str] = None
    department: Optional[str] = None
    qualification: Optional[str] = None
    emergency_contact: Optional[str] = None


class StaffProfileResponse(BaseModel):
    id: UUID
    user_id: UUID
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    employee_id: str
    designation: str
    department: str
    qualification: Optional[str] = None
    joining_date: date
    emergency_contact: Optional[str] = None
    is_active: bool
    assigned_subjects_count: int = 0

    model_config = ConfigDict(from_attributes=True)
