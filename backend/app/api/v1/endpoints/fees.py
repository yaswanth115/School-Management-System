import math
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.role import RoleEnum
from app.models.user import User
from app.models.student import Student, Guardian, StudentGuardian
from app.models.fee import (
    InvoiceStatus,
    PaymentMethod,
    PaymentStatus,
)
from app.schemas.common import PaginatedResponse
from app.schemas.fee import (
    FeeTypeCreate,
    FeeTypeUpdate,
    FeeTypeResponse,
    FeeStructureCreate,
    FeeStructureResponse,
    InvoiceCreate,
    ClassInvoiceGenerateRequest,
    InvoiceResponse,
    InvoiceDetailResponse,
    PaymentCreate,
    PaymentResponse,
    PaymentRefundCreate,
    PaymentRefundResponse,
    FeeSummaryReportResponse,
)
from app.services.fee_service import FeeService
from app.services.audit_service import AuditService

router = APIRouter(prefix="/fees", tags=["Fee Management"])


def _format_invoice_response(inv) -> InvoiceResponse:
    class_name = None
    section_name = None
    if inv.student and inv.student.enrollment_history:
        latest = inv.student.enrollment_history[0]
        if latest.school_class:
            class_name = latest.school_class.name
        if latest.section:
            section_name = latest.section.name

    return InvoiceResponse(
        id=inv.id,
        invoice_number=inv.invoice_number,
        student_id=inv.student_id,
        student_name=inv.student.full_name if inv.student else None,
        admission_number=inv.student.admission_number if inv.student else None,
        class_name=class_name,
        section_name=section_name,
        academic_year_id=inv.academic_year_id,
        academic_year_name=inv.academic_year.name if inv.academic_year else None,
        title=inv.title,
        subtotal=inv.subtotal,
        discount_amount=inv.discount_amount,
        total_amount=inv.total_amount,
        paid_amount=inv.paid_amount,
        balance_amount=inv.balance_amount,
        status=inv.status,
        issue_date=inv.issue_date,
        due_date=inv.due_date,
        notes=inv.notes,
        created_at=inv.created_at,
    )


def _format_invoice_detail_response(inv) -> InvoiceDetailResponse:
    base = _format_invoice_response(inv)
    items = []
    for it in inv.items:
        items.append({
            "id": it.id,
            "invoice_id": it.invoice_id,
            "fee_type_id": it.fee_type_id,
            "fee_type_name": it.fee_type.name if it.fee_type else None,
            "fee_type_code": it.fee_type.code if it.fee_type else None,
            "description": it.description,
            "amount": it.amount,
        })

    payments = []
    for p in inv.payments:
        payments.append(_format_payment_response(p))

    return InvoiceDetailResponse(
        **base.model_dump(),
        items=items,
        payments=payments,
    )


def _format_payment_response(p) -> PaymentResponse:
    collected_name = p.collected_by.full_name if p.collected_by else None
    refunds = []
    for r in p.refunds:
        app_name = r.approved_by.full_name if r.approved_by else None
        refunds.append(
            PaymentRefundResponse(
                id=r.id,
                payment_id=r.payment_id,
                refund_number=r.refund_number,
                amount=r.amount,
                reason=r.reason,
                approved_by_id=r.approved_by_id,
                approved_by_name=app_name,
                refund_date=r.refund_date,
                created_at=r.created_at,
            )
        )

    return PaymentResponse(
        id=p.id,
        receipt_number=p.receipt_number,
        invoice_id=p.invoice_id,
        invoice_number=p.invoice.invoice_number if p.invoice else None,
        student_id=p.student_id,
        student_name=p.student.full_name if p.student else None,
        admission_number=p.student.admission_number if p.student else None,
        amount=p.amount,
        payment_method=p.payment_method,
        payment_date=p.payment_date,
        transaction_reference=p.transaction_reference,
        collected_by_id=p.collected_by_id,
        collected_by_name=collected_name,
        status=p.status,
        notes=p.notes,
        created_at=p.created_at,
        refunds=refunds,
    )


def _format_structure_response(struct) -> FeeStructureResponse:
    items = []
    for item in struct.items:
        items.append({
            "id": item.id,
            "fee_structure_id": item.fee_structure_id,
            "fee_type_id": item.fee_type_id,
            "fee_type_name": item.fee_type.name if item.fee_type else None,
            "fee_type_code": item.fee_type.code if item.fee_type else None,
            "amount": item.amount,
        })
    return FeeStructureResponse(
        id=struct.id,
        academic_year_id=struct.academic_year_id,
        academic_year_name=struct.academic_year.name if struct.academic_year else None,
        class_id=struct.class_id,
        class_name=struct.school_class.name if struct.school_class else None,
        name=struct.name,
        total_amount=struct.total_amount,
        due_date=struct.due_date,
        is_active=struct.is_active,
        created_at=struct.created_at,
        items=items,
    )


# ==========================================
# Fee Types Endpoints
# ==========================================
@router.get("/types", response_model=List[FeeTypeResponse])
def list_fee_types(
    active_only: bool = Query(False),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.PRINCIPAL, RoleEnum.ACCOUNTANT, RoleEnum.TEACHER)),
):
    """List all configured fee types / categories."""
    return FeeService.list_fee_types(db, active_only=active_only)


