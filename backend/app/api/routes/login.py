from datetime import datetime, timedelta, timezone
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Form, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import col, delete, func, select

from app import crud
from app.api.deps import CurrentUser, SessionDep, get_current_active_superuser
from app.core import security
from app.core.config import settings
from app.models import LoginAttempt, Message, NewPassword, Token, UserPublic, UserUpdate

# Rate-limit thresholds (per rolling window)
_RL_WINDOW_MIN = 15
_RL_MAX_PER_EMAIL = 8
_RL_MAX_PER_IP = 25


def _client_ip(request: Request) -> str | None:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else None


def _check_login_rate(session: SessionDep, email: str, ip: str | None) -> None:
    """Raise 429 if too many recent failed logins for this email or IP."""
    since = datetime.now(timezone.utc) - timedelta(minutes=_RL_WINDOW_MIN)
    # prune old rows opportunistically
    session.exec(delete(LoginAttempt).where(col(LoginAttempt.created_at) < since - timedelta(hours=1)))
    session.commit()
    by_email = session.exec(
        select(func.count()).select_from(LoginAttempt)
        .where(LoginAttempt.email == email, LoginAttempt.created_at >= since)
    ).one()
    if (by_email or 0) >= _RL_MAX_PER_EMAIL:
        raise HTTPException(status_code=429, detail=f"Too many attempts. Try again in {_RL_WINDOW_MIN} minutes.")
    if ip:
        by_ip = session.exec(
            select(func.count()).select_from(LoginAttempt)
            .where(LoginAttempt.ip_address == ip, LoginAttempt.created_at >= since)
        ).one()
        if (by_ip or 0) >= _RL_MAX_PER_IP:
            raise HTTPException(status_code=429, detail=f"Too many attempts. Try again in {_RL_WINDOW_MIN} minutes.")


def _record_failure(session: SessionDep, email: str, ip: str | None) -> None:
    session.add(LoginAttempt(email=email, ip_address=ip))
    session.commit()


def _clear_failures(session: SessionDep, email: str) -> None:
    session.exec(delete(LoginAttempt).where(LoginAttempt.email == email))
    session.commit()
from app.utils import (
    generate_password_reset_token,
    generate_reset_password_email,
    send_email,
    verify_password_reset_token,
)

router = APIRouter(tags=["login"])


@router.post("/login/access-token")
def login_access_token(
    request: Request,
    session: SessionDep,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    code: Annotated[str | None, Form()] = None,
) -> Token:
    """
    OAuth2 compatible token login. Rate-limited per email + IP to blunt
    brute-force. If 2FA is enabled, a valid TOTP `code` is required (a 401
    "TOTP_REQUIRED" prompts the client for the code).
    """
    email = form_data.username
    ip = _client_ip(request)
    _check_login_rate(session, email, ip)

    user = crud.authenticate(
        session=session, email=email, password=form_data.password
    )
    if not user:
        _record_failure(session, email, ip)
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    if user.totp_enabled and user.totp_secret:
        if not code:
            raise HTTPException(status_code=401, detail="TOTP_REQUIRED")
        import pyotp
        if not pyotp.TOTP(user.totp_secret).verify(code.strip(), valid_window=1):
            _record_failure(session, email, ip)  # count code brute-force too
            raise HTTPException(status_code=401, detail="Invalid authentication code")

    _clear_failures(session, email)
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return Token(
        access_token=security.create_access_token(
            user.id, expires_delta=access_token_expires
        )
    )


@router.post("/login/test-token", response_model=UserPublic)
def test_token(current_user: CurrentUser) -> Any:
    """
    Test access token
    """
    return current_user


@router.post("/password-recovery/{email}")
def recover_password(email: str, session: SessionDep) -> Message:
    """
    Password Recovery
    """
    user = crud.get_user_by_email(session=session, email=email)

    # Always return the same response to prevent email enumeration attacks
    # Only send email if user actually exists
    if user:
        password_reset_token = generate_password_reset_token(email=email)
        email_data = generate_reset_password_email(
            email_to=user.email, email=email, token=password_reset_token
        )
        send_email(
            email_to=user.email,
            subject=email_data.subject,
            html_content=email_data.html_content,
        )
    return Message(
        message="If that email is registered, we sent a password recovery link"
    )


@router.post("/reset-password/")
def reset_password(session: SessionDep, body: NewPassword) -> Message:
    """
    Reset password
    """
    email = verify_password_reset_token(token=body.token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid token")
    user = crud.get_user_by_email(session=session, email=email)
    if not user:
        # Don't reveal that the user doesn't exist - use same error as invalid token
        raise HTTPException(status_code=400, detail="Invalid token")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    user_in_update = UserUpdate(password=body.new_password)
    crud.update_user(
        session=session,
        db_user=user,
        user_in=user_in_update,
    )
    return Message(message="Password updated successfully")


@router.post(
    "/password-recovery-html-content/{email}",
    dependencies=[Depends(get_current_active_superuser)],
    response_class=HTMLResponse,
)
def recover_password_html_content(email: str, session: SessionDep) -> Any:
    """
    HTML Content for Password Recovery
    """
    user = crud.get_user_by_email(session=session, email=email)

    if not user:
        raise HTTPException(
            status_code=404,
            detail="The user with this username does not exist in the system.",
        )
    password_reset_token = generate_password_reset_token(email=email)
    email_data = generate_reset_password_email(
        email_to=user.email, email=email, token=password_reset_token
    )

    return HTMLResponse(
        content=email_data.html_content, headers={"subject:": email_data.subject}
    )
