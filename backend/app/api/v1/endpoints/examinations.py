from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.role import RoleEnum
from app.models.user import User
from app.models.student import Student, Guardian, StudentGuardian
from app.models.examination import (
    ExamType,
    MarksSubmissionStatus,
    ExamSubmissionBatch,
)
from app.schemas.examination import (
    ExamCreate,
    ExamUpdate,
    ExamResponse,
    ExamScheduleCreate,
    ExamScheduleResponse,
    GradingScaleCreate,
    GradingScaleResponse,
    BatchMarksEntryRequest,
    StudentMarkResponse,
    ExamSubmissionBatchResponse,
    MarksSubmissionReviewRequest,
    StudentReportCardResponse,
)
from app.services.examination_service import ExaminationService
from app.services.audit_service import AuditService

router = APIRouter(prefix="/exams", tags=["Examinations & Marks"])


# ==========================================
# Examinations
# ==========================================
@router.get("", response_model=List[ExamResponse])
def list_exams(
    academic_year_id: Optional[UUID] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """List all exams for the specified or current academic year."""
    exams = ExaminationService.list_exams(db, academic_year_id=academic_year_id)
    return [
        ExamResponse(
            id=e.id,
            academic_year_id=e.academic_year_id,
            academic_year_name=e.academic_year.name if e.academic_year else None,
            name=e.name,
            exam_type=e.exam_type,
            start_date=e.start_date,
            end_date=e.end_date,
            description=e.description,
            is_active=e.is_active,
            created_at=e.created_at,
        )
        for e in exams
    ]


@router.post("", response_model=ExamResponse, status_code=status.HTTP_201_CREATED)
def create_exam(
    req: ExamCreate,
    http_req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.PRINCIPAL)),
):
    """Create a new institutional exam (e.g. Midterm, Final, Unit Test)."""
    try:
        exam = ExaminationService.create_exam(db, req)
        AuditService.log_event(
            db,
            action="EXAM_CREATE",
            resource_type="Exam",
            user_id=current_user.id,
            resource_id=str(exam.id),
            details={"name": exam.name, "exam_type": exam.exam_type},
            ip_address=http_req.client.host if http_req.client else None,
        )
        return ExamResponse(
            id=exam.id,
            academic_year_id=exam.academic_year_id,
            academic_year_name=exam.academic_year.name if exam.academic_year else None,
            name=exam.name,
            exam_type=exam.exam_type,
            start_date=exam.start_date,
            end_date=exam.end_date,
            description=exam.description,
            is_active=exam.is_active,
            created_at=exam.created_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{exam_id}", response_model=ExamResponse)
def get_exam(
    exam_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get exam details by ID."""
    exam = ExaminationService.get_exam(db, exam_id)
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")
    return ExamResponse(
        id=exam.id,
        academic_year_id=exam.academic_year_id,
        academic_year_name=exam.academic_year.name if exam.academic_year else None,
        name=exam.name,
        exam_type=exam.exam_type,
        start_date=exam.start_date,
        end_date=exam.end_date,
        description=exam.description,
        is_active=exam.is_active,
        created_at=exam.created_at,
    )


# ==========================================
# Exam Schedules (Timetable & Cutoffs)
# ==========================================
@router.get("/{exam_id}/schedules", response_model=List[ExamScheduleResponse])
def list_exam_schedules(
    exam_id: UUID,
    class_id: Optional[UUID] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """List subject exam schedules with max & pass marks."""
    schedules = ExaminationService.list_exam_schedules(db, exam_id=exam_id, class_id=class_id)
    return [
        ExamScheduleResponse(
            id=s.id,
            exam_id=s.exam_id,
            exam_name=s.exam.name if s.exam else None,
            class_id=s.class_id,
            class_name=s.school_class.name if s.school_class else None,
            subject_id=s.subject_id,
            subject_name=s.subject.name if s.subject else None,
            subject_code=s.subject.code if s.subject else None,
            exam_date=s.exam_date,
            start_time=s.start_time,
            end_time=s.end_time,
            max_marks=s.max_marks,
            pass_marks=s.pass_marks,
            room_number=s.room_number,
            created_at=s.created_at,
        )
        for s in schedules
    ]


@router.post("/{exam_id}/schedules", response_model=ExamScheduleResponse, status_code=status.HTTP_201_CREATED)
def create_exam_schedule(
    exam_id: UUID,
    req: ExamScheduleCreate,
    http_req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.PRINCIPAL)),
):
    """Add a subject exam schedule with max & pass cutoffs."""
    if req.exam_id != exam_id:
        req.exam_id = exam_id
    try:
        schedule = ExaminationService.create_exam_schedule(db, req)
        AuditService.log_event(
            db,
            action="EXAM_SCHEDULE_CREATE",
            resource_type="ExamSchedule",
            user_id=current_user.id,
            resource_id=str(schedule.id),
            details={"exam_id": str(exam_id), "subject_id": str(req.subject_id), "max_marks": float(schedule.max_marks)},
            ip_address=http_req.client.host if http_req.client else None,
        )
        return ExamScheduleResponse(
            id=schedule.id,
            exam_id=schedule.exam_id,
            exam_name=schedule.exam.name if schedule.exam else None,
            class_id=schedule.class_id,
            class_name=schedule.school_class.name if schedule.school_class else None,
            subject_id=schedule.subject_id,
            subject_name=schedule.subject.name if schedule.subject else None,
            subject_code=schedule.subject.code if schedule.subject else None,
            exam_date=schedule.exam_date,
            start_time=schedule.start_time,
            end_time=schedule.end_time,
            max_marks=schedule.max_marks,
            pass_marks=schedule.pass_marks,
            room_number=schedule.room_number,
            created_at=schedule.created_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ==========================================
# Grading Scale Configuration
# ==========================================
@router.get("/grading-scales", response_model=List[GradingScaleResponse])
def list_grading_scales(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """List configured grading scales and percentage rules."""
    scales = db.query(ExaminationService.get_default_grading_scale(db).__class__).all()
    return scales


@router.post("/grading-scales", response_model=GradingScaleResponse, status_code=status.HTTP_201_CREATED)
def create_grading_scale(
    req: GradingScaleCreate,
    http_req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.PRINCIPAL)),
):
    """Configure a new grading scale (e.g. CBSE 10-Point Scale)."""
    try:
        scale = ExaminationService.create_grading_scale(db, req)
        AuditService.log_event(
            db,
            action="GRADING_SCALE_CREATE",
            resource_type="GradingScale",
            user_id=current_user.id,
            resource_id=str(scale.id),
            details={"name": scale.name, "rules_count": len(scale.rules)},
            ip_address=http_req.client.host if http_req.client else None,
        )
        return scale
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ==========================================
# Marks Entry & Submission (Teachers / Admins)
# ==========================================
@router.get("/schedules/{schedule_id}/sections/{section_id}/marks", response_model=ExamSubmissionBatchResponse)
def get_marks_roster(
    schedule_id: UUID,
    section_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.PRINCIPAL, RoleEnum.TEACHER)),
):
    """Retrieve marks entry sheet for a subject schedule and section."""
    try:
        roster = ExaminationService.get_marks_roster(db, schedule_id=schedule_id, section_id=section_id)
        batch = roster["batch"]
        sched = roster["schedule"]
        sec = roster["section"]

        marks_list = [
            StudentMarkResponse(
                id=m["id"] or UUID("00000000-0000-0000-0000-000000000000"),
                exam_schedule_id=schedule_id,
                student_id=m["student_id"],
                student_name=m["student_name"],
                admission_number=m["admission_number"],
                roll_number=m["roll_number"],
                section_id=section_id,
                marks_obtained=m["marks_obtained"],
                is_absent=m["is_absent"],
                grade=m["grade"],
                grade_point=m["grade_point"],
                remarks=m["remarks"],
            )
            for m in roster["student_entries"]
        ]

        return ExamSubmissionBatchResponse(
            id=batch.id,
            exam_schedule_id=sched.id,
            exam_name=sched.exam.name if sched.exam else None,
            class_id=sched.class_id,
            class_name=sched.school_class.name if sched.school_class else None,
            section_id=sec.id,
            section_name=sec.name,
            subject_id=sched.subject_id,
            subject_name=sched.subject.name if sched.subject else None,
            max_marks=sched.max_marks,
            pass_marks=sched.pass_marks,
            status=batch.status,
            submitted_by_id=batch.submitted_by_id,
            submitted_by_name=batch.submitted_by.full_name if batch.submitted_by else None,
            submitted_at=batch.submitted_at,
            reviewed_by_id=batch.reviewed_by_id,
            reviewed_by_name=batch.reviewed_by.full_name if batch.reviewed_by else None,
            reviewed_at=batch.reviewed_at,
            review_comments=batch.review_comments,
            student_count=len(marks_list),
            marks=marks_list,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/schedules/{schedule_id}/sections/{section_id}/marks", response_model=ExamSubmissionBatchResponse)
def save_student_marks(
    schedule_id: UUID,
    section_id: UUID,
    req: BatchMarksEntryRequest,
    http_req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.PRINCIPAL, RoleEnum.TEACHER)),
):
    """Save draft marks or submit for principal approval (restricted to assigned teacher)."""
    try:
        batch = ExaminationService.save_marks(
            db,
            schedule_id=schedule_id,
            section_id=section_id,
            req=req,
            current_user=current_user,
        )
        AuditService.log_event(
            db,
            action="MARKS_SUBMIT" if req.is_submit else "MARKS_DRAFT_SAVE",
            resource_type="ExamSubmissionBatch",
            user_id=current_user.id,
            resource_id=str(batch.id),
            details={"schedule_id": str(schedule_id), "section_id": str(section_id), "status": batch.status},
            ip_address=http_req.client.host if http_req.client else None,
        )
        # Fetch updated roster
        return get_marks_roster(schedule_id, section_id, db, current_user)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ==========================================
# Principal Review & Approvals
# ==========================================
@router.get("/submissions/pending", response_model=List[ExamSubmissionBatchResponse])
def list_pending_submissions(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.PRINCIPAL)),
):
    """List marks submissions waiting for Principal approval."""
    batches = ExaminationService.list_pending_submissions(db)
    results = []
    for b in batches:
        sched = b.exam_schedule
        results.append(
            ExamSubmissionBatchResponse(
                id=b.id,
                exam_schedule_id=sched.id,
                exam_name=sched.exam.name if sched.exam else None,
                class_id=sched.class_id,
                class_name=sched.school_class.name if sched.school_class else None,
                section_id=b.section_id,
                section_name=b.section.name if b.section else None,
                subject_id=sched.subject_id,
                subject_name=sched.subject.name if sched.subject else None,
                max_marks=sched.max_marks,
                pass_marks=sched.pass_marks,
                status=b.status,
                submitted_by_id=b.submitted_by_id,
                submitted_by_name=b.submitted_by.full_name if b.submitted_by else None,
                submitted_at=b.submitted_at,
                reviewed_by_id=b.reviewed_by_id,
                reviewed_by_name=b.reviewed_by.full_name if b.reviewed_by else None,
                reviewed_at=b.reviewed_at,
                review_comments=b.review_comments,
                student_count=len(sched.marks) if sched.marks else 0,
                marks=[],
            )
        )
    return results


@router.get("/submissions/{batch_id}", response_model=ExamSubmissionBatchResponse)
def get_submission_batch(
    batch_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.PRINCIPAL)),
):
    """Retrieve full details and marks roster for a specific submission batch."""
    batch = db.query(ExamSubmissionBatch).filter(ExamSubmissionBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission batch not found")
    return get_marks_roster(batch.exam_schedule_id, batch.section_id, db, current_user)


@router.post("/submissions/{batch_id}/review", response_model=ExamSubmissionBatchResponse)
def review_submission_batch(
    batch_id: UUID,
    req: MarksSubmissionReviewRequest,
    http_req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.PRINCIPAL)),
):
    """Approve or return marks submission with feedback."""
    try:
        batch = ExaminationService.review_submission_batch(
            db,
            batch_id=batch_id,
            req=req,
            reviewer=current_user,
        )
        AuditService.log_event(
            db,
            action=f"MARKS_{batch.status}",
            resource_type="ExamSubmissionBatch",
            user_id=current_user.id,
            resource_id=str(batch.id),
            details={"status": batch.status, "comments": batch.review_comments},
            ip_address=http_req.client.host if http_req.client else None,
        )
        sched = batch.exam_schedule
        return ExamSubmissionBatchResponse(
            id=batch.id,
            exam_schedule_id=sched.id,
            exam_name=sched.exam.name if sched.exam else None,
            class_id=sched.class_id,
            class_name=sched.school_class.name if sched.school_class else None,
            section_id=batch.section_id,
            section_name=batch.section.name if batch.section else None,
            subject_id=sched.subject_id,
            subject_name=sched.subject.name if sched.subject else None,
            max_marks=sched.max_marks,
            pass_marks=sched.pass_marks,
            status=batch.status,
            submitted_by_id=batch.submitted_by_id,
            submitted_by_name=batch.submitted_by.full_name if batch.submitted_by else None,
            submitted_at=batch.submitted_at,
            reviewed_by_id=batch.reviewed_by_id,
            reviewed_by_name=batch.reviewed_by.full_name if batch.reviewed_by else None,
            reviewed_at=batch.reviewed_at,
            review_comments=batch.review_comments,
            student_count=0,
            marks=[],
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ==========================================
# Report Cards
# ==========================================
@router.get("/{exam_id}/report-cards/students/{student_id}", response_model=StudentReportCardResponse)
def get_student_report_card(
    exam_id: UUID,
    student_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate comprehensive student report card with grades and class rank."""
    # Scoping check for student / parent
    if current_user.role == RoleEnum.STUDENT:
        st = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not st or st.id != student_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    elif current_user.role == RoleEnum.PARENT:
        g = db.query(Guardian).filter(Guardian.user_id == current_user.id).first()
        if not g:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        sg = db.query(StudentGuardian).filter(StudentGuardian.guardian_id == g.id, StudentGuardian.student_id == student_id).first()
        if not sg:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this student's report card")

    try:
        return ExaminationService.generate_student_report_card(db, exam_id=exam_id, student_id=student_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
