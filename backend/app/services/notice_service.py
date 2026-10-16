from datetime import date
from typing import List, Optional, Tuple
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from fastapi import HTTPException, status

from app.models.user import User
from app.models.role import RoleEnum
from app.models.academic import SchoolClass, Section, TeacherAssignment
from app.models.student import Student, Guardian, StudentGuardian, EnrollmentHistory, EnrollmentStatus
from app.models.staff import StaffProfile
from app.models.notice import Notice, NoticeAudience
from app.schemas.notice import NoticeCreate, NoticeUpdate, NoticeResponse, NoticeListResponse


class NoticeService:

    @staticmethod
    def create_notice(db: Session, req: NoticeCreate, author_user: User) -> Notice:
        """
        Create a new institutional notice.
        Enforces audience and class targeting validation.
        """
        if req.target_audience == NoticeAudience.CLASS_SPECIFIC and not req.class_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="class_id is mandatory when target_audience is set to CLASS_SPECIFIC.",
            )

        if req.class_id:
            cls = db.query(SchoolClass).filter(SchoolClass.id == req.class_id).first()
            if not cls:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Specified class not found.")

        if req.section_id:
            sec = db.query(Section).filter(Section.id == req.section_id).first()
            if not sec:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Specified section not found.")

        notice = Notice(
            title=req.title.strip(),
            content=req.content.strip(),
            target_audience=req.target_audience,
            class_id=req.class_id,
            section_id=req.section_id,
            is_published=req.is_published,
            is_pinned=req.is_pinned if author_user.role in [RoleEnum.ADMIN, RoleEnum.PRINCIPAL] else False,
            publish_date=req.publish_date or date.today(),
            expires_at=req.expires_at,
            author_id=author_user.id,
        )
        db.add(notice)
        db.commit()
        db.refresh(notice)
        return notice

    @staticmethod
    def update_notice(db: Session, notice_id: UUID, req: NoticeUpdate, current_user: User) -> Notice:
        """
        Update an existing notice.
        Only Admin, Principal, or original author can update.
        """
        notice = db.query(Notice).filter(Notice.id == notice_id, Notice.is_active == True).first()
        if not notice:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notice not found.")

        if current_user.role not in [RoleEnum.ADMIN, RoleEnum.PRINCIPAL] and notice.author_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to modify this announcement.",
            )

        if req.title is not None:
            notice.title = req.title.strip()
        if req.content is not None:
            notice.content = req.content.strip()
        if req.target_audience is not None:
            notice.target_audience = req.target_audience
        if req.class_id is not None:
            notice.class_id = req.class_id
        if req.section_id is not None:
            notice.section_id = req.section_id
        if req.is_published is not None:
            notice.is_published = req.is_published
        if req.is_pinned is not None and current_user.role in [RoleEnum.ADMIN, RoleEnum.PRINCIPAL]:
            notice.is_pinned = req.is_pinned
        if req.publish_date is not None:
            notice.publish_date = req.publish_date
        if req.expires_at is not None:
            notice.expires_at = req.expires_at

        db.commit()
        db.refresh(notice)
        return notice

    @staticmethod
    def delete_notice(db: Session, notice_id: UUID, current_user: User) -> None:
        """
        Soft-delete / delete a notice.
        """
        notice = db.query(Notice).filter(Notice.id == notice_id, Notice.is_active == True).first()
        if not notice:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notice not found.")

        if current_user.role not in [RoleEnum.ADMIN, RoleEnum.PRINCIPAL] and notice.author_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delete this announcement.",
            )

        notice.is_active = False
        db.commit()

    @staticmethod
    def toggle_pin(db: Session, notice_id: UUID, current_user: User) -> Notice:
        """
        Toggle pin status of a notice.
        """
        if current_user.role not in [RoleEnum.ADMIN, RoleEnum.PRINCIPAL]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators or principals can pin announcements.",
            )

        notice = db.query(Notice).filter(Notice.id == notice_id, Notice.is_active == True).first()
        if not notice:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notice not found.")

        notice.is_pinned = not notice.is_pinned
        db.commit()
        db.refresh(notice)
        return notice

    @staticmethod
    def list_notices(
        db: Session,
        current_user: User,
        search: Optional[str] = None,
        audience_filter: Optional[NoticeAudience] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> NoticeListResponse:
        """
        Query notices scoped to user permissions and active class enrollments.
        """
        query = db.query(Notice).filter(Notice.is_active == True)

        # Non-admins only see published notices whose publish_date has arrived
        if current_user.role not in [RoleEnum.ADMIN, RoleEnum.PRINCIPAL]:
            query = query.filter(
                Notice.is_published == True,
                Notice.publish_date <= date.today(),
                or_(Notice.expires_at == None, Notice.expires_at >= date.today()),
            )

        # Audience-based scoping
        if current_user.role in [RoleEnum.ADMIN, RoleEnum.PRINCIPAL]:
            # Admins see everything
            pass
        elif current_user.role == RoleEnum.TEACHER:
            # Teacher: ALL, TEACHERS, or classes taught by this teacher
            assignments = db.query(TeacherAssignment.class_id).filter(TeacherAssignment.teacher_id == current_user.id).all()
            assigned_class_ids = [a[0] for a in assignments]

            query = query.filter(
                or_(
                    Notice.target_audience.in_([NoticeAudience.ALL, NoticeAudience.TEACHERS]),
                    and_(Notice.target_audience == NoticeAudience.CLASS_SPECIFIC, Notice.class_id.in_(assigned_class_ids)),
                )
            )
        elif current_user.role == RoleEnum.PARENT:
            # Parent: ALL, PARENTS, or classes where linked children are enrolled
            guardian = db.query(Guardian).filter(Guardian.user_id == current_user.id).first()
            child_class_ids = []
            if guardian:
                child_links = db.query(StudentGuardian.student_id).filter(StudentGuardian.guardian_id == guardian.id).all()
                child_ids = [c[0] for c in child_links]
                enrollments = (
                    db.query(EnrollmentHistory.class_id)
                    .filter(
                        EnrollmentHistory.student_id.in_(child_ids),
                        EnrollmentHistory.status == EnrollmentStatus.ENROLLED,
                    )
                    .all()
                )
                child_class_ids = [e[0] for e in enrollments]

            query = query.filter(
                or_(
                    Notice.target_audience.in_([NoticeAudience.ALL, NoticeAudience.PARENTS]),
                    and_(Notice.target_audience == NoticeAudience.CLASS_SPECIFIC, Notice.class_id.in_(child_class_ids)),
                )
            )
        elif current_user.role == RoleEnum.STUDENT:
            # Student: ALL, STUDENTS, or their current enrolled class
            student = db.query(Student).filter(Student.user_id == current_user.id).first()
            student_class_id = None
            if student:
                enrollment = (
                    db.query(EnrollmentHistory.class_id)
                    .filter(
                        EnrollmentHistory.student_id == student.id,
                        EnrollmentHistory.status == EnrollmentStatus.ENROLLED,
                    )
                    .order_by(EnrollmentHistory.enrolled_at.desc())
                    .first()
                )
                if enrollment:
                    student_class_id = enrollment[0]

            class_clause = (
                and_(Notice.target_audience == NoticeAudience.CLASS_SPECIFIC, Notice.class_id == student_class_id)
                if student_class_id
                else False
            )
            query = query.filter(
                or_(
                    Notice.target_audience.in_([NoticeAudience.ALL, NoticeAudience.STUDENTS]),
                    class_clause,
                )
            )
        elif current_user.role == RoleEnum.ACCOUNTANT:
            query = query.filter(
                Notice.target_audience.in_([NoticeAudience.ALL, NoticeAudience.TEACHERS])
            )

        # Optional filters
        if audience_filter:
            query = query.filter(Notice.target_audience == audience_filter)

        if search:
            s = f"%{search.strip()}%"
            query = query.filter(or_(Notice.title.ilike(s), Notice.content.ilike(s)))

        total = query.count()

        # Pinned first, then newest publish date
        notices = (
            query.order_by(Notice.is_pinned.desc(), Notice.publish_date.desc(), Notice.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        items = [
            NoticeResponse(
                id=n.id,
                title=n.title,
                content=n.content,
                target_audience=n.target_audience,
                class_id=n.class_id,
                class_name=n.school_class.name if n.school_class else None,
                section_id=n.section_id,
                section_name=n.section.name if n.section else None,
                is_published=n.is_published,
                is_pinned=n.is_pinned,
                publish_date=n.publish_date,
                expires_at=n.expires_at,
                author_id=n.author_id,
                author_name=n.author.full_name if n.author else "School Administrator",
                created_at=n.created_at,
                updated_at=n.updated_at,
            )
            for n in notices
        ]

        return NoticeListResponse(total=total, items=items)
