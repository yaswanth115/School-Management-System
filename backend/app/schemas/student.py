from datetime import date, datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from app.models.student import StudentStatus, EnrollmentStatus


# --- Guardian Schemas ---
class GuardianCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150)
    relationship_type: str = Field(default="Father", description="Father, Mother, Guardian")
    email: Optional[EmailStr] = None
    phone: str = Field(..., min_length=7, max_length=50)
    occupation: Optional[str] = None
    address: Optional[str] = None


class GuardianResponse(GuardianCreate):
    id: UUID
    is_primary: bool = True

    model_config = ConfigDict(from_attributes=True)


# --- Enrollment Schemas ---
class EnrollmentResponse(BaseModel):
    id: UUID
    academic_year_id: UUID
    academic_year_name: Optional[str] = None
    class_id: UUID
    class_name: Optional[str] = None
    section_id: UUID
    section_name: Optional[str] = None
    roll_number: Optional[str] = None
    status: EnrollmentStatus
    enrolled_at: datetime
    remarks: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# --- Student Admission & Create Schemas ---
class StudentAdmissionRequest(BaseModel):
    # Biographical Information
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    date_of_birth: date
    gender: str = Field(..., description="Male, Female, Other")
    blood_group: Optional[str] = None
    admission_date: date = Field(default_factory=date.today)
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    emergency_contact: Optional[str] = None
    photo_url: Optional[str] = None

    # Custom admission number (optional, system auto-generates if omitted)
    admission_number: Optional[str] = Field(None, description="Optional custom admission number")

    # Initial Academic Enrollment
    academic_year_id: UUID
    class_id: UUID
    section_id: UUID
    roll_number: Optional[str] = None

    # Primary Guardian
    primary_guardian: GuardianCreate


class StudentUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    emergency_contact: Optional[str] = None
    photo_url: Optional[str] = None


class StudentResponse(BaseModel):
    id: UUID
    admission_number: str
    first_name: str
    last_name: str
    full_name: str
    date_of_birth: date
    gender: str
    blood_group: Optional[str] = None
    admission_date: date
    status: StudentStatus
    photo_url: Optional[str] = None
    current_class_name: Optional[str] = None
    current_section_name: Optional[str] = None
    current_roll_number: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_phone: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class StudentDetailResponse(StudentResponse):
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    emergency_contact: Optional[str] = None
    guardians: List[GuardianResponse] = []
    enrollment_history: List[EnrollmentResponse] = []

    model_config = ConfigDict(from_attributes=True)


# --- Promotion and Transfer Schemas ---
class StudentPromotionRequest(BaseModel):
    target_academic_year_id: UUID
    target_class_id: UUID
    target_section_id: UUID
    roll_number: Optional[str] = None
    remarks: Optional[str] = "Promoted to next grade"


class StudentStatusUpdateRequest(BaseModel):
    status: StudentStatus
    remarks: Optional[str] = None


# --- Bulk Import ---
class BulkStudentItem(BaseModel):
    first_name: str
    last_name: str
    date_of_birth: date
    gender: str
    guardian_name: str
    guardian_phone: str
    guardian_relation: str = "Parent"
    guardian_email: Optional[EmailStr] = None
    roll_number: Optional[str] = None


class BulkStudentImportRequest(BaseModel):
    academic_year_id: UUID
    class_id: UUID
    section_id: UUID
    students: List[BulkStudentItem]
