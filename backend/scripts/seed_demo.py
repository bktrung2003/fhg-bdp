"""CLI seed script — thin wrapper around app.demo_seed.

Run via:
    cd backend
    uv run python scripts/seed_demo.py

Loads the same demo dataset that's available via the Settings UI
(Settings → Demo Data → Load), but from the command line. Useful for
fresh dev environments where you want to populate before the server
is running.
"""
import sys
from pathlib import Path

# Make `app` importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlmodel import Session, create_engine  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.demo_seed import load_demo, get_admin  # noqa: E402


def main() -> None:
    print(f"Seeding demo data for Fusion BD CORE OS...")
    print(f"  Database: {settings.SQLALCHEMY_DATABASE_URI}")
    engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))
    with Session(engine) as session:
        admin = get_admin(session)
        print(f"  Admin user: {admin.email}\n")
        counts = load_demo(session, admin, verbose=True)
        session.commit()
        summary = ", ".join(f"{v} {k}" for k, v in counts.items() if v > 0)
        print(f"\n  Done. Loaded: {summary}")
        print(f"  Login at http://localhost:5173 as admin@fusionhotelgroup.com")


if __name__ == "__main__":
    main()
