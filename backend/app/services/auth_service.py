from datetime import datetime, timezone
from typing import Optional, Tuple
from uuid import UUID
from sqlalchemy.orm import Session
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import User


class AuthService:
    @staticmethod
    def authenticate(db: Session, email: str, password: str) -> Optional[User]:
        user = db.query(User).filter(User.email.ilike(email.strip())).first()
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        if not user.is_active:
            return None

        # Record last login timestamp
        user.last_login = datetime.now(timezone.utc)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def create_user_tokens(user: User) -> Tuple[str, str]:
        extra_claims = {
            "email": user.email,
            "role": user.role.value,
            "name": user.full_name,
        }
        access_token = create_access_token(subject=str(user.id), extra_claims=extra_claims)
        refresh_token = create_refresh_token(subject=str(user.id), extra_claims=extra_claims)
        return access_token, refresh_token

    @staticmethod
    def refresh_tokens(db: Session, refresh_token: str) -> Optional[Tuple[str, str, User]]:
        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            return None

        user_id_str = payload.get("sub")
        if not user_id_str:
            return None

        try:
            user_uuid = UUID(user_id_str)
        except ValueError:
            return None

        user = db.query(User).filter(User.id == user_uuid).first()
        if not user or not user.is_active:
            return None

        new_access, new_refresh = AuthService.create_user_tokens(user)
        return new_access, new_refresh, user

    @staticmethod
    def change_password(db: Session, user: User, current_password: str, new_password: str) -> bool:
        if not verify_password(current_password, user.hashed_password):
            return False
        user.hashed_password = hash_password(new_password)
        db.commit()
        db.refresh(user)
        return True
