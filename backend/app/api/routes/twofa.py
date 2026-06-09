"""Two-factor auth (TOTP) — opt-in per user.

Flow:
  POST /2fa/setup   → generates a secret (not yet enabled), returns otpauth URI + secret
  POST /2fa/enable  → body {code}; verifies against the pending secret → enables 2FA
  POST /2fa/disable → body {code}; verifies → disables + clears secret
The login flow (login/access-token) asks for a code only when totp_enabled.
"""
from typing import Any

import pyotp
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.api.deps import CurrentUser, SessionDep

router = APIRouter(prefix="/2fa", tags=["2fa"])

ISSUER = "Fusion BD CORE OS"


class SetupResponse(BaseModel):
    secret: str
    otpauth_uri: str


class CodeBody(BaseModel):
    code: str


@router.post("/setup", response_model=SetupResponse)
def setup_2fa(session: SessionDep, current_user: CurrentUser) -> Any:
    """Generate a fresh TOTP secret (stored but not yet enabled). Re-calling
    before enabling regenerates the secret."""
    if current_user.totp_enabled:
        raise HTTPException(status_code=400, detail="2FA is already enabled")
    secret = pyotp.random_base32()
    current_user.totp_secret = secret
    session.add(current_user)
    session.commit()
    uri = pyotp.TOTP(secret).provisioning_uri(name=current_user.email, issuer_name=ISSUER)
    return SetupResponse(secret=secret, otpauth_uri=uri)


@router.post("/enable", response_model=dict)
def enable_2fa(body: CodeBody, session: SessionDep, current_user: CurrentUser) -> Any:
    if current_user.totp_enabled:
        raise HTTPException(status_code=400, detail="2FA is already enabled")
    if not current_user.totp_secret:
        raise HTTPException(status_code=400, detail="Run setup first")
    if not pyotp.TOTP(current_user.totp_secret).verify(body.code.strip(), valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid code — check your authenticator and try again")
    current_user.totp_enabled = True
    session.add(current_user)
    session.commit()
    return {"message": "Two-factor authentication enabled"}


@router.post("/disable", response_model=dict)
def disable_2fa(body: CodeBody, session: SessionDep, current_user: CurrentUser) -> Any:
    if not current_user.totp_enabled or not current_user.totp_secret:
        raise HTTPException(status_code=400, detail="2FA is not enabled")
    if not pyotp.TOTP(current_user.totp_secret).verify(body.code.strip(), valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid code")
    current_user.totp_enabled = False
    current_user.totp_secret = None
    session.add(current_user)
    session.commit()
    return {"message": "Two-factor authentication disabled"}
