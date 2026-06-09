import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, File, HTTPException, Query, Request, UploadFile
from fastapi.responses import Response
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings
from app.models import (
    CatchupStatus, Deal, Message, Owner, OwnerContact, OwnerContactCreate,
    OwnerContactPublic, OwnerContactUpdate, OwnerCreate, OwnerInteraction, OwnerInteractionCreate,
    OwnerInteractionPublic, OwnerPublic, OwnersPublic, OwnerRelationship,
    OwnerType, OwnerUpdate, Project,
)
from app.storage import upload_file, read_file, delete_file

router = APIRouter(prefix="/owners", tags=["owners"])


def _to_public(owner: Owner, session: SessionDep) -> OwnerPublic:
    # Projects under this owner
    project_count = session.exec(
        select(func.count()).select_from(Project).where(Project.owner_id == owner.id)
    ).one()

    # Deals: prefer linked via project, fallback to owner_name match
    deal_count_by_project = session.exec(
        select(func.count()).select_from(Deal)
        .join(Project, Deal.project_id == Project.id)
        .where(Project.owner_id == owner.id)
    ).one()
    deal_count_legacy = session.exec(
        select(func.count()).select_from(Deal)
        .where(Deal.owner_name == owner.company)
        .where(Deal.project_id.is_(None))
    ).one()
    deal_count = (deal_count_by_project or 0) + (deal_count_legacy or 0)

    last_int = session.exec(
        select(OwnerInteraction)
        .where(OwnerInteraction.owner_id == owner.id)
        .order_by(col(OwnerInteraction.date).desc())
        .limit(1)
    ).first()

    return OwnerPublic(
        **owner.model_dump(),
        deal_count=deal_count,
        project_count=project_count,
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


# ── GET /owners/{id}/projects ─────────────────────────────────────────────────

@router.get("/{id}/projects")
def list_owner_projects(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    """List all projects linked to this owner."""
    if not session.get(Owner, id):
        raise HTTPException(status_code=404, detail="Owner not found")
    projects = session.exec(
        select(Project)
        .where(Project.owner_id == id)
        .order_by(col(Project.updated_at).desc())
    ).all()
    return projects


# ── GET /owners/{id}/deals ────────────────────────────────────────────────────

@router.get("/{id}/deals")
def list_owner_deals(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    """List all deals across all projects of this owner + legacy unlinked deals."""
    owner = session.get(Owner, id)
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    # Deals via projects
    by_project = session.exec(
        select(Deal)
        .join(Project, Deal.project_id == Project.id)
        .where(Project.owner_id == id)
    ).all()
    # Legacy deals (no project link, matched by owner_name)
    legacy = session.exec(
        select(Deal)
        .where(Deal.owner_name == owner.company)
        .where(Deal.project_id.is_(None))
    ).all()
    return list(by_project) + list(legacy)


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


# ── PATCH /owners/contacts/{contact_id} ──────────────────────────────────────

@router.patch("/contacts/{contact_id}", response_model=OwnerContactPublic)
def update_contact(
    *, session: SessionDep, current_user: CurrentUser,
    contact_id: uuid.UUID, contact_in: OwnerContactUpdate
) -> Any:
    contact = session.get(OwnerContact, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    data = contact_in.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(contact, k, v)
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


# ── DELETE /owners/interactions/{interaction_id} ─────────────────────────────

@router.delete("/interactions/{interaction_id}", response_model=Message)
def delete_interaction(
    session: SessionDep, current_user: CurrentUser, interaction_id: uuid.UUID
) -> Any:
    """Remove a mis-logged interaction. Interactions are not editable
    (append-only audit), but a wrong entry can be deleted."""
    interaction = session.get(OwnerInteraction, interaction_id)
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    session.delete(interaction)
    session.commit()
    return Message(message="Interaction deleted")


# ── Owner logo: upload + serve ───────────────────────────────────────────────

_LOGO_MAX = 3 * 1024 * 1024  # 3 MB
_LOGO_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"}


@router.post("/{id}/logo", response_model=OwnerPublic)
async def upload_owner_logo(
    *, session: SessionDep, current_user: CurrentUser,
    id: uuid.UUID, file: UploadFile = File(...)
) -> Any:
    owner = session.get(Owner, id)
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    if file.content_type not in _LOGO_TYPES:
        raise HTTPException(status_code=400, detail="Logo must be PNG, JPG, WEBP or SVG")
    content = await file.read()
    if len(content) > _LOGO_MAX:
        raise HTTPException(status_code=400, detail="Logo too large (max 3MB)")
    # Replace any previous logo
    if owner.logo_path:
        try:
            delete_file(owner.logo_path)
        except Exception:
            pass
    owner.logo_path = upload_file(content, file.filename or "logo", file.content_type or "image/png")
    owner.updated_at = datetime.now(timezone.utc)
    session.add(owner)
    session.commit()
    session.refresh(owner)
    return _to_public(owner, session)


@router.delete("/{id}/logo", response_model=Message)
def delete_owner_logo(
    session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> Any:
    owner = session.get(Owner, id)
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    if owner.logo_path:
        try:
            delete_file(owner.logo_path)
        except Exception:
            pass
        owner.logo_path = None
        session.add(owner)
        session.commit()
    return Message(message="Logo removed")


@router.get("/{id}/logo")
def serve_owner_logo(
    id: uuid.UUID, session: SessionDep, request: Request, token: str | None = None
) -> Any:
    """Stream an owner logo. Auth via header bearer OR ?token= (so <img src>
    works). Returns 404 if no logo set."""
    # validate token (header or query)
    import jwt
    from app.core import security
    from app.models import TokenPayload, User
    def _user(tok: str | None):
        if not tok:
            return None
        try:
            sub = TokenPayload(**jwt.decode(tok, settings.SECRET_KEY, algorithms=[security.ALGORITHM])).sub
        except Exception:
            return None
        return session.get(User, sub)
    auth = request.headers.get("Authorization", "")
    user = _user(auth[7:]) if auth.lower().startswith("bearer ") else None
    if user is None:
        user = _user(token)
    if user is None or not getattr(user, "is_active", False):
        raise HTTPException(status_code=403, detail="Could not validate credentials")

    owner = session.get(Owner, id)
    if not owner or not owner.logo_path:
        raise HTTPException(status_code=404, detail="No logo")
    try:
        content = read_file(owner.logo_path)
    except Exception:
        raise HTTPException(status_code=404, detail="Logo not found in storage")
    import mimetypes
    mime = mimetypes.guess_type(owner.logo_path)[0] or "image/png"
    return Response(content=content, media_type=mime,
                    headers={"Cache-Control": "private, max-age=300"})
