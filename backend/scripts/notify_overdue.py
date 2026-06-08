"""Send overdue-task push notifications. Run daily via cron.

    cd backend && uv run python scripts/notify_overdue.py

Self-contained: opens its own DB session. Safe to run repeatedly (push is
deduped per-device by tag, and re-sending a daily reminder is intended).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlmodel import Session, create_engine  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.notify import notify_overdue_tasks  # noqa: E402


def main() -> None:
    engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))
    with Session(engine) as session:
        n = notify_overdue_tasks(session)
        print(f"Overdue notifier done — {n} push(es) sent")


if __name__ == "__main__":
    main()
