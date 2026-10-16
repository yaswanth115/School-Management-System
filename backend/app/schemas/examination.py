from datetime import date, time, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

from app.models.examination import ExamType, MarksSubmissionStatus


# --- Grading Scale Schemas ---
class GradeRuleBase(BaseModel):
    grade: str = Field(..., min_length=1, max_length=10)
    min_percentage: Decimal = Field(..., ge=0, le=100)
    max_percentage: Decimal = Field(..., ge=0, le=100)
    grade_point: Decimal = Field(default=Decimal("0.0"), ge=0, le=10)
    remarks: Optional[str] = None


class GradeRuleCreate(GradeRuleBase):
    pass


class GradeRuleResponse(GradeRuleBase):
    id: UUID
    grading_scale_id: UUID

    model_config = ConfigDict(from_attributes=True)


class GradingScaleCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    is_default: bool = False
    description: Optional[str] = None
    rules: List[GradeRuleCreate] = []


class GradingScaleResponse(BaseModel):
    id: UUID
    name: str
    is_default: bool
    description: Optional[str] = None
    rules: List[GradeRuleResponse] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Exam Schemas ---
class ExamBase(BaseModel):
    academic_year_id: UUID
    name: str = Field(..., min_length=2, max_length=150)
    exam_type: ExamType = ExamType.MIDTERM
    start_date: date
    end_date: date
    description: Optional[str] = None


class ExamCreate(ExamBase):
    pass


class ExamUpdate(BaseModel):
    name: Optional[str] = None
    exam_type: Optional[ExamType] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    description: Optional[str] = None


class ExamResponse(ExamBase):
    id: UUID
    academic_year_name: Optional[str] = None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Exam Schedule Schemas ---
class ExamScheduleBase(BaseModel):
    exam_id: UUID
    class_id: UUID
    subject_id: UUID
    exam_date: date
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    max_marks: Decimal = Field(default=Decimal("100.00"), gt=0)
    pass_marks: Decimal = Field(default=Decimal("35.00"), ge=0)
    room_number: Optional[str] = None


class ExamScheduleCreate(ExamScheduleBase):
    pass


class ExamScheduleResponse(ExamScheduleBase):
    id: UUID
    exam_name: Optional[str] = None
    class_name: Optional[str] = None
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Marks Entry & Submission Schemas ---
class StudentMarkItem(BaseModel):
    student_id: UUID
    marks_obtained: Optional[Decimal] = None
    is_absent: bool = False
    remarks: Optional[str] = None


class BatchMarksEntryRequest(BaseModel):
    marks: List[StudentMarkItem]
    is_submit: bool = False  # False = save draft, True = submit for principal approval


class StudentMarkResponse(BaseModel):
    id: UUID
    exam_schedule_id: UUID
    student_id: UUID
    student_name: Optional[str] = None
    admission_number: Optional[str] = None
    roll_number: Optional[str] = None
    section_id: UUID
    marks_obtained: Optional[Decimal] = None
    is_absent: bool = False
    grade: Optional[str] = None
    grade_point: Optional[Decimal] = None
    remarks: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ExamSubmissionBatchResponse(BaseModel):
    id: UUID
    exam_schedule_id: UUID
    exam_name: Optional[str] = None
    class_id: Optional[UUID] = None
    class_name: Optional[str] = None
    section_id: UUID
    section_name: Optional[str] = None
    subject_id: Optional[UUID] = None
    subject_name: Optional[str] = None
    max_marks: Optional[Decimal] = None
    pass_marks: Optional[Decimal] = None
    status: MarksSubmissionStatus
    submitted_by_id: Optional[UUID] = None
    submitted_by_name: Optional[str] = None
    submitted_at: Optional[datetime] = None
    reviewed_by_id: Optional[UUID] = None
    reviewed_by_name: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    review_comments: Optional[str] = None
    student_count: int = 0
    marks: List[StudentMarkResponse] = []

    model_config = ConfigDict(from_attributes=True)


class MarksSubmissionReviewRequest(BaseModel):
    status: MarksSubmissionStatus = Field(..., description="APPROVED or RETURNED")
    review_comments: Optional[str] = Field(None, max_length=500)


# --- Student Report Card Schemas ---
class SubjectMarkReport(BaseModel):
    subject_id: UUID
    subject_name: str
    subject_code: str
    exam_date: Optional[date] = None
    max_marks: Decimal
    pass_marks: Decimal
    marks_obtained: Optional[Decimal] = None
    is_absent: bool = False
    percentage: Optional[Decimal] = None
    grade: Optional[str] = None
    grade_point: Optional[Decimal] = None
    remarks: Optional[str] = None
    is_passed: bool = True


class StudentReportCardResponse(BaseModel):
    student_id: UUID
    admission_number: str
    student_name: str
    class_name: str
    section_name: str
    roll_number: Optional[str] = None
    academic_year_name: str
    exam_id: UUID
    exam_name: str
    exam_type: ExamType
    subjects: List[SubjectMarkReport]
    total_max_marks: Decimal
    total_marks_obtained: Decimal
    overall_percentage: Decimal
    overall_grade: Optional[str] = None
    overall_grade_point: Optional[Decimal] = None
    class_rank: Optional[int] = None
    total_students_in_class: Optional[int] = None
    result_status: str  # PASS / FAIL / WITHHELD
    attendance_percentage: Optional[Decimal] = Decimal("95.5")  # Institutional metric
    issued_date: date
