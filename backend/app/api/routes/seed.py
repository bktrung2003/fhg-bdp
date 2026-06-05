"""Seed/demo data endpoints — load + clear demo data for onboarding / demos.

Available endpoints:
- POST   /seed/demo/load   — load full demo dataset (superuser only)
- DELETE /seed/demo        — clear demo records (superuser only)
- GET    /seed/demo/info   — what's in the demo + current loaded state
- POST   /seed/load        — legacy JSON-based seed (local env only)
- DELETE /seed/clear       — nuke ALL business data (local env only)
"""
import json
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings
from app.demo_seed import (
    DEMO_SUMMARY, OWNERS, PROJECTS, DEALS,
    clear_demo, load_demo,
)
from app.models import (
    Activity, Deal, DealAuditLog, Document, FeasibilitySnapshot,
    Message, Milestone, Owner, OwnerContact, OwnerInteraction, Task,
)

router = APIRouter(prefix="/seed", tags=["seed"])

SEED_TAG = "DEMO_SEED"  # marker to identify seeded records


# ── Demo Data (Settings UI) ─────────────────────────────────────────────────

class DemoInfo(BaseModel):
    summary: dict[str, int]   # what the demo includes
    loaded: dict[str, int]    # how many demo records currently in DB
    is_loaded: bool


class DemoResult(BaseModel):
    message: str
    counts: dict[str, int]


def _count_loaded(session: SessionDep) -> dict[str, int]:
    """Count currently-loaded demo records (matched by name)."""
    seed_owner_companies = {o["company"] for o in OWNERS}
    seed_project_names = {p["name"] for p in PROJECTS}
    seed_deal_names = {d["name"] for d in DEALS}
    return {
        "owners":   len(session.exec(select(Owner).where(Owner.company.in_(seed_owner_companies))).all()),    # type: ignore[attr-defined]
        "projects": len(session.exec(select(Deal).where(Deal.name.in_(seed_deal_names))).all()),               # type: ignore[attr-defined]
        "deals":    len(session.exec(select(Deal).where(Deal.name.in_(seed_deal_names))).all()),               # type: ignore[attr-defined]
    }


@router.get("/demo/info", response_model=DemoInfo)
def demo_info(session: SessionDep, current_user: CurrentUser) -> Any:
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Superuser required")
    seed_owner_companies = {o["company"] for o in OWNERS}
    seed_project_names = {p["name"] for p in PROJECTS}
    seed_deal_names = {d["name"] for d in DEALS}
    loaded_owners = len(session.exec(select(Owner).where(Owner.company.in_(seed_owner_companies))).all())   # type: ignore[attr-defined]
    loaded_projects = 0  # projects table — count by name match
    from app.models import Project as _P
    loaded_projects = len(session.exec(select(_P).where(_P.name.in_(seed_project_names))).all())            # type: ignore[attr-defined]
    loaded_deals = len(session.exec(select(Deal).where(Deal.name.in_(seed_deal_names))).all())               # type: ignore[attr-defined]
    loaded = {"owners": loaded_owners, "projects": loaded_projects, "deals": loaded_deals}
    return DemoInfo(summary=DEMO_SUMMARY, loaded=loaded, is_loaded=loaded_deals > 0)


@router.post("/demo/load", response_model=DemoResult)
def demo_load(session: SessionDep, current_user: CurrentUser) -> Any:
    """Idempotent load — clears existing demo records first, then re-seeds.
    Real user data is NOT affected (demo records matched by name)."""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Superuser required to load demo data")
    counts = load_demo(session, current_user, verbose=False)
    session.commit()
    summary = ", ".join(f"{v} {k}" for k, v in counts.items() if v > 0)
    return DemoResult(message=f"Loaded: {summary}", counts=counts)


@router.delete("/demo", response_model=DemoResult)
def demo_clear(session: SessionDep, current_user: CurrentUser) -> Any:
    """Remove demo records (matched by name). Real user data untouched."""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Superuser required")
    # Count first
    seed_owner_companies = {o["company"] for o in OWNERS}
    seed_deal_names = {d["name"] for d in DEALS}
    seed_project_names = {p["name"] for p in PROJECTS}
    from app.models import Project as _P
    counts_before = {
        "owners":   len(session.exec(select(Owner).where(Owner.company.in_(seed_owner_companies))).all()),   # type: ignore[attr-defined]
        "projects": len(session.exec(select(_P).where(_P.name.in_(seed_project_names))).all()),               # type: ignore[attr-defined]
        "deals":    len(session.exec(select(Deal).where(Deal.name.in_(seed_deal_names))).all()),              # type: ignore[attr-defined]
    }
    clear_demo(session)
    session.commit()
    summary = ", ".join(f"{v} {k}" for k, v in counts_before.items() if v > 0)
    return DemoResult(message=f"Cleared: {summary or 'nothing to remove'}", counts=counts_before)


# ── Legacy JSON-based seed (local-only) ─────────────────────────────────────


