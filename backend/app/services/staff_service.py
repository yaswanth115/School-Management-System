from typing import Any, Dict, List, Optional
from uuid import UUID
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func

from app.models.staff import StaffProfile
from app.models.user import User
from app.models.role import RoleEnum
from app.models.academic import TeacherAssignment
from app.schemas.staff import StaffProfileCreate, StaffProfileUpdate


class StaffService:
    @staticmethod
    def list_staff(
        db: Session,
        department: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        query = (
            db.query(User)
            .outerjoin(StaffProfile, StaffProfile.user_id == User.id)
            .filter(User.role.in_([RoleEnum.TEACHER, RoleEnum.PRINCIPAL, RoleEnum.ACCOUNTANT, RoleEnum.ADMIN]))
        )

        if department:
            query = query.filter(StaffProfile.department == department)

        if search:
            s = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    User.full_name.ilike(s),
                    User.email.ilike(s),
                    StaffProfile.employee_id.ilike(s),
                    StaffProfile.designation.ilike(s),
                )
            )

        users = query.options(joinedload(User.audit_logs)).order_by(User.full_name).all()

        results = []
        for u in users:
            profile = db.query(StaffProfile).filter(StaffProfile.user_id == u.id).first()
            # Count assignments if teacher
            assignments_count = (
                db.query(func.count(TeacherAssignment.id))
                .filter(TeacherAssignment.teacher_id == u.id)
                .scalar()
                or 0
            )

            results.append(
                {
                    "id": profile.id if profile else u.id,
                    "user_id": u.id,
                    "full_name": u.full_name,
                    "email": u.email,
                    "phone": u.phone,
                    "employee_id": profile.employee_id if profile else f"EMP-{str(u.id)[:6].upper()}",
                    "designation": profile.designation if profile else u.role.value,
                    "department": profile.department if profile else "General",
                    "qualification": profile.qualification if profile else None,
                    "joining_date": profile.joining_date if profile else u.created_at.date(),
                    "emergency_contact": profile.emergency_contact if profile else None,
                    "is_active": u.is_active,
                    "assigned_subjects_count": assignments_count,
                }
            )

        return results

    @staticmethod
    def create_or_update_profile(db: Session, profile_in: StaffProfileCreate) -> StaffProfile:
        existing = db.query(StaffProfile).filter(StaffProfile.user_id == profile_in.user_id).first()
        if existing:
            existing.designation = profile_in.designation
            existing.department = profile_in.department
            existing.qualification = profile_in.qualification
            existing.joining_date = profile_in.joining_date
            existing.emergency_contact = profile_in.emergency_contact
            db.commit()
            db.refresh(existing)
            return existing

        profile = StaffProfile(
            user_id=profile_in.user_id,
            employee_id=profile_in.employee_id.strip(),
            designation=profile_in.designation.strip(),
            department=profile_in.department.strip(),
            qualification=profile_in.qualification.strip() if profile_in.qualification else None,
            joining_date=profile_in.joining_date,
            emergency_contact=profile_in.emergency_contact.strip() if profile_in.emergency_contact else None,
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
        return profile
