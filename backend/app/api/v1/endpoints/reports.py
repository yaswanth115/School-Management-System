from typing import Optional, Dict, Any
from uuid import UUID
from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.role import RoleEnum
from app.models.user import User
from app.services.report_service import ReportService

router = APIRouter(prefix="/reports", tags=["Reports & Data Exports"])


@router.get("/students")
def get_student_demographics_report(
    class_id: Optional[UUID] = Query(None, description="Filter by class"),
    section_id: Optional[UUID] = Query(None, description="Filter by section"),
    export: Optional[str] = Query(None, description="Set to 'csv' to download RFC 4180 CSV spreadsheet"),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.PRINCIPAL, RoleEnum.TEACHER, RoleEnum.ACCOUNTANT)),
):
    """
    Produce institutional student enrollment, gender distribution, and classroom placement report.
    Supports on-screen JSON view or instant CSV download.
    """
    json_data, csv_data = ReportService.generate_student_demographics_report(
        db, class_id=class_id, section_id=section_id
    )

    if export == "csv":
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=student_demographics_report.csv"},
        )
    return json_data


@router.get("/finances")
def get_financial_summary_report(
    academic_year_id: Optional[UUID] = Query(None, description="Filter by academic year"),
    export: Optional[str] = Query(None, description="Set to 'csv' to download RFC 4180 CSV spreadsheet"),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.PRINCIPAL, RoleEnum.ACCOUNTANT)),
):
    """
    Produce institutional fee collection ledgers, payment method breakdown, and overdue defaulters report.
    Supports on-screen JSON view or instant CSV download.
    """
    json_data, csv_data = ReportService.generate_financial_summary_report(
        db, academic_year_id=academic_year_id
    )

    if export == "csv":
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=fee_collection_report.csv"},
        )
    return json_data


@router.get("/examinations")
def get_examination_performance_report(
    exam_id: UUID = Query(..., description="Target exam ID"),
    class_id: Optional[UUID] = Query(None, description="Filter by class"),
    export: Optional[str] = Query(None, description="Set to 'csv' to download RFC 4180 CSV spreadsheet"),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.PRINCIPAL, RoleEnum.TEACHER)),
):
    """
    Produce examination score distributions, class averages, and top performer rankings.
    Supports on-screen JSON view or instant CSV download.
    """
    json_data, csv_data = ReportService.generate_examination_performance_report(
        db, exam_id=exam_id, class_id=class_id
    )

    if export == "csv":
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=exam_performance_report.csv"},
        )
    return json_data


@router.get("/attendance")
def get_attendance_analytics_report(
    year: Optional[int] = Query(None, description="Calendar year"),
    month: Optional[int] = Query(None, ge=1, le=12, description="Month number 1-12"),
    export: Optional[str] = Query(None, description="Set to 'csv' to download RFC 4180 CSV spreadsheet"),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleEnum.ADMIN, RoleEnum.PRINCIPAL, RoleEnum.TEACHER)),
):
    """
    Produce class-wise monthly attendance averages and list of chronic absenteeism (< 75% attendance).
    Supports on-screen JSON view or instant CSV download.
    """
    json_data, csv_data = ReportService.generate_attendance_analytics_report(
        db, year=year, month=month
    )

    if export == "csv":
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=attendance_analytics_report.csv"},
        )
    return json_data
