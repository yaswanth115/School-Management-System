from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

from app.models.fee import InvoiceStatus, PaymentMethod, PaymentStatus


# --- Fee Type Schemas ---
class FeeTypeBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    code: str = Field(..., min_length=2, max_length=20)
    description: Optional[str] = None


class FeeTypeCreate(FeeTypeBase):
    pass


class FeeTypeUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class FeeTypeResponse(FeeTypeBase):
    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Fee Structure Schemas ---
class FeeStructureItemCreate(BaseModel):
    fee_type_id: UUID
    amount: Decimal = Field(..., ge=0)


class FeeStructureItemResponse(BaseModel):
    id: UUID
    fee_structure_id: UUID
    fee_type_id: UUID
    fee_type_name: Optional[str] = None
    fee_type_code: Optional[str] = None
    amount: Decimal

    model_config = ConfigDict(from_attributes=True)


class FeeStructureCreate(BaseModel):
    academic_year_id: UUID
    class_id: UUID
    name: str = Field(..., min_length=2, max_length=100)
    due_date: Optional[date] = None
    items: List[FeeStructureItemCreate] = []


class FeeStructureResponse(BaseModel):
    id: UUID
    academic_year_id: UUID
    academic_year_name: Optional[str] = None
    class_id: UUID
    class_name: Optional[str] = None
    name: str
    total_amount: Decimal
    due_date: Optional[date] = None
    is_active: bool
    created_at: datetime
    items: List[FeeStructureItemResponse] = []

    model_config = ConfigDict(from_attributes=True)


# --- Invoice Schemas ---
class InvoiceItemCreate(BaseModel):
    fee_type_id: UUID
    description: Optional[str] = None
    amount: Decimal = Field(..., ge=0)


class InvoiceItemResponse(BaseModel):
    id: UUID
    invoice_id: UUID
    fee_type_id: UUID
    fee_type_name: Optional[str] = None
    fee_type_code: Optional[str] = None
    description: Optional[str] = None
    amount: Decimal

    model_config = ConfigDict(from_attributes=True)


class InvoiceCreate(BaseModel):
    student_id: UUID
    academic_year_id: UUID
    title: str = Field(..., min_length=2, max_length=150)
    discount_amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    due_date: date
    notes: Optional[str] = None
    items: List[InvoiceItemCreate]


class ClassInvoiceGenerateRequest(BaseModel):
    class_id: UUID
    academic_year_id: UUID
    fee_structure_id: UUID
    title: Optional[str] = None
    due_date: Optional[date] = None
    discount_amount: Decimal = Field(default=Decimal("0.00"), ge=0)


# --- Payment Schemas ---
class PaymentCreate(BaseModel):
    invoice_id: UUID
    amount: Decimal = Field(..., gt=0)
    payment_method: PaymentMethod = PaymentMethod.CASH
    transaction_reference: Optional[str] = None
    payment_date: Optional[datetime] = None
    notes: Optional[str] = None


class PaymentRefundCreate(BaseModel):
    amount: Decimal = Field(..., gt=0)
    reason: str = Field(..., min_length=3, max_length=500)


class PaymentRefundResponse(BaseModel):
    id: UUID
    payment_id: UUID
    refund_number: str
    amount: Decimal
    reason: str
    approved_by_id: Optional[UUID] = None
    approved_by_name: Optional[str] = None
    refund_date: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaymentResponse(BaseModel):
    id: UUID
    receipt_number: str
    invoice_id: UUID
    invoice_number: Optional[str] = None
    student_id: UUID
    student_name: Optional[str] = None
    admission_number: Optional[str] = None
    amount: Decimal
    payment_method: PaymentMethod
    payment_date: datetime
    transaction_reference: Optional[str] = None
    collected_by_id: Optional[UUID] = None
    collected_by_name: Optional[str] = None
    status: PaymentStatus
    notes: Optional[str] = None
    created_at: datetime
    refunds: List[PaymentRefundResponse] = []

    model_config = ConfigDict(from_attributes=True)


class InvoiceResponse(BaseModel):
    id: UUID
    invoice_number: str
    student_id: UUID
    student_name: Optional[str] = None
    admission_number: Optional[str] = None
    class_name: Optional[str] = None
    section_name: Optional[str] = None
    academic_year_id: UUID
    academic_year_name: Optional[str] = None
    title: str
    subtotal: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    paid_amount: Decimal
    balance_amount: Decimal
    status: InvoiceStatus
    issue_date: date
    due_date: date
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InvoiceDetailResponse(InvoiceResponse):
    items: List[InvoiceItemResponse] = []
    payments: List[PaymentResponse] = []


# --- Financial Summary Report ---
class FeeSummaryReportResponse(BaseModel):
    today_collection: Decimal
    month_collection: Decimal
    total_collected: Decimal
    total_outstanding: Decimal
    total_invoiced: Decimal
    paid_invoices_count: int
    partially_paid_invoices_count: int
    unpaid_invoices_count: int
    overdue_invoices_count: int
