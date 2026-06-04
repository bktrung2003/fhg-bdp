import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Deal, Message, Milestone, Owner, Project, ProjectCreate, ProjectPublic,
    ProjectsPublic, ProjectStatus, ProjectUpdate,
)

router = APIRouter(prefix="/projects", tags=["projects"])


def _next_project_number(session: SessionDep) -> int:
    result = session.exec(select(func.max(Project.project_number))).one()
    return (result or 0) + 1


def _to_public(project: Project, session: SessionDep) -> ProjectPublic:
    # Owner name
    owner_name = None
    if project.owner_id:
        owner = session.get(Owner, project.owner_id)
        if owner:
            owner_name = owner.company

    # Deal count + active pipeline value
    deals = session.exec(
        select(Deal).where(Deal.project_id == project.id)
    ).all()
    deal_count = len(deals)
    active_value = sum(
        d.pipeline_value or 0 for d in deals
        if d.stage not in ("Lost", "Opened")
    )

    return ProjectPublic(
        **project.model_dump(),
        owner_name=owner_name,
        deal_count=deal_count,
        active_pipeline_value=active_value,
    )


# ── GET /projects ─────────────────────────────────────────────────────────────

@router.get("/", response_model=ProjectsPublic)
def list_projects(
    session: SessionDep, current_user: CurrentUser,
    skip: int = 0, limit: int = Query(default=200, le=500),
    search: str | None = None,
    owner_id: uuid.UUID | None = None,
    country: str | None = None,
    status: ProjectStatus | None = None,
) -> Any:
    stmt = select(Project)
    if search:
        q = f"%{search.lower()}%"
        stmt = stmt.where(col(Project.name).ilike(q) | col(Project.city).ilike(q))
    if owner_id:
        stmt = stmt.where(Project.owner_id == owner_id)
    if country:
        stmt = stmt.where(Project.country == country)
    if status:
        stmt = stmt.where(Project.status == status)

    count = session.exec(select(func.count()).select_from(stmt.subquery())).one()
    projects = session.exec(
        stmt.order_by(col(Project.updated_at).desc()).offset(skip).limit(limit)
    ).all()

    return ProjectsPublic(
        data=[_to_public(p, session) for p in projects],
        count=count,
    )


# ── GET /projects/{id} ────────────────────────────────────────────────────────

@router.get("/{id}", response_model=ProjectPublic)
def get_project(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    p = session.get(Project, id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return _to_public(p, session)


# ── POST /projects ────────────────────────────────────────────────────────────

@router.post("/", response_model=ProjectPublic, status_code=201)
def create_project(
    *, session: SessionDep, current_user: CurrentUser, project_in: ProjectCreate
) -> Any:
    now = datetime.now(timezone.utc)
    p = Project.model_validate(project_in, update={
        "created_by_id": current_user.id,
        "project_number": _next_project_number(session),
        "created_at": now, "updated_at": now,
    })
    session.add(p)
    session.commit()
    session.refresh(p)
    return _to_public(p, session)


# ── PUT /projects/{id} ────────────────────────────────────────────────────────

@router.put("/{id}", response_model=ProjectPublic)
def update_project(
    *, session: SessionDep, current_user: CurrentUser,
    id: uuid.UUID, project_in: ProjectUpdate,
) -> Any:
    p = session.get(Project, id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    p.sqlmodel_update(project_in.model_dump(exclude_unset=True))
    p.updated_at = datetime.now(timezone.utc)
    session.add(p)
    session.commit()
    session.refresh(p)
    return _to_public(p, session)


# ── DELETE /projects/{id} ─────────────────────────────────────────────────────

@router.delete("/{id}", response_model=Message)
def delete_project(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    p = session.get(Project, id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    # Check if there are linked deals
    deal_count = session.exec(
        select(func.count()).select_from(Deal).where(Deal.project_id == id)
    ).one()
    if deal_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete: project has {deal_count} linked deal(s). Delete the deals first."
        )
    session.delete(p)
    session.commit()
    return Message(message="Project deleted")


# ── GET /projects/{id}/deals ──────────────────────────────────────────────────

@router.get("/{id}/deals")
def list_project_deals(
    session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> Any:
    if not session.get(Project, id):
        raise HTTPException(status_code=404, detail="Project not found")
    deals = session.exec(
        select(Deal).where(Deal.project_id == id).order_by(col(Deal.updated_at).desc())
    ).all()
    return deals


# ── GET /projects/{id}/milestones ─────────────────────────────────────────────

@router.get("/{id}/milestones")
def list_project_milestones(
    session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> Any:
    """Pre-opening milestones for this project (asset-level governance)."""
    if not session.get(Project, id):
        raise HTTPException(status_code=404, detail="Project not found")
    milestones = session.exec(
        select(Milestone)
        .where(Milestone.project_id == id)
        .order_by(col(Milestone.due_date).asc().nullslast())
    ).all()
    return milestones
