import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    APACRegion,
    Deal,
    DealAuditLog,
    DealAuditLogPublic,
    DealCreate,
    DealFeasibility,
    DealPublic,
    DealRisk,
    DealsPublic,
    DealStage,
    DealUpdate,
    MasterData,
    Message,
    Owner,
    Project,
    StageChangeRequest,
    User,
    UserRole,
)
from app.push import send_push_to_user


def _get_default_probability(session: SessionDep, stage: str) -> int | None:
    """Look up default probability for a stage from master_data."""
    entries = session.exec(
        select(MasterData).where(MasterData.category == "stage_probability")
    ).all()
    for e in entries:
        if ":" in e.value:
            s, p = e.value.split(":", 1)
            if s.strip() == stage:
                try:
                    return int(p.strip())
                except ValueError:
                    return None
    return None

router = APIRouter(prefix="/deals", tags=["deals"])


def _to_public(deal: Deal, session: SessionDep | None = None) -> DealPublic:
    """Convert Deal DB model → DealPublic with computed fields + project enrichment."""
    days = 0
    if deal.stage_changed_at:
        delta = datetime.now(timezone.utc) - deal.stage_changed_at.replace(
            tzinfo=timezone.utc
        )
        days = delta.days

    bd_owner_name = None
    if deal.bd_owner:
        bd_owner_name = deal.bd_owner.full_name or deal.bd_owner.email

    # Enrich from Project if linked
    project_name = None
    project_number = None
    owner_id = None
    if deal.project_id and session is not None:
        project = session.get(Project, deal.project_id)
        if project:
            project_name = project.name
            project_number = project.project_number
            owner_id = project.owner_id

    # Fallback: if no project link but owner_name set, find owner by name
    if owner_id is None and deal.owner_name and session is not None:
        from sqlmodel import select as sel
        owner = session.exec(
            sel(Owner).where(Owner.company == deal.owner_name)
        ).first()
        if owner:
            owner_id = owner.id

    # Enrich with latest feasibility assessment summary (cheap query via index)
    feasibility_score = None
    feasibility_recommendation = None
    feasibility_reviewed = False
    if session is not None:
        from app.models import FeasibilityAssessment as _FA
        from sqlmodel import select as _sel
        fa = session.exec(
            _sel(_FA).where(_FA.deal_id == deal.id, _FA.is_current == True)  # noqa: E712
        ).first()
        if fa:
            feasibility_score = fa.total_score
            feasibility_recommendation = fa.recommendation
            feasibility_reviewed = fa.reviewed_by_id is not None

    return DealPublic(
        **deal.model_dump(),
        days_in_stage=days,
        bd_owner_name=bd_owner_name,
        project_name=project_name,
        project_number=project_number,
        owner_id=owner_id,
        feasibility_score=feasibility_score,
        feasibility_recommendation=feasibility_recommendation,
        feasibility_reviewed=feasibility_reviewed,
    )


def _next_deal_number(session: SessionDep) -> int:
    result = session.exec(select(func.max(Deal.deal_number))).one()
    return (result or 0) + 1


# ── GET /deals ────────────────────────────────────────────────────────────────

@router.get("/", response_model=DealsPublic)
def list_deals(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = Query(default=100, le=500),
    search: str | None = None,
    country: str | None = None,
    region: APACRegion | None = None,
    stage: DealStage | None = None,
    risk: DealRisk | None = None,
    feasibility: DealFeasibility | None = None,
    bd_owner_id: uuid.UUID | None = None,
) -> Any:
    """List all deals with optional filters. BDM sees only their own deals."""

    statement = select(Deal)

    # BDM only sees own deals
    if current_user.role == UserRole.BD_MANAGER and not current_user.is_superuser:
        statement = statement.where(Deal.bd_owner_id == current_user.id)

    # Active deals only by default (exclude Lost/Opened for normal views)
    # Filters
    if search:
        q = f"%{search.lower()}%"
        statement = statement.where(
            col(Deal.name).ilike(q)
            | col(Deal.owner_name).ilike(q)
            | col(Deal.city).ilike(q)
        )
    if country:
        statement = statement.where(Deal.country == country)
    if region:
        statement = statement.where(Deal.region == region)
    if stage:
        statement = statement.where(Deal.stage == stage)
    if risk:
        statement = statement.where(Deal.risk == risk)
    if feasibility:
        statement = statement.where(Deal.feasibility == feasibility)
    if bd_owner_id:
        statement = statement.where(Deal.bd_owner_id == bd_owner_id)

    count_stmt = select(func.count()).select_from(statement.subquery())
    count = session.exec(count_stmt).one()

    statement = statement.order_by(col(Deal.updated_at).desc()).offset(skip).limit(limit)
    deals = session.exec(statement).all()

    return DealsPublic(data=[_to_public(d, session) for d in deals], count=count)