@router.post("/types", response_model=FeeTypeResponse, status_code=status.HTTP_201_CREATED)
def create_fee_type(
    req: FeeTypeCreate,
    http_req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.ACCOUNTANT)),
):
    """Create a new fee type (e.g. Tuition, Admission, Exam)."""
    try:
        fee_type = FeeService.create_fee_type(db, req)
        AuditService.log_event(
            db,
            action="FEE_TYPE_CREATE",
            resource_type="FeeType",
            user_id=current_user.id,
            resource_id=str(fee_type.id),
            details={"name": fee_type.name, "code": fee_type.code},
            ip_address=http_req.client.host if http_req.client else None,
        )
        return fee_type
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/types/{fee_type_id}", response_model=FeeTypeResponse)
def update_fee_type(
    fee_type_id: UUID,
    req: FeeTypeUpdate,
    http_req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.ACCOUNTANT)),
):
    """Update a fee type."""
    try:
        fee_type = FeeService.update_fee_type(db, fee_type_id, req)
        AuditService.log_event(
            db,
            action="FEE_TYPE_UPDATE",
            resource_type="FeeType",
            user_id=current_user.id,
            resource_id=str(fee_type.id),
            details=req.model_dump(exclude_unset=True),
            ip_address=http_req.client.host if http_req.client else None,
        )
        return fee_type
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ==========================================
# Fee Structures Endpoints
# ==========================================
@router.get("/structures", response_model=List[FeeStructureResponse])
def list_fee_structures(
    academic_year_id: Optional[UUID] = Query(None),
    class_id: Optional[UUID] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.PRINCIPAL, RoleEnum.ACCOUNTANT, RoleEnum.TEACHER)),
):
    """List fee structures filtered by academic year and class."""
    structures = FeeService.list_fee_structures(db, academic_year_id=academic_year_id, class_id=class_id)
    return [_format_structure_response(s) for s in structures]


@router.post("/structures", response_model=FeeStructureResponse, status_code=status.HTTP_201_CREATED)
def create_fee_structure(
    req: FeeStructureCreate,
    http_req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.ACCOUNTANT)),
):
    """Create a class-wise fee structure blueprint with line items."""
    try:
        structure = FeeService.create_fee_structure(db, req)
        # re-fetch for formatted response
        loaded = FeeService.get_fee_structure(db, structure.id)
        AuditService.log_event(
            db,
            action="FEE_STRUCTURE_CREATE",
            resource_type="FeeStructure",
            user_id=current_user.id,
            resource_id=str(structure.id),
            details={"name": structure.name, "total_amount": float(structure.total_amount)},
            ip_address=http_req.client.host if http_req.client else None,
        )
        return _format_structure_response(loaded)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ==========================================
# Invoice Endpoints
# ==========================================
@router.get("/invoices", response_model=PaginatedResponse[InvoiceResponse])
def list_invoices(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    student_id: Optional[UUID] = Query(None),
    class_id: Optional[UUID] = Query(None),
    status_filter: Optional[InvoiceStatus] = Query(None, alias="status"),
    academic_year_id: Optional[UUID] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List invoices with search, filters and pagination. Scoped for students/parents."""
    # Scope for Student / Parent
    scoped_student_id = student_id
    if current_user.role == RoleEnum.STUDENT:
        st = db.query(Student).filter(Student.user_id == current_user.id).first()
        scoped_student_id = st.id if st else UUID("00000000-0000-0000-0000-000000000000")
    elif current_user.role == RoleEnum.PARENT:
        g = db.query(Guardian).filter(Guardian.user_id == current_user.id).first()
        if g:
            sg = db.query(StudentGuardian).filter(StudentGuardian.guardian_id == g.id).first()
            scoped_student_id = sg.student_id if sg else UUID("00000000-0000-0000-0000-000000000000")
        else:
            scoped_student_id = UUID("00000000-0000-0000-0000-000000000000")

    skip = (page - 1) * page_size
    invoices, total = FeeService.list_invoices(
        db,
        skip=skip,
        limit=page_size,
        student_id=scoped_student_id,
        class_id=class_id,
        status=status_filter,
        academic_year_id=academic_year_id,
        search=search,
    )
    total_pages = math.ceil(total / page_size) if total > 0 else 0
    return PaginatedResponse[InvoiceResponse](
        items=[_format_invoice_response(inv) for inv in invoices],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post("/invoices", response_model=InvoiceDetailResponse, status_code=status.HTTP_201_CREATED)
def create_invoice(
    req: InvoiceCreate,
    http_req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.ACCOUNTANT)),
):
    """Create an individual invoice for a student."""
    try:
        inv = FeeService.create_invoice(db, req)
        loaded = FeeService.get_invoice(db, inv.id)
        AuditService.log_event(
            db,
            action="INVOICE_CREATE",
            resource_type="Invoice",
            user_id=current_user.id,
            resource_id=str(inv.id),
            details={"invoice_number": inv.invoice_number, "total_amount": float(inv.total_amount)},
            ip_address=http_req.client.host if http_req.client else None,
        )
        return _format_invoice_detail_response(loaded)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/invoices/generate-class", response_model=List[InvoiceResponse], status_code=status.HTTP_201_CREATED)
def generate_class_invoices(
    req: ClassInvoiceGenerateRequest,
    http_req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.ACCOUNTANT)),
):
    """Generate invoices for all enrolled students in a class based on a fee structure."""
    try:
        invoices = FeeService.generate_class_invoices(db, req)
        AuditService.log_event(
            db,
            action="CLASS_INVOICES_GENERATE",
            resource_type="Invoice",
            user_id=current_user.id,
            resource_id=str(req.class_id),
            details={"count": len(invoices), "structure_id": str(req.fee_structure_id)},
            ip_address=http_req.client.host if http_req.client else None,
        )
        return [_format_invoice_response(inv) for inv in invoices]
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/invoices/{invoice_id}", response_model=InvoiceDetailResponse)
def get_invoice_details(
    invoice_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get complete invoice details including line items and payment receipts."""
    inv = FeeService.get_invoice(db, invoice_id)
    if not inv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    # Scoping
    if current_user.role == RoleEnum.STUDENT and inv.student.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return _format_invoice_detail_response(inv)


# ==========================================
# Payments & Receipts Endpoints
# ==========================================
@router.post("/payments/collect", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def collect_payment(
    req: PaymentCreate,
    http_req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.ACCOUNTANT)),
):
    """Atomic payment collection with row-level locking on invoice and receipt generation."""
    try:
        payment = FeeService.collect_payment(db, req, collected_by_id=current_user.id)
        AuditService.log_event(
            db,
            action="PAYMENT_COLLECT",
            resource_type="Payment",
            user_id=current_user.id,
            resource_id=str(payment.id),
            details={
                "receipt_number": payment.receipt_number,
                "amount": float(payment.amount),
                "method": payment.payment_method,
            },
            ip_address=http_req.client.host if http_req.client else None,
        )
        return _format_payment_response(payment)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/payments", response_model=PaginatedResponse[PaymentResponse])
