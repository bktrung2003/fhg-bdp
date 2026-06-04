import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Message, Milestone, MilestoneCreate, MilestoneDept,
    MilestoneGate, MilestonePublic, MilestonesPublic, MilestoneUpdate,
)

router = APIRouter(prefix="/milestones", tags=["milestones"])


@router.get("/", response_model=MilestonesPublic)
def list_milestones(
    session: SessionDep, current_user: CurrentUser,
    skip: int = 0, limit: int = Query(default=200, le=500),
    search: str | None = None,
    project_id: uuid.UUID | None = None,
    deal_id: uuid.UUID | None = None,
    department: MilestoneDept | None = None,
    status: MilestoneGate | None = None,
) -> Any:
    stmt = select(Milestone)
    if search:
        stmt = stmt.where(col(Milestone.name).ilike(f"%{search}%"))
    if project_id:
        stmt = stmt.where(Milestone.project_id == project_id)
    if deal_id:
        stmt = stmt.where(Milestone.deal_id == deal_id)
    if department:
        stmt = stmt.where(Milestone.department == department)
    if status:
        stmt = stmt.where(Milestone.status == status)

    count = session.exec(select(func.count()).select_from(stmt.subquery())).one()
    items = session.exec(
        stmt.order_by(col(Milestone.due_date).asc().nullslast()).offset(skip).limit(limit)
    ).all()
    return MilestonesPublic(data=list(items), count=count)


@router.post("/", response_model=MilestonePublic, status_code=201)
def create_milestone(
    *, session: SessionDep, current_user: CurrentUser, ms_in: MilestoneCreate
) -> Any:
    now = datetime.now(timezone.utc)
    ms = Milestone.model_validate(ms_in, update={
        "created_by_id": current_user.id, "created_at": now, "updated_at": now,
    })
    session.add(ms)
    session.commit()
    session.refresh(ms)
    return ms


@router.put("/{id}", response_model=MilestonePublic)
def update_milestone(
    *, session: SessionDep, current_user: CurrentUser,
    id: uuid.UUID, ms_in: MilestoneUpdate,
) -> Any:
    ms = session.get(Milestone, id)
    if not ms:
        raise HTTPException(status_code=404, detail="Milestone not found")
    ms.sqlmodel_update(ms_in.model_dump(exclude_unset=True))
    ms.updated_at = datetime.now(timezone.utc)
    session.add(ms)
    session.commit()
    session.refresh(ms)
    return ms


@router.delete("/{id}", response_model=Message)
def delete_milestone(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    ms = session.get(Milestone, id)
    if not ms:
        raise HTTPException(status_code=404, detail="Milestone not found")
    session.delete(ms)
    session.commit()
    return Message(message="Milestone deleted")
