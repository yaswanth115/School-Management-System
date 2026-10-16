from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class StudentDemographicsReport(BaseModel):
    total_students: int
    gender_distribution: Dict[str, int]
    class_distribution: List[Dict[str, Any]]
    status_distribution: Dict[str, int]
    students: List[Dict[str, Any]]


class FinancialSummaryReport(BaseModel):
    total_invoiced: float
    total_collected: float
    total_outstanding: float
    collection_percentage: float
    fee_type_breakdown: List[Dict[str, Any]]
    payment_method_breakdown: List[Dict[str, Any]]
    defaulters: List[Dict[str, Any]]


class ExaminationPerformanceReport(BaseModel):
    exam_name: str
    total_students_evaluated: int
    overall_pass_percentage: float
    class_averages: List[Dict[str, Any]]
    top_performers: List[Dict[str, Any]]


class AttendanceAnalyticsReport(BaseModel):
    academic_year_name: str
    month: Optional[int] = None
    year: Optional[int] = None
    class_attendance_summary: List[Dict[str, Any]]
    low_attendance_students: List[Dict[str, Any]]
