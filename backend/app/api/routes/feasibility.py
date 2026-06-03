import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import col, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    FeasibilitySnapshot, FeasibilitySnapshotCreate,
    FeasibilitySnapshotPublic, Message,
)

router = APIRouter(prefix="/feasibility", tags=["feasibility"])


@router.get("/snapshots", response_model=list[FeasibilitySnapshotPublic])
def list_snapshots(
    session: SessionDep, current_user: CurrentUser,
    deal_id: uuid.UUID | None = None,
    limit: int = Query(default=50, le=200),
) -> Any:
    stmt = select(FeasibilitySnapshot)
    if deal_id:
        stmt = stmt.where(FeasibilitySnapshot.deal_id == deal_id)
    stmt = stmt.order_by(col(FeasibilitySnapshot.created_at).desc()).limit(limit)
    return session.exec(stmt).all()


@router.post("/snapshots", response_model=FeasibilitySnapshotPublic, status_code=201)
def save_snapshot(
    *, session: SessionDep, current_user: CurrentUser,
    snap_in: FeasibilitySnapshotCreate,
) -> Any:
    snap = FeasibilitySnapshot.model_validate(
        snap_in,
        update={"created_by_id": current_user.id, "created_at": datetime.now(timezone.utc)},
    )
    session.add(snap)
    session.commit()
    session.refresh(snap)
    return snap


@router.delete("/snapshots/{id}", response_model=Message)
def delete_snapshot(
    session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> Any:
    snap = session.get(FeasibilitySnapshot, id)
    if not snap:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    session.delete(snap)
    session.commit()
    return Message(message="Snapshot deleted")
