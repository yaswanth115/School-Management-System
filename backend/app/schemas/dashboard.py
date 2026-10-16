from datetime import date
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, ConfigDict

from app.models.role import RoleEnum
from app.models.notice import NoticeAudience


class DashboardNoticeItem(BaseModel):
    id: UUID
    title: str
    target_audience: NoticeAudience
    publish_date: date
    is_pinned: bool
    author_name: str

    model_config = ConfigDict(from_attributes=True)


class AdminDashboardStats(BaseModel):
    role: RoleEnum = RoleEnum.ADMIN
    total_students: int
    total_teachers: int
    total_classes: int
    today_attendance_percentage: float
    total_fees_collected: float
    total_fees_pending: float
    pending_marks_reviews: int
    active_notices_count: int
    recent_notices: List[DashboardNoticeItem]
    recent_activities: List[Dict[str, Any]]


class AccountantDashboardStats(BaseModel):
    role: RoleEnum = RoleEnum.ACCOUNTANT
    total_invoiced: float
    total_collected: float
    total_outstanding: float
    total_invoices_count: int
    overdue_invoices_count: int
    recent_payments: List[Dict[str, Any]]
    recent_notices: List[DashboardNoticeItem]


class TeacherDashboardStats(BaseModel):
    role: RoleEnum = RoleEnum.TEACHER
    assigned_classes_count: int
    total_students_taught: int
    today_attendance_marked: bool
    pending_marks_entry: int
    today_periods: List[Dict[str, Any]]
    recent_notices: List[DashboardNoticeItem]


class ParentDashboardStats(BaseModel):
    role: RoleEnum = RoleEnum.PARENT
    children_count: int
    children: List[Dict[str, Any]]
    total_outstanding_fees: float
    recent_notices: List[DashboardNoticeItem]


class StudentDashboardStats(BaseModel):
    role: RoleEnum = RoleEnum.STUDENT
    attendance_percentage: float
    today_periods: List[Dict[str, Any]]
    fee_balance: float
    recent_exam_score: Optional[str] = None
    recent_notices: List[DashboardNoticeItem]
