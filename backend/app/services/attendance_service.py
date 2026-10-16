import calendar
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List, Optional, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.academic_year import AcademicYear
from app.models.academic import SchoolClass, Section
from app.models.student import Student, EnrollmentHistory, StudentStatus, EnrollmentStatus
from app.models.attendance import (
    AttendanceStatus,
    AttendanceRegister,
    AttendanceRecord,
    AttendanceCorrectionLog,
)
from app.schemas.attendance import (
    AttendanceRegisterCreate,
    AttendanceCorrectionRequest,
    AttendanceRecordResponse,
    AttendanceCorrectionLogResponse,
    AttendanceRegisterResponse,
    StudentAttendanceSummary,
    SectionMonthlyAttendanceStats,
    AttendanceMatrixStudentRow,
    AttendanceMatrixResponse,
)


class AttendanceService:

    @staticmethod
    def get_or_init_register(
        db: Session,
        class_id: UUID,
        section_id: UUID,
        attendance_date: date,
    ) -> AttendanceRegisterResponse:
        """
        Retrieve daily classroom attendance register if already recorded,
        or pre-populate student roster defaulting to PRESENT for teacher entry.
        """
        # 1. Fetch Class and Section metadata
        school_class = db.query(SchoolClass).filter(SchoolClass.id == class_id).first()
        if not school_class:
            raise ValueError("School class not found")
        section = db.query(Section).filter(Section.id == section_id, Section.class_id == class_id).first()
        if not section:
            raise ValueError("Section not found in this class")

        # 2. Check if a register already exists for this date
        register = (
            db.query(AttendanceRegister)
            .filter(
                AttendanceRegister.class_id == class_id,
                AttendanceRegister.section_id == section_id,
                AttendanceRegister.attendance_date == attendance_date,
            )
            .first()
        )

        if register:
            # Existing recorded register
            record_responses = []
            for rec in register.records:
                student = rec.student
                enrollment = (
                    db.query(EnrollmentHistory)
                    .filter(
                        EnrollmentHistory.student_id == rec.student_id,
                        EnrollmentHistory.class_id == class_id,
                        EnrollmentHistory.section_id == section_id,
                    )
                    .first()
                )
                corrections = [
                    AttendanceCorrectionLogResponse(
                        id=c.id,
                        attendance_record_id=c.attendance_record_id,
                        previous_status=c.previous_status,
                        new_status=c.new_status,
                        reason=c.reason,
                        changed_by_id=c.changed_by_id,
                        changed_by_name=c.changed_by.full_name if c.changed_by else None,
                        changed_at=c.changed_at,
                    )
                    for c in rec.corrections
                ]

                record_responses.append(
                    AttendanceRecordResponse(
                        id=rec.id,
                        student_id=rec.student_id,
                        student_name=student.full_name if student else "Unknown",
                        admission_number=student.admission_number if student else "",
                        roll_number=enrollment.roll_number if enrollment else None,
                        status=rec.status,
                        remarks=rec.remarks,
                        corrections=corrections,
                    )
                )

            # Sort by roll_number or student_name
            record_responses.sort(key=lambda r: (r.roll_number or "999", r.student_name))

            return AttendanceRegisterResponse(
                id=register.id,
                class_id=register.class_id,
                class_name=school_class.name,
                section_id=register.section_id,
                section_name=section.name,
                academic_year_id=register.academic_year_id,
                academic_year_name=register.academic_year.name if register.academic_year else None,
                attendance_date=register.attendance_date,
                taken_by_id=register.taken_by_id,
                taken_by_name=register.taken_by.full_name if register.taken_by else None,
                notes=register.notes,
                total_students=register.total_students,
                present_count=register.present_count,
                absent_count=register.absent_count,
                late_count=register.late_count,
                half_day_count=register.half_day_count,
                leave_count=register.leave_count,
                is_submitted=True,
                created_at=register.created_at,
                records=record_responses,
            )

        # 3. Not yet recorded: Initialize from active enrolled students
        active_year = db.query(AcademicYear).filter(AcademicYear.is_current == True).first()
        if not active_year:
            active_year = db.query(AcademicYear).order_by(AcademicYear.start_date.desc()).first()

        enrollments = (
            db.query(EnrollmentHistory, Student)
            .join(Student, Student.id == EnrollmentHistory.student_id)
            .filter(
                EnrollmentHistory.class_id == class_id,
                EnrollmentHistory.section_id == section_id,
                EnrollmentHistory.status == EnrollmentStatus.ENROLLED,
                Student.status == StudentStatus.ACTIVE,
            )
            .order_by(EnrollmentHistory.roll_number, Student.first_name, Student.last_name)
            .all()
        )

        initialized_records = [
            AttendanceRecordResponse(
                id=None,
                student_id=st.id,
                student_name=st.full_name,
                admission_number=st.admission_number,
                roll_number=enh.roll_number,
                status=AttendanceStatus.PRESENT,
                remarks=None,
                corrections=[],
            )
            for enh, st in enrollments
        ]

        total_cnt = len(initialized_records)

        return AttendanceRegisterResponse(
            id=None,
            class_id=class_id,
            class_name=school_class.name,
            section_id=section_id,
            section_name=section.name,
            academic_year_id=active_year.id if active_year else None,
            academic_year_name=active_year.name if active_year else None,
            attendance_date=attendance_date,
            taken_by_id=None,
            taken_by_name=None,
            notes=None,
            total_students=total_cnt,
            present_count=total_cnt,
            absent_count=0,
            late_count=0,
            half_day_count=0,
            leave_count=0,
            is_submitted=False,
            created_at=None,
            records=initialized_records,
        )

    @staticmethod
    def mark_attendance(
        db: Session,
        req: AttendanceRegisterCreate,
        current_user: Any,
    ) -> AttendanceRegisterResponse:
        """
        Record daily classroom attendance register with duplicate prevention.
        """
        # 1. Enforce duplicate prevention
        existing = (
            db.query(AttendanceRegister)
            .filter(
                AttendanceRegister.class_id == req.class_id,
                AttendanceRegister.section_id == req.section_id,
                AttendanceRegister.attendance_date == req.attendance_date,
            )
            .first()
        )
        if existing:
            raise ValueError(
                f"Attendance for Class on {req.attendance_date} has already been recorded. "
                "Please use the authorized status correction workflow to make adjustments."
            )

        # 2. Resolve academic year
        academic_year_id = req.academic_year_id
        if not academic_year_id:
            active_year = db.query(AcademicYear).filter(AcademicYear.is_current == True).first()
            if not active_year:
                active_year = db.query(AcademicYear).order_by(AcademicYear.start_date.desc()).first()
            if not active_year:
                raise ValueError("No active academic year found in system.")
            academic_year_id = active_year.id

        # 3. Calculate summary metrics
        present_count = sum(1 for r in req.records if r.status == AttendanceStatus.PRESENT)
        absent_count = sum(1 for r in req.records if r.status == AttendanceStatus.ABSENT)
        late_count = sum(1 for r in req.records if r.status == AttendanceStatus.LATE)
        half_day_count = sum(1 for r in req.records if r.status == AttendanceStatus.HALF_DAY)
        leave_count = sum(1 for r in req.records if r.status == AttendanceStatus.APPROVED_LEAVE)
        total_students = len(req.records)

        # 4. Create Register
        register = AttendanceRegister(
            class_id=req.class_id,
            section_id=req.section_id,
            academic_year_id=academic_year_id,
            attendance_date=req.attendance_date,
            taken_by_id=current_user.id if current_user else None,
            notes=req.notes,
            total_students=total_students,
            present_count=present_count,
            absent_count=absent_count,
            late_count=late_count,
            half_day_count=half_day_count,
            leave_count=leave_count,
        )
        db.add(register)
        db.flush()

        # 5. Insert individual records
        for item in req.records:
            rec = AttendanceRecord(
                register_id=register.id,
                student_id=item.student_id,
                status=item.status,
                remarks=item.remarks,
            )
            db.add(rec)

        db.commit()
        db.refresh(register)

        return AttendanceService.get_or_init_register(
            db,
            class_id=req.class_id,
            section_id=req.section_id,
            attendance_date=req.attendance_date,
        )

    @staticmethod
    def correct_attendance_record(
        db: Session,
        record_id: UUID,
        req: AttendanceCorrectionRequest,
        current_user: Any,
    ) -> AttendanceRecordResponse:
        """
        Perform authorized status adjustment on an existing attendance record
        with mandatory audit reason logging and register count recalculation.
        """
        record = db.query(AttendanceRecord).filter(AttendanceRecord.id == record_id).first()
        if not record:
            raise ValueError("Attendance record not found.")

        if record.status == req.new_status:
            # No status change requested
            return AttendanceService._build_record_response(db, record)

        previous_status = record.status

        # 1. Log correction audit entry
        correction_log = AttendanceCorrectionLog(
            attendance_record_id=record.id,
            previous_status=previous_status,
            new_status=req.new_status,
            reason=req.reason.strip(),
            changed_by_id=current_user.id if current_user else None,
        )
        db.add(correction_log)

        # 2. Update status
        record.status = req.new_status

        # 3. Recalculate parent register counts
        register = record.register
        all_records = db.query(AttendanceRecord).filter(AttendanceRecord.register_id == register.id).all()
        # include currently modified in counts
        register.present_count = sum(1 for r in all_records if (r.status if r.id != record.id else req.new_status) == AttendanceStatus.PRESENT)
        register.absent_count = sum(1 for r in all_records if (r.status if r.id != record.id else req.new_status) == AttendanceStatus.ABSENT)
        register.late_count = sum(1 for r in all_records if (r.status if r.id != record.id else req.new_status) == AttendanceStatus.LATE)
        register.half_day_count = sum(1 for r in all_records if (r.status if r.id != record.id else req.new_status) == AttendanceStatus.HALF_DAY)
        register.leave_count = sum(1 for r in all_records if (r.status if r.id != record.id else req.new_status) == AttendanceStatus.APPROVED_LEAVE)

        db.commit()
        db.refresh(record)

        return AttendanceService._build_record_response(db, record)

    @staticmethod
    def _build_record_response(db: Session, record: AttendanceRecord) -> AttendanceRecordResponse:
        student = record.student
        enrollment = (
            db.query(EnrollmentHistory)
            .filter(
                EnrollmentHistory.student_id == record.student_id,
                EnrollmentHistory.class_id == record.register.class_id,
                EnrollmentHistory.section_id == record.register.section_id,
            )
            .first()
        )
        corrections = [
            AttendanceCorrectionLogResponse(
                id=c.id,
                attendance_record_id=c.attendance_record_id,
                previous_status=c.previous_status,
                new_status=c.new_status,
                reason=c.reason,
                changed_by_id=c.changed_by_id,
                changed_by_name=c.changed_by.full_name if c.changed_by else None,
                changed_at=c.changed_at,
            )
            for c in record.corrections
        ]
        return AttendanceRecordResponse(
            id=record.id,
            student_id=record.student_id,
            student_name=student.full_name if student else "Unknown",
            admission_number=student.admission_number if student else "",
            roll_number=enrollment.roll_number if enrollment else None,
            status=record.status,
            remarks=record.remarks,
            corrections=corrections,
        )

    @staticmethod
    def get_section_monthly_matrix(
        db: Session,
        class_id: UUID,
        section_id: UUID,
        year: int,
        month: int,
    ) -> AttendanceMatrixResponse:
        """
        Generate Day 1-31 attendance calendar matrix for an entire section in a given month.
        Status codes:
        P = Present, A = Absent, L = Late, H = Half Day, E = Approved Leave
        """
        school_class = db.query(SchoolClass).filter(SchoolClass.id == class_id).first()
        if not school_class:
            raise ValueError("Class not found")
        section = db.query(Section).filter(Section.id == section_id).first()
        if not section:
            raise ValueError("Section not found")

        _, days_in_month = calendar.monthrange(year, month)
        start_date = date(year, month, 1)
        end_date = date(year, month, days_in_month)

        # Fetch all registers in this month
        registers = (
            db.query(AttendanceRegister)
            .filter(
                AttendanceRegister.class_id == class_id,
                AttendanceRegister.section_id == section_id,
                AttendanceRegister.attendance_date >= start_date,
                AttendanceRegister.attendance_date <= end_date,
            )
            .all()
        )

        register_map = {r.attendance_date.day: r for r in registers}

        # Fetch all records across these registers
        register_ids = [r.id for r in registers]
        records = (
            db.query(AttendanceRecord)
            .filter(AttendanceRecord.register_id.in_(register_ids))
            .all()
            if register_ids
            else []
        )

        # Map (student_id, day) -> status code
        student_day_status: Dict[tuple, str] = {}
        status_to_code = {
            AttendanceStatus.PRESENT: "P",
            AttendanceStatus.ABSENT: "A",
            AttendanceStatus.LATE: "L",
            AttendanceStatus.HALF_DAY: "H",
            AttendanceStatus.APPROVED_LEAVE: "E",
        }
        for rec in records:
            day = rec.register.attendance_date.day
            student_day_status[(rec.student_id, day)] = status_to_code.get(rec.status, "P")

        # Fetch enrolled students
        enrollments = (
            db.query(EnrollmentHistory, Student)
            .join(Student, Student.id == EnrollmentHistory.student_id)
            .filter(
                EnrollmentHistory.class_id == class_id,
                EnrollmentHistory.section_id == section_id,
                EnrollmentHistory.status == EnrollmentStatus.ENROLLED,
                Student.status == StudentStatus.ACTIVE,
            )
            .order_by(EnrollmentHistory.roll_number, Student.first_name, Student.last_name)
            .all()
        )

        student_rows: List[AttendanceMatrixStudentRow] = []
        for enh, st in enrollments:
            daily_map: Dict[int, Optional[str]] = {}
            present_days = 0
            total_marked_days = 0

            for d in range(1, days_in_month + 1):
                if d in register_map:
                    code = student_day_status.get((st.id, d), "P")
                    daily_map[d] = code
                    total_marked_days += 1
                    if code in ("P", "L"):
                        present_days += 1
                    elif code in ("H", "E"):
                        present_days += 0.5  # half attendance credit
                else:
                    daily_map[d] = None

            percentage = (
                Decimal(str(round((present_days / total_marked_days) * 100, 1)))
                if total_marked_days > 0
                else Decimal("100.0")
            )

            student_rows.append(
                AttendanceMatrixStudentRow(
                    student_id=st.id,
                    admission_number=st.admission_number,
                    student_name=st.full_name,
                    roll_number=enh.roll_number,
                    daily_statuses=daily_map,
                    present_days=int(present_days),
                    total_days=total_marked_days,
                    attendance_percentage=percentage,
                )
            )

        return AttendanceMatrixResponse(
            class_id=class_id,
            class_name=school_class.name,
            section_id=section_id,
            section_name=section.name,
            year=year,
            month=month,
            days_in_month=days_in_month,
            students=student_rows,
        )

    @staticmethod
    def get_section_monthly_stats(
        db: Session,
        class_id: UUID,
        section_id: UUID,
        year: int,
        month: int,
    ) -> SectionMonthlyAttendanceStats:
        """
        Calculate section attendance analytics and detect students falling below 75% threshold.
        """
        matrix = AttendanceService.get_section_monthly_matrix(db, class_id, section_id, year, month)

        if not matrix.students:
            return SectionMonthlyAttendanceStats(
                class_id=class_id,
                class_name=matrix.class_name,
                section_id=section_id,
                section_name=matrix.section_name,
                year=year,
                month=month,
                total_working_days=0,
                average_attendance_percentage=Decimal("0.0"),
                low_attendance_students=[],
            )

        total_working_days = max((st.total_days for st in matrix.students), default=0)
        avg_pct = (
            sum((st.attendance_percentage for st in matrix.students), Decimal("0.0"))
            / Decimal(str(len(matrix.students)))
        )

        low_attendance_list: List[StudentAttendanceSummary] = []
        for s in matrix.students:
            is_low = s.attendance_percentage < Decimal("75.0") and s.total_days > 0
            if is_low:
                # Count specific statuses for summary
                absent_cnt = sum(1 for _, v in s.daily_statuses.items() if v == "A")
                late_cnt = sum(1 for _, v in s.daily_statuses.items() if v == "L")
                half_cnt = sum(1 for _, v in s.daily_statuses.items() if v == "H")
                leave_cnt = sum(1 for _, v in s.daily_statuses.items() if v == "E")

                low_attendance_list.append(
                    StudentAttendanceSummary(
                        student_id=s.student_id,
                        admission_number=s.admission_number,
                        student_name=s.student_name,
                        roll_number=s.roll_number,
                        total_days=s.total_days,
                        present_days=s.present_days,
                        absent_days=absent_cnt,
                        late_days=late_cnt,
                        half_day_days=half_cnt,
                        leave_days=leave_cnt,
                        attendance_percentage=s.attendance_percentage,
                        is_low_attendance=True,
                    )
                )

        return SectionMonthlyAttendanceStats(
            class_id=class_id,
            class_name=matrix.class_name,
            section_id=section_id,
            section_name=matrix.section_name,
            year=year,
            month=month,
            total_working_days=total_working_days,
            average_attendance_percentage=Decimal(str(round(avg_pct, 1))),
            low_attendance_students=low_attendance_list,
        )

    @staticmethod
    def get_student_attendance_history(
        db: Session,
        student_id: UUID,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        """
        Retrieve individual student multi-day attendance history with overall attendance percentage.
        """
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise ValueError("Student not found.")

        query = (
            db.query(AttendanceRecord, AttendanceRegister)
            .join(AttendanceRegister, AttendanceRegister.id == AttendanceRecord.register_id)
            .filter(AttendanceRecord.student_id == student_id)
        )
        if start_date:
            query = query.filter(AttendanceRegister.attendance_date >= start_date)
        if end_date:
            query = query.filter(AttendanceRegister.attendance_date <= end_date)

        query = query.order_by(AttendanceRegister.attendance_date.desc())
        results = query.all()

        total_days = len(results)
        present_cnt = sum(1 for rec, _ in results if rec.status in (AttendanceStatus.PRESENT, AttendanceStatus.LATE))
        absent_cnt = sum(1 for rec, _ in results if rec.status == AttendanceStatus.ABSENT)
        late_cnt = sum(1 for rec, _ in results if rec.status == AttendanceStatus.LATE)
        leave_cnt = sum(1 for rec, _ in results if rec.status == AttendanceStatus.APPROVED_LEAVE)

        percentage = (
            Decimal(str(round((present_cnt / total_days) * 100, 1)))
            if total_days > 0
            else Decimal("100.0")
        )

        records_list = [
            {
                "id": str(rec.id),
                "attendance_date": str(reg.attendance_date),
                "status": rec.status,
                "remarks": rec.remarks,
                "taken_by": reg.taken_by.full_name if reg.taken_by else None,
            }
            for rec, reg in results
        ]

        return {
            "student_id": str(student.id),
            "admission_number": student.admission_number,
            "student_name": student.full_name,
            "total_days": total_days,
            "present_days": present_cnt,
            "absent_days": absent_cnt,
            "late_days": late_cnt,
            "leave_days": leave_cnt,
            "attendance_percentage": percentage,
            "is_low_attendance": percentage < Decimal("75.0") and total_days > 0,
            "records": records_list,
        }
