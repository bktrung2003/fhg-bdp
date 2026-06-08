"""Web Push subscription endpoints.

- GET    /push/config       — VAPID public key + enabled flag (frontend needs this)
- POST   /push/subscribe    — register this device's subscription
- DELETE /push/subscribe    — remove this device's subscription
- POST   /push/test         — send a test notification to the current user
"""
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings
from app.models import Message, PushSubscription, PushSubscriptionCreate
from app.push import send_push_to_user

router = APIRouter(prefix="/push", tags=["push"])


class PushConfig(BaseModel):
    enabled: bool
    public_key: str


@router.get("/config", response_model=PushConfig)
def push_config(current_user: CurrentUser) -> Any:
    return PushConfig(
        enabled=settings.push_enabled,
        public_key=settings.VAPID_PUBLIC_KEY,
    )


@router.post("/subscribe", response_model=Message)
def subscribe(
    body: PushSubscriptionCreate, session: SessionDep, current_user: CurrentUser
) -> Any:
    """Idempotent — upserts by endpoint. Re-subscribing the same device just
    refreshes its keys + owner."""
    existing = session.exec(
        select(PushSubscription).where(PushSubscription.endpoint == body.endpoint)
    ).first()
    if existing:
        existing.user_id = current_user.id
        existing.p256dh = body.keys.get("p256dh", "")
        existing.auth = body.keys.get("auth", "")
        existing.user_agent = body.user_agent
        session.add(existing)
    else:
        session.add(
            PushSubscription(
                user_id=current_user.id,
                endpoint=body.endpoint,
                p256dh=body.keys.get("p256dh", ""),
                auth=body.keys.get("auth", ""),
                user_agent=body.user_agent,
            )
        )
    session.commit()
    return Message(message="Subscribed")


@router.delete("/subscribe", response_model=Message)
def unsubscribe(
    endpoint: str, session: SessionDep, current_user: CurrentUser
) -> Any:
    sub = session.exec(
        select(PushSubscription).where(PushSubscription.endpoint == endpoint)
    ).first()
    if sub:
        session.delete(sub)
        session.commit()
    return Message(message="Unsubscribed")


@router.post("/test", response_model=Message)
def test_push(session: SessionDep, current_user: CurrentUser) -> Any:
    n = send_push_to_user(
        session,
        current_user.id,
        title="Fusion BDP",
        body="Test notification — push is working ✅",
        url="/",
        tag="test",
    )
    return Message(message=f"Sent to {n} device(s)")
