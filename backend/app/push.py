"""Web Push helper — send notifications to a user's subscribed devices.

Push is best-effort: failures (expired subscription, network) are swallowed
per-subscription and dead subscriptions are pruned. Never raises into the
calling request path.
"""
import json
import logging

from sqlmodel import Session, select

from app.core.config import settings
from app.models import PushSubscription

logger = logging.getLogger("push")


def send_push_to_user(
    session: Session,
    user_id,
    title: str,
    body: str,
    url: str = "/",
    tag: str | None = None,
) -> int:
    """Send a push notification to all of a user's subscribed devices.
    Returns the number of devices successfully notified. No-op if push is
    not configured. Prunes subscriptions the push service rejects (410/404)."""
    if not settings.push_enabled:
        return 0

    try:
        from pywebpush import webpush, WebPushException
    except Exception:  # pragma: no cover
        logger.warning("pywebpush not installed — skipping push")
        return 0

    subs = session.exec(
        select(PushSubscription).where(PushSubscription.user_id == user_id)
    ).all()
    if not subs:
        return 0

    payload = json.dumps({"title": title, "body": body, "url": url, "tag": tag})
    vapid_claims = {"sub": settings.VAPID_SUBJECT}
    sent = 0
    dead: list[PushSubscription] = []

    for sub in subs:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                },
                data=payload,
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims=dict(vapid_claims),
                timeout=10,
            )
            sent += 1
        except WebPushException as e:  # type: ignore[misc]
            status = getattr(getattr(e, "response", None), "status_code", None)
            if status in (404, 410):
                dead.append(sub)  # subscription gone — prune
            else:
                logger.warning("push failed (%s): %s", status, e)
        except Exception as e:  # pragma: no cover
            logger.warning("push error: %s", e)

    for sub in dead:
        session.delete(sub)
    if dead:
        session.commit()

    return sent
