from datetime import date, time, datetime
from decimal import Decimal
from typing import List, Optional, Dict, Union
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

from app.models.timetable import DayOfWeek
from app.models.fee import PaymentMethod, InvoiceStatus


class ChildSummaryResponse(BaseModel):
    student_id: UUID
    admission_number: str
    full_name: str
    first_name: str
    last_name: str
    class_id: UUID
    class_name: str
    section_id: UUID
    section_name: str
    roll_number: Optional[str] = None
    photo_url: Optional[str] = None
    attendance_percentage: Decimal
    outstanding_fee_amount: Decimal
    is_primary_guardian: bool

    model_config = ConfigDict(from_attributes=True)


class TimetablePeriodResponse(BaseModel):
    id: UUID
    day_of_week: DayOfWeek
    period_number: int
    start_time: time
    end_time: time
    subject_id: UUID
    subject_name: str
    subject_code: str
    teacher_name: Optional[str] = None
    room_number: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ClassWeeklyTimetableResponse(BaseModel):
    class_id: UUID
    class_name: str
    section_id: UUID
    section_name: str
    academic_year_name: str
    periods: List[TimetablePeriodResponse]


class OnlinePaymentSimulationRequest(BaseModel):
    invoice_id: UUID
    amount: Decimal = Field(..., gt=0)
    payment_method: PaymentMethod = PaymentMethod.ONLINE_GATEWAY
    gateway_provider: Optional[str] = "Simulated Razorpay Gateway"
    transaction_reference: Optional[str] = None


class OnlinePaymentSimulationResponse(BaseModel):
    payment_id: UUID
    receipt_number: str
    invoice_id: UUID
    invoice_number: str
    amount_paid: Decimal
    remaining_balance: Decimal
    invoice_status: InvoiceStatus
    transaction_reference: str
    payment_date: Union[date, datetime]


class GuardianProfileItem(BaseModel):
    id: UUID
    full_name: str
    relationship_type: str
    email: Optional[str] = None
    phone: str
    occupation: Optional[str] = None
    is_primary: bool


class StudentAcademicProfileResponse(BaseModel):
    student_id: UUID
    admission_number: str
    full_name: str
    first_name: str
    last_name: str
    date_of_birth: date
    gender: str
    blood_group: Optional[str] = None
    admission_date: date
    photo_url: Optional[str] = None
    class_name: str
    section_name: str
    roll_number: Optional[str] = None
    academic_year_name: str
    guardians: List[GuardianProfileItem] = []
    attendance_percentage: Decimal
    outstanding_fee_amount: Decimal
