from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.audit import AuditLog
from app.models.user import User


class AuditService:
    @staticmethod
    def log_event(
        db: Session,
        action: str,
        resource_type: str,
        user_id: Optional[UUID] = None,
        resource_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
    ) -> AuditLog:
        """Create and persist an audit log entry."""
        audit_log = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            ip_address=ip_address,
        )
        db.add(audit_log)
        db.commit()
        db.refresh(audit_log)
        return audit_log

    @staticmethod
    def get_logs(
        db: Session,
        skip: int = 0,
        limit: int = 20,
        user_id: Optional[UUID] = None,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
    ) -> Tuple[List[AuditLog], int]:
        """Query audit logs with optional filters and total count."""
        query = db.query(AuditLog)

        if user_id:
            query = query.filter(AuditLog.user_id == user_id)
        if action:
            query = query.filter(AuditLog.action.ilike(f"%{action}%"))
        if resource_type:
            query = query.filter(AuditLog.resource_type == resource_type)

        total = query.count()
        logs = query.order_by(desc(AuditLog.timestamp)).offset(skip).limit(limit).all()
        return logs, total
