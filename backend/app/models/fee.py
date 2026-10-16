from datetime import date, datetime, timezone
import enum
from sqlalchemy import Column, String, Date, DateTime, Boolean, ForeignKey, Numeric, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import TimeStampedModel


class InvoiceStatus(str, enum.Enum):
    UNPAID = "UNPAID"
    PARTIALLY_PAID = "PARTIALLY_PAID"
    PAID = "PAID"
    OVERDUE = "OVERDUE"
    CANCELLED = "CANCELLED"


class PaymentMethod(str, enum.Enum):
    CASH = "CASH"
    BANK_TRANSFER = "BANK_TRANSFER"
    UPI = "UPI"
    CHEQUE = "CHEQUE"
    CREDIT_CARD = "CREDIT_CARD"
    ONLINE_GATEWAY = "ONLINE_GATEWAY"


class PaymentStatus(str, enum.Enum):
    COMPLETED = "COMPLETED"
    REFUNDED = "REFUNDED"
    REVERSED = "REVERSED"


class FeeType(TimeStampedModel):
    """Category of fee, e.g. Tuition Fee, Admission Fee, Transport Fee."""
    __tablename__ = "fee_types"

    name = Column(String(100), unique=True, nullable=False)
    code = Column(String(20), unique=True, index=True, nullable=False)
    description = Column(String(255), nullable=True)

    def __repr__(self) -> str:
        return f"<FeeType {self.code}: {self.name}>"


class FeeStructure(TimeStampedModel):
    """Class-wise fee structure blueprint for an academic year."""
    __tablename__ = "fee_structures"

    academic_year_id = Column(UUID(as_uuid=True), ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False)
    class_id = Column(UUID(as_uuid=True), ForeignKey("school_classes.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    total_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    due_date = Column(Date, nullable=True)

    # Relationships
    academic_year = relationship("AcademicYear")
    school_class = relationship("SchoolClass")
    items = relationship("FeeStructureItem", back_populates="fee_structure", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<FeeStructure {self.name}: {self.total_amount}>"


class FeeStructureItem(TimeStampedModel):
    """Component line-item in a fee structure blueprint."""
    __tablename__ = "fee_structure_items"

    fee_structure_id = Column(UUID(as_uuid=True), ForeignKey("fee_structures.id", ondelete="CASCADE"), nullable=False)
    fee_type_id = Column(UUID(as_uuid=True), ForeignKey("fee_types.id", ondelete="RESTRICT"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)

    # Relationships
    fee_structure = relationship("FeeStructure", back_populates="items")
    fee_type = relationship("FeeType")

    def __repr__(self) -> str:
        return f"<FeeStructureItem {self.fee_type_id}: {self.amount}>"


class Invoice(TimeStampedModel):
    """Institutional billing invoice issued to a student."""
    __tablename__ = "invoices"

    invoice_number = Column(String(50), unique=True, index=True, nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    academic_year_id = Column(UUID(as_uuid=True), ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(150), nullable=False)
    subtotal = Column(Numeric(12, 2), default=0.00, nullable=False)
    discount_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    total_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    paid_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    balance_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    status = Column(
        SAEnum(InvoiceStatus, name="invoice_status_enum", native_enum=False),
        default=InvoiceStatus.UNPAID,
        nullable=False,
        index=True,
    )
    issue_date = Column(Date, default=date.today, nullable=False)
    due_date = Column(Date, nullable=False)
    notes = Column(String(500), nullable=True)

    # Relationships
    student = relationship("Student")
    academic_year = relationship("AcademicYear")
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="invoice", cascade="all, delete-orphan", order_by="desc(Payment.payment_date)")

    def __repr__(self) -> str:
        return f"<Invoice {self.invoice_number}: {self.total_amount} ({self.status})>"


class InvoiceItem(TimeStampedModel):
    """Breakdown line item on an invoice."""
    __tablename__ = "invoice_items"

    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False)
    fee_type_id = Column(UUID(as_uuid=True), ForeignKey("fee_types.id", ondelete="RESTRICT"), nullable=False)
    description = Column(String(255), nullable=True)
    amount = Column(Numeric(12, 2), nullable=False)

    # Relationships
    invoice = relationship("Invoice", back_populates="items")
    fee_type = relationship("FeeType")

    def __repr__(self) -> str:
        return f"<InvoiceItem {self.description}: {self.amount}>"


class Payment(TimeStampedModel):
    """Audited payment record collected towards an invoice."""
    __tablename__ = "payments"

    receipt_number = Column(String(50), unique=True, index=True, nullable=False)
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    payment_method = Column(
        SAEnum(PaymentMethod, name="payment_method_enum", native_enum=False),
        default=PaymentMethod.CASH,
        nullable=False,
    )
    payment_date = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    transaction_reference = Column(String(100), nullable=True)
    collected_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status = Column(
        SAEnum(PaymentStatus, name="payment_status_enum", native_enum=False),
        default=PaymentStatus.COMPLETED,
        nullable=False,
    )
    notes = Column(String(500), nullable=True)

    # Relationships
    invoice = relationship("Invoice", back_populates="payments")
    student = relationship("Student")
    collected_by = relationship("User")
    refunds = relationship("PaymentRefund", back_populates="payment", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Payment {self.receipt_number}: {self.amount}>"


class PaymentRefund(TimeStampedModel):
    """Controlled refund or reversal record against an existing payment."""
    __tablename__ = "payment_refunds"

    payment_id = Column(UUID(as_uuid=True), ForeignKey("payments.id", ondelete="CASCADE"), nullable=False, index=True)
    refund_number = Column(String(50), unique=True, index=True, nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    reason = Column(String(500), nullable=False)
    approved_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    refund_date = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    payment = relationship("Payment", back_populates="refunds")
    approved_by = relationship("User")

    def __repr__(self) -> str:
        return f"<PaymentRefund {self.refund_number}: {self.amount}>"
