from typing import List, Optional, Tuple
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from app.core.security import hash_password
from app.models.role import RoleEnum
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserProfileUpdate


class UserService:
    @staticmethod
    def get_by_id(db: Session, user_id: UUID) -> Optional[User]:
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def get_by_email(db: Session, email: str) -> Optional[User]:
        return db.query(User).filter(User.email.ilike(email.strip())).first()

    @staticmethod
    def get_users(
        db: Session,
        skip: int = 0,
        limit: int = 20,
        role: Optional[RoleEnum] = None,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[User], int]:
        query = db.query(User)

        if role:
            query = query.filter(User.role == role)
        if is_active is not None:
            query = query.filter(User.is_active == is_active)
        if search:
            search_term = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    User.full_name.ilike(search_term),
                    User.email.ilike(search_term),
                    User.phone.ilike(search_term),
                )
            )

        total = query.count()
        users = query.order_by(desc(User.created_at)).offset(skip).limit(limit).all()
        return users, total

    @staticmethod
    def create_user(db: Session, user_in: UserCreate) -> User:
        user = User(
            email=user_in.email.lower().strip(),
            hashed_password=hash_password(user_in.password),
            full_name=user_in.full_name.strip(),
            phone=user_in.phone.strip() if user_in.phone else None,
            role=user_in.role,
            is_active=user_in.is_active,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def update_user(db: Session, user: User, user_in: UserUpdate) -> User:
        if user_in.email:
            user.email = user_in.email.lower().strip()
        if user_in.full_name:
            user.full_name = user_in.full_name.strip()
        if user_in.phone is not None:
            user.phone = user_in.phone.strip() if user_in.phone else None
        if user_in.role:
            user.role = user_in.role
        if user_in.is_active is not None:
            user.is_active = user_in.is_active
        if user_in.password:
            user.hashed_password = hash_password(user_in.password)

        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def update_profile(db: Session, user: User, profile_in: UserProfileUpdate) -> User:
        if profile_in.full_name:
            user.full_name = profile_in.full_name.strip()
        if profile_in.phone is not None:
            user.phone = profile_in.phone.strip() if profile_in.phone else None
        if profile_in.avatar_url is not None:
            user.avatar_url = profile_in.avatar_url

        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def toggle_status(db: Session, user: User, is_active: bool) -> User:
        user.is_active = is_active
        db.commit()
        db.refresh(user)
        return user