@router.post("/load", response_model=Message)
def load_seed_data(
    *, session: SessionDep, current_user: CurrentUser, seed: dict[str, Any]
) -> Any:
    """Load seed data from JSON. Only works in local environment."""
    if settings.ENVIRONMENT != "local":
        raise HTTPException(status_code=403, detail="Seed data only available in local environment")
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Superuser required")

    now = datetime.now(timezone.utc)
    counts = {}

    # Deals
    for d in seed.get("deals", []):
        deal = Deal(
            id=uuid.uuid4(), name=d["name"], country=d["country"],
            region=d.get("region"), city=d.get("city"),
            owner_name=d.get("owner_name"), brand=d.get("brand"),
            project_type=d.get("project_type"),
            stage=d.get("stage", "Lead"),
            opening_target=d.get("opening_target"),
            keys=d.get("keys"), probability=d.get("probability"),
            pipeline_value=d.get("pipeline_value"),
            fee_forecast=d.get("fee_forecast"),
            risk=d.get("risk", "Green"),
            feasibility=d.get("feasibility", "TBD"),
            next_action=d.get("next_action"),
            deal_number=d.get("deal_number"),
            bd_owner_id=None, created_by_id=current_user.id,
            stage_changed_at=now, created_at=now, updated_at=now,
        )
        session.add(deal)
        # Audit log
        session.add(DealAuditLog(
            deal_id=deal.id, user_id=current_user.id,
            field="stage", old_value=None, new_value=deal.stage,
            note=f"{SEED_TAG}: Deal created", created_at=now,
        ))
    counts["deals"] = len(seed.get("deals", []))

    session.flush()  # get deal IDs

    # Map deal names to IDs for linking
    all_deals = session.exec(select(Deal)).all()
    deal_map = {d.name: d.id for d in all_deals}

    # Owners
    for o in seed.get("owners", []):
        owner = Owner(
            id=uuid.uuid4(), company=o["company"],
            owner_type=o.get("owner_type", "Developer"),
            country=o["country"],
            priority=o.get("priority", "Medium"),
            relationship=o.get("relationship", "New"),
            catchup_status=o.get("catchup_status", "No cadence"),
            next_catchup=o.get("next_catchup"),
            assets=o.get("assets"),
            financial_health=o.get("financial_health", "Unknown"),
            strategic_value=o.get("strategic_value"),
            created_at=now, updated_at=now,
        )
        session.add(owner)
        session.flush()

        for c in o.get("contacts", []):
            session.add(OwnerContact(
                owner_id=owner.id, fusion_role=c["fusion_role"],
                owner_contact=c["owner_contact"],
                strength=c.get("strength", "New"),
                last_met=c.get("last_met"), senior_flag=c.get("senior_flag", False),
                note=c.get("note"),
            ))
        for i in o.get("interactions", []):
            session.add(OwnerInteraction(
                owner_id=owner.id, interaction_type=i.get("type", "Meeting"),
                date=i["date"], note=i.get("note"), created_at=now,
            ))
    counts["owners"] = len(seed.get("owners", []))

    # Tasks
    for t in seed.get("tasks", []):
        deal_id = deal_map.get(t.get("deal_name"))
        session.add(Task(
            title=t["title"], deal_id=deal_id, deal_name=t.get("deal_name"),
            task_owner=t.get("task_owner"), due_date=t.get("due_date"),
            priority=t.get("priority", "Medium"), status=t.get("status", "Open"),
            note=t.get("note"),
            created_by_id=current_user.id, created_at=now, updated_at=now,
        ))
    counts["tasks"] = len(seed.get("tasks", []))

    # Activities
    for a in seed.get("activities", []):
        deal_id = deal_map.get(a.get("deal_name"))
        session.add(Activity(
            activity_type=a.get("type", "Meeting"), date=a["date"],
            deal_id=deal_id, deal_name=a.get("deal_name"), note=a.get("note"),
            created_by_id=current_user.id, created_at=now,
        ))
    counts["activities"] = len(seed.get("activities", []))

    # Milestones
    for m in seed.get("milestones", []):
        deal_id = deal_map.get(m.get("deal_name"))
        session.add(Milestone(
            name=m["name"], deal_id=deal_id, deal_name=m.get("deal_name"),
            department=m.get("department", "Ops"),
            milestone_owner=m.get("milestone_owner"),
            due_date=m.get("due_date"), status=m.get("status", "Green"),
            blocker=m.get("blocker"),
            created_by_id=current_user.id, created_at=now, updated_at=now,
        ))
    counts["milestones"] = len(seed.get("milestones", []))

    # Feasibility snapshots
    for f in seed.get("feasibility_snapshots", []):
        deal_id = deal_map.get(f.get("deal_name"))
        session.add(FeasibilitySnapshot(
            deal_id=deal_id, deal_name=f.get("deal_name"),
            label=f.get("label", "Base Case"),
            assumptions=json.dumps(f["assumptions"]),
            outputs=json.dumps(f["outputs"]),
            created_by_id=current_user.id, created_at=now,
        ))
    counts["feasibility_snapshots"] = len(seed.get("feasibility_snapshots", []))

    session.commit()
    summary = ", ".join(f"{v} {k}" for k, v in counts.items() if v > 0)
    return Message(message=f"Seed data loaded: {summary}")


@router.delete("/clear", response_model=Message)
def clear_all_data(session: SessionDep, current_user: CurrentUser) -> Any:
    """Delete ALL business data. Keeps users. Only local environment."""
    if settings.ENVIRONMENT != "local":
        raise HTTPException(status_code=403, detail="Only available in local environment")
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Superuser required")

    counts = {}
    for model, name in [
        (DealAuditLog, "audit_logs"), (FeasibilitySnapshot, "feasibility_snapshots"),
        (Milestone, "milestones"), (Activity, "activities"), (Task, "tasks"),
        (Document, "documents"),
        (OwnerInteraction, "owner_interactions"), (OwnerContact, "owner_contacts"),
        (Owner, "owners"), (Deal, "deals"),
    ]:
        rows = session.exec(select(model)).all()
        counts[name] = len(rows)
        for r in rows:
            session.delete(r)

    session.commit()
    summary = ", ".join(f"{v} {k}" for k, v in counts.items() if v > 0)
    return Message(message=f"Cleared: {summary}")
