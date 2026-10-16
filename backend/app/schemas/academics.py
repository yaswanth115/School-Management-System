from datetime import date, datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


# --- Academic Year Schemas ---
class AcademicYearBase(BaseModel):
    name: str = Field(..., min_length=4, max_length=50, description="e.g. 2026-2027")
    start_date: date
    end_date: date
    is_current: bool = False


class AcademicYearCreate(AcademicYearBase):
    pass


class AcademicYearUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_current: Optional[bool] = None


class AcademicYearResponse(AcademicYearBase):
    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Section Schemas ---
class SectionBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=50, description="e.g. Section A")
    room_number: Optional[str] = None
    capacity: int = Field(default=40, ge=1, le=100)


class SectionCreate(SectionBase):
    pass


class SectionResponse(SectionBase):
    id: UUID
    class_id: UUID
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


# --- School Class Schemas ---
class SchoolClassBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="e.g. Grade 10")
    numeric_order: int = Field(..., ge=1, le=20)
    description: Optional[str] = None


class SchoolClassCreate(SchoolClassBase):
    initial_sections: Optional[List[str]] = Field(default=["Section A"], description="Section names to initialize")


class SchoolClassUpdate(BaseModel):
    name: Optional[str] = None
    numeric_order: Optional[int] = None
    description: Optional[str] = None


class SchoolClassResponse(SchoolClassBase):
    id: UUID
    is_active: bool
    sections: List[SectionResponse] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Subject Schemas ---
class SubjectBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    code: str = Field(..., min_length=2, max_length=50)
    subject_type: str = Field(default="Core", description="Core, Elective, Practical")
    description: Optional[str] = None


class SubjectCreate(SubjectBase):
    pass


class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    subject_type: Optional[str] = None
    description: Optional[str] = None


class SubjectResponse(SubjectBase):
    id: UUID
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Class-Subject Assignment ---
class ClassSubjectAssignRequest(BaseModel):
    class_id: UUID
    subject_ids: List[UUID]


# --- Teacher Assignment Schemas ---
class TeacherAssignmentCreate(BaseModel):
    teacher_id: UUID
    class_id: UUID
    section_id: UUID
    subject_id: UUID
    academic_year_id: UUID


class TeacherAssignmentResponse(BaseModel):
    id: UUID
    teacher_id: UUID
    teacher_name: Optional[str] = None
    teacher_email: Optional[str] = None
    class_id: UUID
    class_name: Optional[str] = None
    section_id: UUID
    section_name: Optional[str] = None
    subject_id: UUID
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    academic_year_id: UUID
    academic_year_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
