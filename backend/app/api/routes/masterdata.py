import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import col, select

from app.api.deps import CurrentUser, SessionDep
from app.models import MasterData, MasterDataCreate, MasterDataPublic, Message

router = APIRouter(prefix="/master-data", tags=["master-data"])


@router.get("/", response_model=list[MasterDataPublic])
def list_all(session: SessionDep, current_user: CurrentUser) -> Any:
    """Get all master data entries, sorted by category + sort_order."""
    return session.exec(
        select(MasterData)
        .order_by(col(MasterData.category), col(MasterData.sort_order))
    ).all()


@router.get("/{category}", response_model=list[MasterDataPublic])
def list_by_category(
    session: SessionDep, current_user: CurrentUser, category: str,
    active_only: bool = True,
) -> Any:
    """Get master data for a specific category."""
    stmt = select(MasterData).where(MasterData.category == category)
    if active_only:
        stmt = stmt.where(MasterData.is_active == True)
    return session.exec(stmt.order_by(col(MasterData.sort_order))).all()


@router.post("/", response_model=MasterDataPublic, status_code=201)
def create_entry(
    *, session: SessionDep, current_user: CurrentUser, entry: MasterDataCreate
) -> Any:
    """Add a new master data value."""
    md = MasterData.model_validate(entry)
    session.add(md)
    session.commit()
    session.refresh(md)
    return md


@router.put("/{id}", response_model=MasterDataPublic)
def update_entry(
    *, session: SessionDep, current_user: CurrentUser,
    id: uuid.UUID, value: str | None = None, sort_order: int | None = None,
    is_active: bool | None = None,
) -> Any:
    """Update a master data entry (value, sort_order, or active status)."""
    md = session.get(MasterData, id)
    if not md:
        raise HTTPException(status_code=404, detail="Entry not found")
    if value is not None:
        md.value = value
    if sort_order is not None:
        md.sort_order = sort_order
    if is_active is not None:
        md.is_active = is_active
    session.add(md)
    session.commit()
    session.refresh(md)
    return md


@router.delete("/{id}", response_model=Message)
def delete_entry(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    """Delete a master data entry."""
    md = session.get(MasterData, id)
    if not md:
        raise HTTPException(status_code=404, detail="Entry not found")
    session.delete(md)
    session.commit()
    return Message(message="Entry deleted")