def list_payments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    student_id: Optional[UUID] = Query(None),
    invoice_id: Optional[UUID] = Query(None),
    payment_method: Optional[PaymentMethod] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List payment transactions with receipt numbers and status."""
    scoped_student_id = student_id
    if current_user.role == RoleEnum.STUDENT:
        st = db.query(Student).filter(Student.user_id == current_user.id).first()
        scoped_student_id = st.id if st else UUID("00000000-0000-0000-0000-000000000000")
    elif current_user.role == RoleEnum.PARENT:
        g = db.query(Guardian).filter(Guardian.user_id == current_user.id).first()
        if g:
            sg = db.query(StudentGuardian).filter(StudentGuardian.guardian_id == g.id).first()
            scoped_student_id = sg.student_id if sg else UUID("00000000-0000-0000-0000-000000000000")
        else:
            scoped_student_id = UUID("00000000-0000-0000-0000-000000000000")

    skip = (page - 1) * page_size
    payments, total = FeeService.list_payments(
        db,
        skip=skip,
        limit=page_size,
        student_id=scoped_student_id,
        invoice_id=invoice_id,
        payment_method=payment_method,
        search=search,
    )
    total_pages = math.ceil(total / page_size) if total > 0 else 0
    return PaginatedResponse[PaymentResponse](
        items=[_format_payment_response(p) for p in payments],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post("/payments/{payment_id}/refund", response_model=PaymentRefundResponse, status_code=status.HTTP_201_CREATED)
def refund_payment(
    payment_id: UUID,
    req: PaymentRefundCreate,
    http_req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.ACCOUNTANT)),
):
    """Process a controlled refund or reversal against a completed payment."""
    try:
        refund = FeeService.refund_payment(db, payment_id, req, approved_by_id=current_user.id)
        AuditService.log_event(
            db,
            action="PAYMENT_REFUND",
            resource_type="PaymentRefund",
            user_id=current_user.id,
            resource_id=str(refund.id),
            details={
                "refund_number": refund.refund_number,
                "amount": float(refund.amount),
                "reason": refund.reason,
            },
            ip_address=http_req.client.host if http_req.client else None,
        )
        app_name = current_user.full_name
        return PaymentRefundResponse(
            id=refund.id,
            payment_id=refund.payment_id,
            refund_number=refund.refund_number,
            amount=refund.amount,
            reason=refund.reason,
            approved_by_id=refund.approved_by_id,
            approved_by_name=app_name,
            refund_date=refund.refund_date,
            created_at=refund.created_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ==========================================
# Reports Endpoints
# ==========================================
@router.get("/reports/summary", response_model=FeeSummaryReportResponse)
def get_fee_summary_report(
    academic_year_id: Optional[UUID] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.PRINCIPAL, RoleEnum.ACCOUNTANT)),
):
    """Get high-level fee collection metrics and outstanding status."""
    summary = FeeService.get_financial_summary(db, academic_year_id=academic_year_id)
    return FeeSummaryReportResponse(**summary)
