"""Scheduled notification jobs (run by the notify-cron service / a cron).

Currently:
- notify_overdue_tasks: one push per assignee summarising their overdue tasks.
"""
import logging
from datetime import date

from sqlmodel import Session, select

from app.models import Task, TaskStatus
from app.push import send_push_to_user

logger = logging.getLogger("notify")


def notify_overdue_tasks(session: Session) -> int:
    """Find tasks past their due_date that aren't Done, group by assignee,
    and send each assignee a single summary push. Returns push count."""
    today = date.today().isoformat()

    tasks = session.exec(
        select(Task).where(
            Task.status != TaskStatus.DONE,
            Task.due_date.is_not(None),  # type: ignore[union-attr]
            Task.due_date < today,        # string compare works for ISO dates
            Task.task_owner_id.is_not(None),  # type: ignore[union-attr]
        )
    ).all()

    # Group by assignee
    by_owner: dict = {}
    for t in tasks:
        by_owner.setdefault(t.task_owner_id, []).append(t)

    sent = 0
    for owner_id, owner_tasks in by_owner.items():
        n = len(owner_tasks)
        first = owner_tasks[0].title
        body = (
            f"{first}" if n == 1
            else f"{first} + {n - 1} more"
        )
        sent += send_push_to_user(
            session,
            owner_id,
            title=f"{n} overdue task{'s' if n > 1 else ''}",
            body=body,
            url="/activities",
            tag="overdue-tasks",
        )
    logger.info("overdue notifier: %d tasks, %d pushes", len(tasks), sent)
    return sent
