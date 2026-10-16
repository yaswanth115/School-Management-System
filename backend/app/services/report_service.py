import csv
import io
from datetime import date
from decimal import Decimal
from typing import Dict, Any, List, Optional, Tuple
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.academic_year import AcademicYear
from app.models.academic import SchoolClass, Section
from app.models.student import Student, EnrollmentHistory, EnrollmentStatus, StudentStatus
from app.models.fee import Invoice, InvoiceStatus, Payment, FeeType, FeeStructureItem
from app.models.examination import Exam, ExamSchedule, ExamSubmissionBatch, StudentMark, MarksSubmissionStatus
from app.models.attendance import AttendanceRegister, AttendanceRecord, AttendanceStatus
from app.services.examination_service import ExaminationService


class ReportService:

    @staticmethod
    def generate_student_demographics_report(
        db: Session,
        class_id: Optional[UUID] = None,
        section_id: Optional[UUID] = None,
    ) -> Tuple[Dict[str, Any], str]:
        """
        Produce student enrollment and demographics report with downloadable CSV.
        """
        query = (
            db.query(Student, EnrollmentHistory, SchoolClass, Section)
            .join(EnrollmentHistory, Student.id == EnrollmentHistory.student_id)
            .join(SchoolClass, EnrollmentHistory.class_id == SchoolClass.id)
            .join(Section, EnrollmentHistory.section_id == Section.id)
            .filter(EnrollmentHistory.status == EnrollmentStatus.ENROLLED)
        )

        if class_id:
            query = query.filter(EnrollmentHistory.class_id == class_id)
        if section_id:
            query = query.filter(EnrollmentHistory.section_id == section_id)

        rows = query.order_by(SchoolClass.numeric_order, Section.name, Student.last_name).all()

        total_students = len(rows)
        gender_distribution: Dict[str, int] = {"Male": 0, "Female": 0, "Other": 0}
        status_distribution: Dict[str, int] = {}
        class_groups: Dict[str, Dict[str, Any]] = {}

        student_list: List[Dict[str, Any]] = []

        for st, enh, sc, sec in rows:
            g = st.gender or "Other"
            gender_distribution[g] = gender_distribution.get(g, 0) + 1

            s_stat = st.status.value if hasattr(st.status, "value") else str(st.status)
            status_distribution[s_stat] = status_distribution.get(s_stat, 0) + 1

            cls_key = f"{sc.name} - {sec.name}"
            if cls_key not in class_groups:
                class_groups[cls_key] = {"class_name": sc.name, "section_name": sec.name, "total": 0, "male": 0, "female": 0}
            class_groups[cls_key]["total"] += 1
            if g == "Male":
                class_groups[cls_key]["male"] += 1
            elif g == "Female":
                class_groups[cls_key]["female"] += 1

            student_list.append({
                "admission_number": st.admission_number,
                "full_name": st.full_name,
                "class_name": sc.name,
                "section_name": sec.name,
                "roll_number": enh.roll_number,
                "gender": st.gender,
                "blood_group": st.blood_group,
                "date_of_birth": str(st.date_of_birth) if st.date_of_birth else None,
                "admission_date": str(st.admission_date) if st.admission_date else None,
                "status": s_stat,
            })

        json_data = {
            "total_students": total_students,
            "gender_distribution": gender_distribution,
            "class_distribution": list(class_groups.values()),
            "status_distribution": status_distribution,
            "students": student_list,
        }

        # Generate RFC 4180 CSV
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Admission Number", "Full Name", "Class", "Section", "Roll No", "Gender", "Blood Group", "DOB", "Admission Date", "Status"])
        for item in student_list:
            writer.writerow([
                item["admission_number"],
                item["full_name"],
                item["class_name"],
                item["section_name"],
                item["roll_number"] or "",
                item["gender"] or "",
                item["blood_group"] or "",
                item["date_of_birth"] or "",
                item["admission_date"] or "",
                item["status"],
            ])

        return json_data, output.getvalue()

    @staticmethod
    def generate_financial_summary_report(
        db: Session,
        academic_year_id: Optional[UUID] = None,
    ) -> Tuple[Dict[str, Any], str]:
        """
        Produce institutional financial fee collection and defaulters report with downloadable CSV.
        """
        inv_query = db.query(Invoice).filter(Invoice.status != InvoiceStatus.CANCELLED)
        if academic_year_id:
            inv_query = inv_query.filter(Invoice.academic_year_id == academic_year_id)

        invoices = inv_query.order_by(Invoice.due_date.asc()).all()

        total_invoiced = sum((inv.total_amount for inv in invoices), Decimal("0.00"))
        total_collected = sum((inv.paid_amount for inv in invoices), Decimal("0.00"))
        total_outstanding = sum((inv.balance_amount for inv in invoices), Decimal("0.00"))

        collection_pct = round(float((total_collected / total_invoiced) * 100), 1) if total_invoiced > 0 else 0.0

        # Fee type breakdown
        fee_type_map: Dict[str, Decimal] = {}
        for inv in invoices:
            for item in inv.items:
                name = item.fee_type.name if item.fee_type else "Other Fee"
                fee_type_map[name] = fee_type_map.get(name, Decimal("0.00")) + item.amount

        fee_type_breakdown = [{"fee_type_name": k, "total_amount": float(v)} for k, v in fee_type_map.items()]

        # Payment methods breakdown
        pay_query = db.query(Payment)
        if academic_year_id:
            pay_query = pay_query.join(Invoice, Payment.invoice_id == Invoice.id).filter(Invoice.academic_year_id == academic_year_id)
        payments = pay_query.all()

        method_map: Dict[str, Dict[str, Any]] = {}
        for p in payments:
            m = p.payment_method.value if hasattr(p.payment_method, "value") else str(p.payment_method)
            if m not in method_map:
                method_map[m] = {"method": m, "total_amount": 0.0, "count": 0}
            method_map[m]["total_amount"] += float(p.amount)
            method_map[m]["count"] += 1

        payment_method_breakdown = list(method_map.values())

        # Defaulters list (invoices with balance > 0)
        defaulters = []
        for inv in invoices:
            if inv.balance_amount > 0:
                student_name = inv.student.full_name if inv.student else "Student"
                adm_no = inv.student.admission_number if inv.student else "N/A"
                cls_name = "N/A"
                if inv.student and inv.student.enrollment_history:
                    active_en = next((e for e in inv.student.enrollment_history if e.status == EnrollmentStatus.ENROLLED), None)
                    if active_en and active_en.school_class:
                        cls_name = f"{active_en.school_class.name} - {active_en.section.name if active_en.section else ''}"

                defaulters.append({
                    "student_name": student_name,
                    "admission_number": adm_no,
                    "class_name": cls_name,
                    "invoice_number": inv.invoice_number,
                    "title": inv.title,
                    "total_amount": float(inv.total_amount),
                    "paid_amount": float(inv.paid_amount),
                    "balance_amount": float(inv.balance_amount),
                    "due_date": str(inv.due_date) if inv.due_date else None,
                    "status": inv.status.value if hasattr(inv.status, "value") else str(inv.status),
                })

        json_data = {
            "total_invoiced": float(total_invoiced),
            "total_collected": float(total_collected),
            "total_outstanding": float(total_outstanding),
            "collection_percentage": collection_pct,
            "fee_type_breakdown": fee_type_breakdown,
            "payment_method_breakdown": payment_method_breakdown,
            "defaulters": defaulters,
        }

        # Generate CSV
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Invoice Number", "Student Name", "Admission Number", "Class", "Title", "Total Amount", "Paid Amount", "Balance Due", "Due Date", "Status"])
        for d in defaulters:
            writer.writerow([
                d["invoice_number"],
                d["student_name"],
                d["admission_number"],
                d["class_name"],
                d["title"],
                f"{d['total_amount']:.2f}",
                f"{d['paid_amount']:.2f}",
                f"{d['balance_amount']:.2f}",
                d["due_date"] or "",
                d["status"],
            ])

        return json_data, output.getvalue()

    @staticmethod
    def generate_examination_performance_report(
        db: Session,
        exam_id: UUID,
        class_id: Optional[UUID] = None,
    ) -> Tuple[Dict[str, Any], str]:
        """
        Produce examination score distribution, class averages, and ranking report with downloadable CSV.
        """
        exam = db.query(Exam).filter(Exam.id == exam_id).first()
        exam_name = exam.name if exam else "Examination"

        # Query all student marks for this exam
        query = (
            db.query(StudentMark, ExamSchedule, Student, SchoolClass, Section)
            .join(ExamSchedule, StudentMark.exam_schedule_id == ExamSchedule.id)
            .join(Student, StudentMark.student_id == Student.id)
            .join(SchoolClass, ExamSchedule.class_id == SchoolClass.id)
            .join(Section, StudentMark.section_id == Section.id)
            .filter(ExamSchedule.exam_id == exam_id)
        )

        if class_id:
            query = query.filter(ExamSchedule.class_id == class_id)

        marks_rows = query.all()

        # Group by student
        student_scores: Dict[UUID, Dict[str, Any]] = {}
        class_stats_map: Dict[str, Dict[str, Any]] = {}

        for mark, sched, st, sc, sec in marks_rows:
            sid = st.id
            if sid not in student_scores:
                student_scores[sid] = {
                    "student_name": st.full_name,
                    "admission_number": st.admission_number,
                    "class_name": sc.name,
                    "section_name": sec.name,
                    "total_obtained": Decimal("0.00"),
                    "total_max": Decimal("0.00"),
                    "failed_count": 0,
                }
            if not mark.is_absent and mark.marks_obtained is not None:
                student_scores[sid]["total_obtained"] += mark.marks_obtained
                student_scores[sid]["total_max"] += sched.max_marks
                if sched.pass_marks and mark.marks_obtained < sched.pass_marks:
                    student_scores[sid]["failed_count"] += 1
            else:
                student_scores[sid]["total_max"] += sched.max_marks
                student_scores[sid]["failed_count"] += 1

            cls_key = f"{sc.name} - {sec.name}"
            if cls_key not in class_stats_map:
                class_stats_map[cls_key] = {
                    "class_name": sc.name,
                    "section_name": sec.name,
                    "percentages": [],
                    "pass_count": 0,
                    "fail_count": 0,
                }

        # Calculate student percentages and ranks
        eval_students = []
        for sid, data in student_scores.items():
            tot_max = float(data["total_max"])
            tot_obt = float(data["total_obtained"])
            pct = round((tot_obt / tot_max * 100), 2) if tot_max > 0 else 0.0
            is_pass = data["failed_count"] == 0
            res_status = "PASS" if is_pass else "FAIL"

            cls_key = f"{data['class_name']} - {data['section_name']}"
            if cls_key in class_stats_map:
                class_stats_map[cls_key]["percentages"].append(pct)
                if is_pass:
                    class_stats_map[cls_key]["pass_count"] += 1
                else:
                    class_stats_map[cls_key]["fail_count"] += 1

            eval_students.append({
                "student_name": data["student_name"],
                "admission_number": data["admission_number"],
                "class_name": data["class_name"],
                "section_name": data["section_name"],
                "total_marks_obtained": tot_obt,
                "total_max_marks": tot_max,
                "percentage": pct,
                "result_status": res_status,
            })

        # Sort descending by percentage for ranking
        eval_students.sort(key=lambda x: x["percentage"], reverse=True)
        for idx, s in enumerate(eval_students, start=1):
            s["rank"] = idx

        # Class averages summary
        class_averages = []
        for cls_key, cdata in class_stats_map.items():
            pcts = cdata["percentages"]
            avg_pct = round(sum(pcts) / len(pcts), 2) if pcts else 0.0
            high_pct = max(pcts) if pcts else 0.0
            low_pct = min(pcts) if pcts else 0.0
            class_averages.append({
                "class_name": cdata["class_name"],
                "section_name": cdata["section_name"],
                "average_percentage": avg_pct,
                "highest_percentage": high_pct,
                "lowest_percentage": low_pct,
                "pass_count": cdata["pass_count"],
                "fail_count": cdata["fail_count"],
            })

        total_eval = len(eval_students)
        passed_count = sum(1 for s in eval_students if s["result_status"] == "PASS")
        overall_pass_pct = round((passed_count / total_eval * 100), 1) if total_eval > 0 else 0.0

        json_data = {
            "exam_name": exam_name,
            "total_students_evaluated": total_eval,
            "overall_pass_percentage": overall_pass_pct,
            "class_averages": class_averages,
            "top_performers": eval_students[:10],
        }

        # Generate CSV
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Rank", "Student Name", "Admission Number", "Class", "Section", "Marks Obtained", "Total Max Marks", "Percentage", "Result Status"])
        for s in eval_students:
            writer.writerow([
                s["rank"],
                s["student_name"],
                s["admission_number"],
                s["class_name"],
                s["section_name"],
                f"{s['total_marks_obtained']:.1f}",
                f"{s['total_max_marks']:.1f}",
                f"{s['percentage']:.2f}%",
                s["result_status"],
            ])

        return json_data, output.getvalue()

    @staticmethod
    def generate_attendance_analytics_report(
        db: Session,
        year: Optional[int] = None,
        month: Optional[int] = None,
    ) -> Tuple[Dict[str, Any], str]:
        """
        Produce class attendance analytics and low-attendance (<75%) defaulters report with downloadable CSV.
        """
        reg_query = db.query(AttendanceRegister)
        if year:
            reg_query = reg_query.filter(func.extract("year", AttendanceRegister.attendance_date) == year)
        if month:
            reg_query = reg_query.filter(func.extract("month", AttendanceRegister.attendance_date) == month)

        registers = reg_query.all()

        curr_year = db.query(AcademicYear).filter(AcademicYear.is_current == True).first()
        ay_name = curr_year.name if curr_year else "2026-2027"

        # Class breakdown
        class_map: Dict[str, Dict[str, Any]] = {}
        for r in registers:
            key = f"{r.school_class.name if r.school_class else ''} - {r.section.name if r.section else ''}"
            if key not in class_map:
                class_map[key] = {
                    "class_name": r.school_class.name if r.school_class else "",
                    "section_name": r.section.name if r.section else "",
                    "total_registers": 0,
                    "total_students_sum": 0,
                    "present_sum": Decimal("0.0"),
                }
            class_map[key]["total_registers"] += 1
            class_map[key]["total_students_sum"] += r.total_students
            present_cred = r.present_count + (r.late_count or 0) + (r.half_day_count or 0) * 0.5
            class_map[key]["present_sum"] += Decimal(str(present_cred))

        class_summary = []
        for key, val in class_map.items():
            tot_stud = val["total_students_sum"]
            avg_pct = round(float(val["present_sum"] / tot_stud * 100), 1) if tot_stud > 0 else 0.0
            class_summary.append({
                "class_name": val["class_name"],
                "section_name": val["section_name"],
                "total_registers": val["total_registers"],
                "average_attendance_percentage": avg_pct,
            })

        # Calculate student-level attendance across active students
        active_enrollments = (
            db.query(EnrollmentHistory, Student, SchoolClass, Section)
            .join(Student, EnrollmentHistory.student_id == Student.id)
            .join(SchoolClass, EnrollmentHistory.class_id == SchoolClass.id)
            .join(Section, EnrollmentHistory.section_id == Section.id)
            .filter(EnrollmentHistory.status == EnrollmentStatus.ENROLLED)
            .all()
        )

        low_attendance_students = []
        all_student_attendance_records = []

        for enh, st, sc, sec in active_enrollments:
            rec_query = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == st.id)
            if year:
                rec_query = rec_query.join(AttendanceRegister).filter(func.extract("year", AttendanceRegister.attendance_date) == year)
            if month:
                rec_query = rec_query.join(AttendanceRegister).filter(func.extract("month", AttendanceRegister.attendance_date) == month)

            records = rec_query.all()
            total_days = len(records)
            if total_days > 0:
                present_days = sum(1 for r in records if r.status == AttendanceStatus.PRESENT)
                late_days = sum(1 for r in records if r.status == AttendanceStatus.LATE)
                half_days = sum(1 for r in records if r.status == AttendanceStatus.HALF_DAY)
                absent_days = sum(1 for r in records if r.status == AttendanceStatus.ABSENT)

                presence_points = present_days + late_days + (half_days * 0.5)
                att_pct = round((presence_points / total_days) * 100, 1)

                is_low = att_pct < 75.0
                row = {
                    "student_name": st.full_name,
                    "admission_number": st.admission_number,
                    "class_name": sc.name,
                    "section_name": sec.name,
                    "total_days": total_days,
                    "present_days": present_days,
                    "absent_days": absent_days,
                    "attendance_percentage": att_pct,
                    "is_low_attendance": is_low,
                }
                all_student_attendance_records.append(row)
                if is_low:
                    low_attendance_students.append(row)

        json_data = {
            "academic_year_name": ay_name,
            "month": month,
            "year": year,
            "class_attendance_summary": class_summary,
            "low_attendance_students": low_attendance_students,
        }

        # Generate CSV
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Student Name", "Admission Number", "Class", "Section", "Total Days", "Present Days", "Absent Days", "Attendance Rate", "Below 75% Alert"])
        for r in (low_attendance_students if low_attendance_students else all_student_attendance_records):
            writer.writerow([
                r["student_name"],
                r["admission_number"],
                r["class_name"],
                r["section_name"],
                r["total_days"],
                r["present_days"],
                r["absent_days"],
                f"{r['attendance_percentage']:.1f}%",
                "YES" if r["is_low_attendance"] else "NO",
            ])

        return json_data, output.getvalue()
