from datetime import date, datetime, time, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func, or_

from app.models.fee import (
    FeeType,
    FeeStructure,
    FeeStructureItem,
    Invoice,
    InvoiceItem,
    Payment,
    PaymentRefund,
    InvoiceStatus,
    PaymentMethod,
    PaymentStatus,
)
from app.models.student import Student, EnrollmentHistory, EnrollmentStatus
from app.models.academic_year import AcademicYear
from app.models.academic import SchoolClass, Section
from app.models.user import User
from app.schemas.fee import (
    FeeTypeCreate,
    FeeTypeUpdate,
    FeeStructureCreate,
    InvoiceCreate,
    ClassInvoiceGenerateRequest,
    PaymentCreate,
    PaymentRefundCreate,
)


class FeeService:

    @staticmethod
    def generate_invoice_number(db: Session, year: Optional[int] = None) -> str:
        current_year = year or date.today().year
        prefix = f"INV-{current_year}-"
        count = (
            db.query(func.count(Invoice.id))
            .filter(Invoice.invoice_number.like(f"{prefix}%"))
            .scalar()
            or 0
        )
        candidate = f"{prefix}{count + 1:04d}"
        while db.query(Invoice).filter(Invoice.invoice_number == candidate).first():
            count += 1
            candidate = f"{prefix}{count + 1:04d}"
        return candidate

    @staticmethod
    def generate_receipt_number(db: Session, year: Optional[int] = None) -> str:
        current_year = year or date.today().year
        prefix = f"REC-{current_year}-"
        count = (
            db.query(func.count(Payment.id))
            .filter(Payment.receipt_number.like(f"{prefix}%"))
            .scalar()
            or 0
        )
        candidate = f"{prefix}{count + 1:04d}"
        while db.query(Payment).filter(Payment.receipt_number == candidate).first():
            count += 1
            candidate = f"{prefix}{count + 1:04d}"
        return candidate

    @staticmethod
    def generate_refund_number(db: Session, year: Optional[int] = None) -> str:
        current_year = year or date.today().year
        prefix = f"REF-{current_year}-"
        count = (
            db.query(func.count(PaymentRefund.id))
            .filter(PaymentRefund.refund_number.like(f"{prefix}%"))
            .scalar()
            or 0
        )
        candidate = f"{prefix}{count + 1:04d}"
        while db.query(PaymentRefund).filter(PaymentRefund.refund_number == candidate).first():
            count += 1
            candidate = f"{prefix}{count + 1:04d}"
        return candidate

    # --- Fee Types ---
    @staticmethod
    def create_fee_type(db: Session, req: FeeTypeCreate) -> FeeType:
        existing = db.query(FeeType).filter(
            or_(
                FeeType.name.ilike(req.name.strip()),
                FeeType.code.ilike(req.code.strip()),
            )
        ).first()
        if existing:
            raise ValueError(f"Fee type with name '{req.name}' or code '{req.code}' already exists")

        fee_type = FeeType(
            name=req.name.strip(),
            code=req.code.strip().upper(),
            description=req.description.strip() if req.description else None,
        )
        db.add(fee_type)
        db.commit()
        db.refresh(fee_type)
        return fee_type

    @staticmethod
    def list_fee_types(db: Session, active_only: bool = False) -> List[FeeType]:
        query = db.query(FeeType)
        if active_only:
            query = query.filter(FeeType.is_active == True)
        return query.order_by(FeeType.name).all()

    @staticmethod
    def update_fee_type(db: Session, fee_type_id: UUID, req: FeeTypeUpdate) -> FeeType:
        fee_type = db.query(FeeType).filter(FeeType.id == fee_type_id).first()
        if not fee_type:
            raise ValueError("Fee type not found")

        if req.name is not None:
            fee_type.name = req.name.strip()
        if req.code is not None:
            fee_type.code = req.code.strip().upper()
        if req.description is not None:
            fee_type.description = req.description.strip()
        if req.is_active is not None:
            fee_type.is_active = req.is_active

        db.commit()
        db.refresh(fee_type)
        return fee_type

    # --- Fee Structures ---
    @staticmethod
    def create_fee_structure(db: Session, req: FeeStructureCreate) -> FeeStructure:
        total = sum(item.amount for item in req.items)
        structure = FeeStructure(
            academic_year_id=req.academic_year_id,
            class_id=req.class_id,
            name=req.name.strip(),
            total_amount=total,
            due_date=req.due_date,
        )
        db.add(structure)
        db.flush()

        for item in req.items:
            structure_item = FeeStructureItem(
                fee_structure_id=structure.id,
                fee_type_id=item.fee_type_id,
                amount=item.amount,
            )
            db.add(structure_item)

        db.commit()
        db.refresh(structure)
        return structure

    @staticmethod
    def list_fee_structures(
        db: Session,
        academic_year_id: Optional[UUID] = None,
        class_id: Optional[UUID] = None,
    ) -> List[FeeStructure]:
        query = (
            db.query(FeeStructure)
            .options(
                joinedload(FeeStructure.school_class),
                joinedload(FeeStructure.academic_year),
                joinedload(FeeStructure.items).joinedload(FeeStructureItem.fee_type),
            )
            .filter(FeeStructure.is_active == True)
        )
        if academic_year_id:
            query = query.filter(FeeStructure.academic_year_id == academic_year_id)
        if class_id:
            query = query.filter(FeeStructure.class_id == class_id)

        return query.order_by(FeeStructure.created_at.desc()).all()

    @staticmethod
    def get_fee_structure(db: Session, fee_structure_id: UUID) -> Optional[FeeStructure]:
        return (
            db.query(FeeStructure)
            .options(
                joinedload(FeeStructure.school_class),
                joinedload(FeeStructure.academic_year),
                joinedload(FeeStructure.items).joinedload(FeeStructureItem.fee_type),
            )
            .filter(FeeStructure.id == fee_structure_id)
            .first()
        )

    # --- Invoices ---
    @staticmethod
    def create_invoice(db: Session, req: InvoiceCreate) -> Invoice:
        if not req.items:
            raise ValueError("Invoice must contain at least one line item")

        subtotal = sum(item.amount for item in req.items)
        if req.discount_amount > subtotal:
            raise ValueError("Discount cannot exceed invoice subtotal")

        total = subtotal - req.discount_amount
        invoice_no = FeeService.generate_invoice_number(db)

        status = InvoiceStatus.PAID if total == Decimal("0.00") else InvoiceStatus.UNPAID

        invoice = Invoice(
            invoice_number=invoice_no,
            student_id=req.student_id,
            academic_year_id=req.academic_year_id,
            title=req.title.strip(),
            subtotal=subtotal,
            discount_amount=req.discount_amount,
            total_amount=total,
            paid_amount=Decimal("0.00"),
            balance_amount=total,
            status=status,
            issue_date=date.today(),
            due_date=req.due_date,
            notes=req.notes.strip() if req.notes else None,
        )
        db.add(invoice)
        db.flush()

        for item in req.items:
            invoice_item = InvoiceItem(
                invoice_id=invoice.id,
                fee_type_id=item.fee_type_id,
                description=item.description.strip() if item.description else None,
                amount=item.amount,
            )
            db.add(invoice_item)

        db.commit()
        db.refresh(invoice)
        return invoice

    @staticmethod
    def generate_class_invoices(db: Session, req: ClassInvoiceGenerateRequest) -> List[Invoice]:
        structure = (
            db.query(FeeStructure)
            .options(joinedload(FeeStructure.items))
            .filter(FeeStructure.id == req.fee_structure_id)
            .first()
        )
        if not structure:
            raise ValueError("Fee structure not found")
        if not structure.items:
            raise ValueError("Selected fee structure has no line items")

        # Find all students currently enrolled in this class and academic year
        enrollments = (
            db.query(EnrollmentHistory)
            .filter(
                EnrollmentHistory.class_id == req.class_id,
                EnrollmentHistory.academic_year_id == req.academic_year_id,
                EnrollmentHistory.status == EnrollmentStatus.ENROLLED,
            )
            .all()
        )

        student_ids = [e.student_id for e in enrollments]
        if not student_ids:
            # Fallback: check all active students whose latest enrollment matches
            student_ids = [
                row[0]
                for row in db.query(EnrollmentHistory.student_id)
                .filter(EnrollmentHistory.class_id == req.class_id)
                .distinct()
                .all()
            ]

        if not student_ids:
            raise ValueError("No enrolled students found for the specified class")

        generated_invoices = []
        subtotal = sum(item.amount for item in structure.items)
        discount = req.discount_amount or Decimal("0.00")
        total = subtotal - discount
        due_dt = req.due_date or structure.due_date or (date.today())
        title = req.title or structure.name

        for student_id in student_ids:
            invoice_no = FeeService.generate_invoice_number(db)
            invoice = Invoice(
                invoice_number=invoice_no,
                student_id=student_id,
                academic_year_id=req.academic_year_id,
                title=title,
                subtotal=subtotal,
                discount_amount=discount,
                total_amount=total,
                paid_amount=Decimal("0.00"),
                balance_amount=total,
                status=InvoiceStatus.PAID if total == Decimal("0.00") else InvoiceStatus.UNPAID,
                issue_date=date.today(),
                due_date=due_dt,
                notes=f"Auto-generated from fee structure: {structure.name}",
            )
            db.add(invoice)
            db.flush()

            for s_item in structure.items:
                inv_item = InvoiceItem(
                    invoice_id=invoice.id,
                    fee_type_id=s_item.fee_type_id,
                    description=None,
                    amount=s_item.amount,
                )
                db.add(inv_item)

            generated_invoices.append(invoice)

        db.commit()
        return generated_invoices

    @staticmethod
    def list_invoices(
        db: Session,
        skip: int = 0,
        limit: int = 50,
        student_id: Optional[UUID] = None,
        class_id: Optional[UUID] = None,
        status: Optional[InvoiceStatus] = None,
        academic_year_id: Optional[UUID] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[Invoice], int]:
        # Pre-check for overdue invoices and update their status if due date passed
        today = date.today()
        overdue_invoices = (
            db.query(Invoice)
            .filter(
                Invoice.due_date < today,
                Invoice.balance_amount > Decimal("0.00"),
                Invoice.status.in_([InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID]),
            )
            .all()
        )
        if overdue_invoices:
            for inv in overdue_invoices:
                inv.status = InvoiceStatus.OVERDUE
            db.commit()

        query = (
            db.query(Invoice)
            .join(Student, Invoice.student_id == Student.id)
            .join(AcademicYear, Invoice.academic_year_id == AcademicYear.id)
            .options(
                joinedload(Invoice.student).joinedload(Student.enrollment_history).joinedload(EnrollmentHistory.school_class),
                joinedload(Invoice.student).joinedload(Student.enrollment_history).joinedload(EnrollmentHistory.section),
                joinedload(Invoice.academic_year),
            )
        )

        if student_id:
            query = query.filter(Invoice.student_id == student_id)
        if academic_year_id:
            query = query.filter(Invoice.academic_year_id == academic_year_id)
        if status:
            query = query.filter(Invoice.status == status)

        if class_id:
            query = query.join(
                EnrollmentHistory,
                (EnrollmentHistory.student_id == Student.id)
                & (EnrollmentHistory.class_id == class_id)
                & (EnrollmentHistory.status == EnrollmentStatus.ENROLLED),
            )

        if search:
            search_term = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Invoice.invoice_number.ilike(search_term),
                    Invoice.title.ilike(search_term),
                    Student.first_name.ilike(search_term),
                    Student.last_name.ilike(search_term),
                    Student.admission_number.ilike(search_term),
                )
            )

        total = query.count()
        invoices = (
            query.order_by(desc(Invoice.issue_date), desc(Invoice.created_at))
            .offset(skip)
            .limit(limit)
            .all()
        )
        return invoices, total

    @staticmethod
    def get_invoice(db: Session, invoice_id: UUID) -> Optional[Invoice]:
        # Update overdue if needed
        inv = (
            db.query(Invoice)
            .options(
                joinedload(Invoice.student).joinedload(Student.enrollment_history).joinedload(EnrollmentHistory.school_class),
                joinedload(Invoice.student).joinedload(Student.enrollment_history).joinedload(EnrollmentHistory.section),
                joinedload(Invoice.academic_year),
                joinedload(Invoice.items).joinedload(InvoiceItem.fee_type),
                joinedload(Invoice.payments).joinedload(Payment.collected_by),
                joinedload(Invoice.payments).joinedload(Payment.refunds),
            )
            .filter(Invoice.id == invoice_id)
            .first()
        )
        if inv and inv.due_date < date.today() and inv.balance_amount > 0 and inv.status in (InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID):
            inv.status = InvoiceStatus.OVERDUE
            db.commit()
            db.refresh(inv)
        return inv

    # --- Payments & Atomic Collection ---
    @staticmethod
    def collect_payment(
        db: Session,
        req: PaymentCreate,
        collected_by_id: Optional[UUID] = None,
    ) -> Payment:
        # Atomic lock on the invoice row to prevent concurrent race conditions
        invoice = (
            db.query(Invoice)
            .filter(Invoice.id == req.invoice_id)
            .with_for_update()
            .first()
        )
        if not invoice:
            raise ValueError("Invoice not found")

        if invoice.status == InvoiceStatus.CANCELLED:
            raise ValueError("Cannot collect payment for a cancelled invoice")

        if invoice.balance_amount <= Decimal("0.00") or invoice.status == InvoiceStatus.PAID:
            raise ValueError("Invoice is already fully paid")

        if req.amount > invoice.balance_amount:
            raise ValueError(
                f"Payment amount (₹{req.amount:,.2f}) exceeds outstanding balance (₹{invoice.balance_amount:,.2f})"
            )

        receipt_number = FeeService.generate_receipt_number(db)
        payment = Payment(
            receipt_number=receipt_number,
            invoice_id=invoice.id,
            student_id=invoice.student_id,
            amount=req.amount,
            payment_method=req.payment_method,
            payment_date=req.payment_date or datetime.now(timezone.utc),
            transaction_reference=req.transaction_reference.strip() if req.transaction_reference else None,
            collected_by_id=collected_by_id,
            status=PaymentStatus.COMPLETED,
            notes=req.notes.strip() if req.notes else None,
        )
        db.add(payment)

        # Update invoice balance and status
        invoice.paid_amount += req.amount
        invoice.balance_amount -= req.amount

        if invoice.balance_amount == Decimal("0.00"):
            invoice.status = InvoiceStatus.PAID
        else:
            invoice.status = InvoiceStatus.PARTIALLY_PAID

        db.commit()
        db.refresh(payment)
        return payment

    @staticmethod
    def list_payments(
        db: Session,
        skip: int = 0,
        limit: int = 50,
        student_id: Optional[UUID] = None,
        invoice_id: Optional[UUID] = None,
        payment_method: Optional[PaymentMethod] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[Payment], int]:
        query = (
            db.query(Payment)
            .join(Invoice, Payment.invoice_id == Invoice.id)
            .join(Student, Payment.student_id == Student.id)
            .options(
                joinedload(Payment.invoice),
                joinedload(Payment.student),
                joinedload(Payment.collected_by),
                joinedload(Payment.refunds),
            )
        )
        if student_id:
            query = query.filter(Payment.student_id == student_id)
        if invoice_id:
            query = query.filter(Payment.invoice_id == invoice_id)
        if payment_method:
            query = query.filter(Payment.payment_method == payment_method)
        if search:
            search_term = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Payment.receipt_number.ilike(search_term),
                    Payment.transaction_reference.ilike(search_term),
                    Invoice.invoice_number.ilike(search_term),
                    Student.first_name.ilike(search_term),
                    Student.last_name.ilike(search_term),
                    Student.admission_number.ilike(search_term),
                )
            )

        total = query.count()
        payments = (
            query.order_by(desc(Payment.payment_date), desc(Payment.created_at))
            .offset(skip)
            .limit(limit)
            .all()
        )
        return payments, total

    @staticmethod
    def refund_payment(
        db: Session,
        payment_id: UUID,
        req: PaymentRefundCreate,
        approved_by_id: Optional[UUID] = None,
    ) -> PaymentRefund:
        # Atomic lock on payment
        payment = (
            db.query(Payment)
            .filter(Payment.id == payment_id)
            .with_for_update()
            .first()
        )
        if not payment:
            raise ValueError("Payment record not found")

        if payment.status == PaymentStatus.REVERSED:
            raise ValueError("Payment is already reversed")

        # Check total refunded amount so far
        already_refunded = (
            db.query(func.coalesce(func.sum(PaymentRefund.amount), Decimal("0.00")))
            .filter(PaymentRefund.payment_id == payment_id)
            .scalar()
            or Decimal("0.00")
        )

        max_refundable = payment.amount - already_refunded
        if req.amount > max_refundable:
            raise ValueError(
                f"Refund amount (₹{req.amount:,.2f}) exceeds refundable amount (₹{max_refundable:,.2f})"
            )

        # Atomic lock on invoice
        invoice = (
            db.query(Invoice)
            .filter(Invoice.id == payment.invoice_id)
            .with_for_update()
            .first()
        )
        if not invoice:
            raise ValueError("Invoice associated with payment not found")

        refund_no = FeeService.generate_refund_number(db)
        refund = PaymentRefund(
            payment_id=payment.id,
            refund_number=refund_no,
            amount=req.amount,
            reason=req.reason.strip(),
            approved_by_id=approved_by_id,
            refund_date=datetime.now(timezone.utc),
        )
        db.add(refund)

        # Reverse balance on invoice
        invoice.paid_amount -= req.amount
        invoice.balance_amount += req.amount

        if invoice.balance_amount == invoice.total_amount:
            invoice.status = (
                InvoiceStatus.OVERDUE
                if invoice.due_date < date.today()
                else InvoiceStatus.UNPAID
            )
        else:
            invoice.status = (
                InvoiceStatus.OVERDUE
                if invoice.due_date < date.today()
                else InvoiceStatus.PARTIALLY_PAID
            )

        if (already_refunded + req.amount) >= payment.amount:
            payment.status = PaymentStatus.REFUNDED

        db.commit()
        db.refresh(refund)
        return refund

    # --- Financial Summary Report ---
    @staticmethod
    def get_financial_summary(
        db: Session,
        academic_year_id: Optional[UUID] = None,
    ) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        today_start = datetime.combine(date.today(), time.min).replace(tzinfo=timezone.utc)
        month_start = datetime.combine(date(now.year, now.month, 1), time.min).replace(tzinfo=timezone.utc)

        # Today's collections
        today_col = (
            db.query(func.coalesce(func.sum(Payment.amount), Decimal("0.00")))
            .filter(
                Payment.status != PaymentStatus.REVERSED,
                Payment.payment_date >= today_start,
            )
            .scalar()
            or Decimal("0.00")
        )

        # Month's collections
        month_col = (
            db.query(func.coalesce(func.sum(Payment.amount), Decimal("0.00")))
            .filter(
                Payment.status != PaymentStatus.REVERSED,
                Payment.payment_date >= month_start,
            )
            .scalar()
            or Decimal("0.00")
        )

        # Invoice totals
        inv_query = db.query(Invoice).filter(Invoice.status != InvoiceStatus.CANCELLED)
        if academic_year_id:
            inv_query = inv_query.filter(Invoice.academic_year_id == academic_year_id)

        invoices = inv_query.all()
        total_invoiced = sum((inv.total_amount for inv in invoices), Decimal("0.00"))
        total_collected = sum((inv.paid_amount for inv in invoices), Decimal("0.00"))
        total_outstanding = sum((inv.balance_amount for inv in invoices), Decimal("0.00"))

        paid_count = sum(1 for inv in invoices if inv.status == InvoiceStatus.PAID)
        partially_paid_count = sum(1 for inv in invoices if inv.status == InvoiceStatus.PARTIALLY_PAID)
        unpaid_count = sum(1 for inv in invoices if inv.status == InvoiceStatus.UNPAID)
        overdue_count = sum(1 for inv in invoices if inv.status == InvoiceStatus.OVERDUE)

        return {
            "today_collection": today_col,
            "month_collection": month_col,
            "total_collected": total_collected,
            "total_outstanding": total_outstanding,
            "total_invoiced": total_invoiced,
            "paid_invoices_count": paid_count,
            "partially_paid_invoices_count": partially_paid_count,
            "unpaid_invoices_count": unpaid_count,
            "overdue_invoices_count": overdue_count,
        }
