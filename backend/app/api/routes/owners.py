import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    CatchupStatus, Deal, Message, Owner, OwnerContact, OwnerContactCreate,
    OwnerContactPublic, OwnerCreate, OwnerInteraction, OwnerInteractionCreate,
    OwnerInteractionPublic, OwnerPublic, OwnersPublic, OwnerRelationship,
    OwnerType, OwnerUpdate,
)

router = APIRouter(prefix="/owners", tags=["owners"])


def _to_public(owner: Owner, session: SessionDep) -> OwnerPublic:
    deal_count = session.exec(
        select(func.count()).select_from(Deal).where(Deal.owner_name == owner.company)
    ).one()

    last_int = session.exec(
        select(OwnerInteraction)
        .where(OwnerInteraction.owner_id == owner.id)
        .order_by(col(OwnerInteraction.date).desc())
        .limit(1)
    ).first()

    return OwnerPublic(
        **owner.model_dump(),
        deal_count=deal_count,
        last_interaction=last_int.date if last_int else None,
    )


# ── GET /owners ───────────────────────────────────────────────────────────────

@router.get("/", response_model=OwnersPublic)
def list_owners(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = Query(default=100, le=500),
    search: str | None = None,
    owner_type: OwnerType | None = None,
    relationship: OwnerRelationship | None = None,
    catchup_status: CatchupStatus | None = None,
) -> Any:
    stmt = select(Owner)
    if search:
        q = f"%{search.lower()}%"
        stmt = stmt.where(
            col(Owner.company).ilike(q) | col(Owner.country).ilike(q)
        )
    if owner_type:
        stmt = stmt.where(Owner.owner_type == owner_type)
    if relationship:
        stmt = stmt.where(Owner.relationship == relationship)
    if catchup_status:
        stmt = stmt.where(Owner.catchup_status == catchup_status)

    count = session.exec(select(func.count()).select_from(stmt.subquery())).one()
    owners = session.exec(stmt.order_by(col(Owner.company)).offset(skip).limit(limit)).all()

    return OwnersPublic(
        data=[_to_public(o, session) for o in owners],
        count=count,
    )


# ── GET /owners/{id} ──────────────────────────────────────────────────────────

@router.get("/{id}", response_model=OwnerPublic)
def get_owner(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    owner = session.get(Owner, id)
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    return _to_public(owner, session)


# ── GET /owners/{id}/contacts ─────────────────────────────────────────────────

@router.get("/{id}/contacts", response_model=list[OwnerContactPublic])
def list_contacts(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    if not session.get(Owner, id):
        raise HTTPException(status_code=404, detail="Owner not found")
    return session.exec(
        select(OwnerContact).where(OwnerContact.owner_id == id)
    ).all()


# ── GET /owners/{id}/interactions ─────────────────────────────────────────────

@router.get("/{id}/interactions", response_model=list[OwnerInteractionPublic])
def list_interactions(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    if not session.get(Owner, id):
        raise HTTPException(status_code=404, detail="Owner not found")
    return session.exec(
        select(OwnerInteraction)
        .where(OwnerInteraction.owner_id == id)
        .order_by(col(OwnerInteraction.date).desc())
    ).all()


# ── POST /owners ──────────────────────────────────────────────────────────────

@router.post("/", response_model=OwnerPublic, status_code=201)
def create_owner(
    *, session: SessionDep, current_user: CurrentUser, owner_in: OwnerCreate
) -> Any:
    now = datetime.now(timezone.utc)
    owner = Owner.model_validate(owner_in, update={"created_at": now, "updated_at": now})
    session.add(owner)
    session.commit()
    session.refresh(owner)
    return _to_public(owner, session)


# ── PUT /owners/{id} ──────────────────────────────────────────────────────────

@router.put("/{id}", response_model=OwnerPublic)
def update_owner(
    *, session: SessionDep, current_user: CurrentUser, id: uuid.UUID, owner_in: OwnerUpdate
) -> Any:
    owner = session.get(Owner, id)
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    owner.sqlmodel_update(owner_in.model_dump(exclude_unset=True))
    owner.updated_at = datetime.now(timezone.utc)
    session.add(owner)
    session.commit()
    session.refresh(owner)
    return _to_public(owner, session)


# ── DELETE /owners/{id} ───────────────────────────────────────────────────────

@router.delete("/{id}", response_model=Message)
def delete_owner(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    owner = session.get(Owner, id)
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    session.delete(owner)
    session.commit()
    return Message(message="Owner deleted successfully")


# ── POST /owners/{id}/contacts ────────────────────────────────────────────────

@router.post("/{id}/contacts", response_model=OwnerContactPublic, status_code=201)
def add_contact(
    *, session: SessionDep, current_user: CurrentUser,
    id: uuid.UUID, contact_in: OwnerContactCreate
) -> Any:
    if not session.get(Owner, id):
        raise HTTPException(status_code=404, detail="Owner not found")
    contact = OwnerContact.model_validate(contact_in, update={"owner_id": id})
    session.add(contact)
    session.commit()
    session.refresh(contact)
    return contact


# ── DELETE /owners/contacts/{contact_id} ─────────────────────────────────────

@router.delete("/contacts/{contact_id}", response_model=Message)
def delete_contact(
    session: SessionDep, current_user: CurrentUser, contact_id: uuid.UUID
) -> Any:
    contact = session.get(OwnerContact, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    session.delete(contact)
    session.commit()
    return Message(message="Contact deleted")


# ── POST /owners/{id}/interactions ────────────────────────────────────────────

@router.post("/{id}/interactions", response_model=OwnerInteractionPublic, status_code=201)
def add_interaction(
    *, session: SessionDep, current_user: CurrentUser,
    id: uuid.UUID, int_in: OwnerInteractionCreate
) -> Any:
    if not session.get(Owner, id):
        raise HTTPException(status_code=404, detail="Owner not found")
    now = datetime.now(timezone.utc)
    interaction = OwnerInteraction.model_validate(
        int_in, update={"owner_id": id, "created_at": now}
    )
    session.add(interaction)
    # Update owner catchup status based on new interaction
    owner = session.get(Owner, id)
    if owner:
        owner.updated_at = now
        session.add(owner)
    session.commit()
    session.refresh(interaction)
    return interaction
