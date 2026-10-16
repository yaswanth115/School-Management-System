from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user, get_client_ip
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    ChangePasswordRequest,
    UserAuthSummary,
)
from app.schemas.common import MessageResponse
from app.schemas.user import UserProfileUpdate, UserResponse
from app.services.auth_service import AuthService
from app.services.audit_service import AuditService
from app.services.user_service import UserService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(
    req: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Authenticate user with email and password, returning JWT access and refresh tokens."""
    user = AuthService.authenticate(db, email=req.email, password=req.password)
    client_ip = get_client_ip(request)

    if not user:
        AuditService.log_event(
            db=db,
            action="LOGIN_FAILED",
            resource_type="auth",
            details={"email": req.email},
            ip_address=client_ip,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    access_token, refresh_token = AuthService.create_user_tokens(user)

    AuditService.log_event(
        db=db,
        action="LOGIN_SUCCESS",
        resource_type="auth",
        user_id=user.id,
        resource_id=str(user.id),
        details={"email": user.email, "role": user.role.value},
        ip_address=client_ip,
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserAuthSummary.model_validate(user),
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(
    req: RefreshTokenRequest,
    db: Session = Depends(get_db),
):
    """Exchange a valid refresh token for a new access token and refresh token."""
    result = AuthService.refresh_tokens(db, req.refresh_token)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
    access_token, new_refresh_token, user = result
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        user=UserAuthSummary.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Retrieve currently authenticated user profile."""
    return current_user


@router.put("/profile", response_model=UserResponse)
def update_profile(
    profile_in: UserProfileUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update profile details of currently authenticated user."""
    updated_user = UserService.update_profile(db, current_user, profile_in)
    AuditService.log_event(
        db=db,
        action="PROFILE_UPDATED",
        resource_type="user",
        user_id=current_user.id,
        resource_id=str(current_user.id),
        details={"updated_fields": profile_in.model_dump(exclude_unset=True)},
        ip_address=get_client_ip(request),
    )
    return updated_user


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    req: ChangePasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Change password for authenticated user."""
    success = AuthService.change_password(
        db, current_user, req.current_password, req.new_password
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password verification failed",
        )

    AuditService.log_event(
        db=db,
        action="PASSWORD_CHANGED",
        resource_type="auth",
        user_id=current_user.id,
        resource_id=str(current_user.id),
        ip_address=get_client_ip(request),
    )
    return MessageResponse(message="Password changed successfully")


@router.post("/logout", response_model=MessageResponse)
def logout(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Log out user session and record audit event."""
    AuditService.log_event(
        db=db,
        action="LOGOUT",
        resource_type="auth",
        user_id=current_user.id,
        resource_id=str(current_user.id),
        ip_address=get_client_ip(request),
    )
    return MessageResponse(message="Successfully logged out")