# ── GET /deals/{id} ───────────────────────────────────────────────────────────

@router.get("/{id}", response_model=DealPublic)
def get_deal(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    """Get single deal by ID."""
    deal = session.get(Deal, id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    _check_read_permission(current_user, deal)
    return _to_public(deal, session)


# ── POST /deals ───────────────────────────────────────────────────────────────

@router.post("/", response_model=DealPublic, status_code=201)
def create_deal(
    *, session: SessionDep, current_user: CurrentUser, deal_in: DealCreate
) -> Any:
    """Create a new deal. If linked to a Project, denormalize project fields."""
    now = datetime.now(timezone.utc)

    # Build the deal payload from input
    payload = deal_in.model_dump()

    # If linked to a project, copy project's denormalized fields when deal doesn't override
    if payload.get("project_id"):
        project = session.get(Project, payload["project_id"])
        if project:
            # Copy from project unless explicitly overridden
            for field in ("country", "region", "city", "project_type", "keys", "opening_target"):
                if not payload.get(field):
                    payload[field] = getattr(project, field, None)
            # Owner name from project's owner
            if not payload.get("owner_name") and project.owner_id:
                owner = session.get(Owner, project.owner_id)
                if owner:
                    payload["owner_name"] = owner.company

    payload.update({
        "created_by_id": current_user.id,
        "deal_number": _next_deal_number(session),
        "stage_changed_at": now,
        "created_at": now,
        "updated_at": now,
    })

    # Auto-set probability from stage if not specified
    if payload.get("probability") is None and payload.get("stage"):
        stage_str = payload["stage"] if isinstance(payload["stage"], str) else payload["stage"].value
        default_prob = _get_default_probability(session, stage_str)
        if default_prob is not None:
            payload["probability"] = default_prob
            payload["probability_source"] = "auto"

    deal = Deal(**payload)
    session.add(deal)

    # Audit log — creation
    log = DealAuditLog(
        deal_id=deal.id,
        user_id=current_user.id,
        field="stage",
        old_value=None,
        new_value=deal.stage if isinstance(deal.stage, str) else deal.stage.value,
        note="Deal created",
    )
    session.add(log)
    session.commit()
    session.refresh(deal)
    return _to_public(deal, session)


# ── PUT /deals/{id} ───────────────────────────────────────────────────────────

@router.put("/{id}", response_model=DealPublic)
def update_deal(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    deal_in: DealUpdate,
) -> Any:
    """Update deal fields (not stage — use PATCH /stage for that)."""
    deal = session.get(Deal, id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    _check_write_permission(current_user, deal)

    update_data = deal_in.model_dump(exclude_unset=True)

    # If user explicitly changed probability, mark source as manual
    if "probability" in update_data and update_data["probability"] != deal.probability:
        update_data["probability_source"] = "manual"

    # Track changed fields in audit log
    for field, new_val in update_data.items():
        old_val = getattr(deal, field, None)
        if str(old_val) != str(new_val):
            session.add(
                DealAuditLog(
                    deal_id=deal.id,
                    user_id=current_user.id,
                    field=field,
                    old_value=str(old_val) if old_val is not None else None,
                    new_value=str(new_val),
                )
            )

    deal.sqlmodel_update(update_data)
    deal.updated_at = datetime.now(timezone.utc)
    session.add(deal)
    session.commit()
    session.refresh(deal)
    return _to_public(deal, session)


# ── PATCH /deals/{id}/stage ───────────────────────────────────────────────────

@router.patch("/{id}/stage", response_model=DealPublic)
def change_stage(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    req: StageChangeRequest,
) -> Any:
    """
    Change deal stage — requires audit note.
    Stage change is tracked separately with mandatory reason.
    """
    deal = session.get(Deal, id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    _check_write_permission(current_user, deal)

    if deal.stage == req.new_stage:
        raise HTTPException(status_code=400, detail="Deal is already in this stage")

    now = datetime.now(timezone.utc)
    old_stage = deal.stage
    old_prob = deal.probability

    new_stage_str = req.new_stage if isinstance(req.new_stage, str) else req.new_stage.value
    deal.stage = req.new_stage
    deal.stage_changed_at = now
    deal.updated_at = now
    if req.next_action:
        deal.next_action = req.next_action

    # Auto-update probability if source is "auto"
    if (deal.probability_source or "auto") == "auto":
        default_prob = _get_default_probability(session, new_stage_str)
        if default_prob is not None:
            deal.probability = default_prob

    session.add(deal)
    session.add(
        DealAuditLog(
            deal_id=deal.id,
            user_id=current_user.id,
            field="stage",
            old_value=old_stage if isinstance(old_stage, str) else old_stage.value,
            new_value=new_stage_str,
            note=req.note,
        )
    )
    # Audit probability change if it changed automatically
    if old_prob != deal.probability:
        session.add(
            DealAuditLog(
                deal_id=deal.id,
                user_id=current_user.id,
                field="probability",
                old_value=str(old_prob) if old_prob is not None else None,
                new_value=str(deal.probability) if deal.probability is not None else "",
                note=f"Auto-updated from stage change to {new_stage_str}",
            )
        )
    session.commit()
    session.refresh(deal)

    # Notify executives (superusers) of the stage change — best-effort push.
    try:
        execs = session.exec(
            select(User).where(User.is_superuser == True, User.is_active == True)  # noqa: E712
        ).all()
        for u in execs:
            if u.id == current_user.id:
                continue  # don't notify the person who made the change
            send_push_to_user(
                session,
                u.id,
                title=f"Deal moved → {new_stage_str}",
                body=f"{deal.name}: {old_stage if isinstance(old_stage, str) else old_stage.value} → {new_stage_str}",
                url=f"/deals/{deal.id}",
                tag=f"deal-stage-{deal.id}",
            )
    except Exception:
        pass  # never let push break the request

    return _to_public(deal, session)


# ── GET /deals/{id}/audit ─────────────────────────────────────────────────────

@router.get("/{id}/audit", response_model=list[DealAuditLogPublic])
def get_deal_audit(
    session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> Any:
    """Get full audit trail for a deal."""
    deal = session.get(Deal, id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    _check_read_permission(current_user, deal)

    logs = session.exec(
        select(DealAuditLog)
        .where(DealAuditLog.deal_id == id)
        .order_by(col(DealAuditLog.created_at).desc())
    ).all()
    return logs


# ── DELETE /deals/{id} ────────────────────────────────────────────────────────

@router.delete("/{id}", response_model=Message)
def delete_deal(
    session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> Any:
    """Delete deal. Only BD Director, COO, CEO or superuser."""
    deal = session.get(Deal, id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    allowed_roles = {UserRole.BD_DIRECTOR, UserRole.COO, UserRole.CEO}
    if not current_user.is_superuser and current_user.role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    session.delete(deal)
    session.commit()
    return Message(message="Deal deleted successfully")


# ── Permission helpers ────────────────────────────────────────────────────────

def _check_read_permission(user: Any, deal: Deal) -> None:
    """BDM can only read their own deals."""
    if user.is_superuser:
        return
    if user.role == UserRole.BD_MANAGER and deal.bd_owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")


def _check_write_permission(user: Any, deal: Deal) -> None:
    """BDM can only edit their own deals. BDD+ can edit all."""
    if user.is_superuser:
        return
    write_all_roles = {UserRole.BD_DIRECTOR, UserRole.COO, UserRole.CEO, UserRole.IT_ADMIN}
    if user.role in write_all_roles:
        return
    if user.role == UserRole.BD_MANAGER and deal.bd_owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
