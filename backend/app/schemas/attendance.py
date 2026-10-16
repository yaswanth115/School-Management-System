from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional, Dict
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

from app.models.attendance import AttendanceStatus


# --- Attendance Record & Item Schemas ---
class StudentAttendanceItem(BaseModel):
    student_id: UUID
    status: AttendanceStatus = AttendanceStatus.PRESENT
    remarks: Optional[str] = Field(None, max_length=255)


class AttendanceCorrectionRequest(BaseModel):
    new_status: AttendanceStatus
    reason: str = Field(..., min_length=3, max_length=500, description="Mandatory audit reason for attendance adjustment")


class AttendanceCorrectionLogResponse(BaseModel):
    id: UUID
    attendance_record_id: UUID
    previous_status: AttendanceStatus
    new_status: AttendanceStatus
    reason: str
    changed_by_id: Optional[UUID] = None
    changed_by_name: Optional[str] = None
    changed_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AttendanceRecordResponse(BaseModel):
    id: Optional[UUID] = None
    student_id: UUID
    student_name: str
    admission_number: str
    roll_number: Optional[str] = None
    status: AttendanceStatus
    remarks: Optional[str] = None
    corrections: List[AttendanceCorrectionLogResponse] = []

    model_config = ConfigDict(from_attributes=True)


# --- Register Schemas ---
class AttendanceRegisterCreate(BaseModel):
    class_id: UUID
    section_id: UUID
    attendance_date: date
    academic_year_id: Optional[UUID] = None
    notes: Optional[str] = Field(None, max_length=255)
    records: List[StudentAttendanceItem]


class AttendanceRegisterResponse(BaseModel):
    id: Optional[UUID] = None
    class_id: UUID
    class_name: Optional[str] = None
    section_id: UUID
    section_name: Optional[str] = None
    academic_year_id: Optional[UUID] = None
    academic_year_name: Optional[str] = None
    attendance_date: date
    taken_by_id: Optional[UUID] = None
    taken_by_name: Optional[str] = None
    notes: Optional[str] = None
    total_students: int = 0
    present_count: int = 0
    absent_count: int = 0
    late_count: int = 0
    half_day_count: int = 0
    leave_count: int = 0
    is_submitted: bool = False
    created_at: Optional[datetime] = None
    records: List[AttendanceRecordResponse] = []

    model_config = ConfigDict(from_attributes=True)


# --- Monthly Statistics & Matrix Schemas ---
class StudentAttendanceSummary(BaseModel):
    student_id: UUID
    admission_number: str
    student_name: str
    roll_number: Optional[str] = None
    total_days: int
    present_days: int
    absent_days: int
    late_days: int
    half_day_days: int
    leave_days: int
    attendance_percentage: Decimal
    is_low_attendance: bool  # < 75%


class SectionMonthlyAttendanceStats(BaseModel):
    class_id: UUID
    class_name: str
    section_id: UUID
    section_name: str
    year: int
    month: int
    total_working_days: int
    average_attendance_percentage: Decimal
    low_attendance_students: List[StudentAttendanceSummary]


class AttendanceMatrixStudentRow(BaseModel):
    student_id: UUID
    admission_number: str
    student_name: str
    roll_number: Optional[str] = None
    daily_statuses: Dict[int, Optional[str]]  # day 1..31 -> "P", "A", "L", "H", "E", or None
    present_days: int
    total_days: int
    attendance_percentage: Decimal


class AttendanceMatrixResponse(BaseModel):
    class_id: UUID
    class_name: str
    section_id: UUID
    section_name: str
    year: int
    month: int
    days_in_month: int
    students: List[AttendanceMatrixStudentRow]
