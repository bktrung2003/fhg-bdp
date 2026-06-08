import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request, UploadFile, File, Form
from fastapi.responses import Response
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Deal, Document, DocumentPublic, DocumentsPublic,
    DocPermission, DocType, Message, Project, UserRole,
)
from app.core.config import settings
from app.storage import delete_file, read_file, upload_file, LOCAL_UPLOAD_DIR

router = APIRouter(prefix="/documents", tags=["documents"])

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB

SENIOR_ROLES = {UserRole.CEO, UserRole.COO, UserRole.BD_DIRECTOR, UserRole.IT_ADMIN}


def _can_view(doc: Document, user: Any) -> bool:
    """Check if user can view a confidential document."""
    if not doc.is_confidential:
        return True
    if user.is_superuser:
        return True
    if user.role in SENIOR_ROLES:
        return True
    if doc.uploaded_by_id == user.id:
        return True
    return False


def _to_public(doc: Document, user: Any) -> DocumentPublic:
    can = _can_view(doc, user)
    # Always stream through the backend (same-origin /api path). Works for both
    # local + MinIO storage, avoids exposing MinIO publicly, and plays nicely
    # behind an HTTPS reverse proxy (no mixed-content / internal-IP issues).
    url = f"{settings.API_V1_STR}/documents/serve/{doc.id}" if can else None
    return DocumentPublic(**doc.model_dump(), download_url=url, can_view=can)


# ── GET /documents ────────────────────────────────────────────────────────────

@router.get("/", response_model=DocumentsPublic)
def list_documents(
    session: SessionDep, current_user: CurrentUser,
    skip: int = 0, limit: int = Query(default=100, le=500),
    search: str | None = None,
    deal_id: uuid.UUID | None = None,
    project_id: uuid.UUID | None = None,
    doc_type: DocType | None = None,
    permission: DocPermission | None = None,
) -> Any:
    stmt = select(Document)
    if search:
        stmt = stmt.where(col(Document.name).ilike(f"%{search}%"))
    if deal_id:
        stmt = stmt.where(Document.deal_id == deal_id)
    if project_id:
        stmt = stmt.where(Document.project_id == project_id)
    if doc_type:
        stmt = stmt.where(Document.doc_type == doc_type)
    if permission:
        stmt = stmt.where(Document.permission == permission)

    count = session.exec(select(func.count()).select_from(stmt.subquery())).one()
    docs = session.exec(
        stmt.order_by(col(Document.uploaded_at).desc()).offset(skip).limit(limit)
    ).all()
    return DocumentsPublic(data=[_to_public(d, current_user) for d in docs], count=count)


# ── POST /documents/upload ────────────────────────────────────────────────────

@router.post("/upload", response_model=DocumentPublic, status_code=201)
async def upload_document(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    file: UploadFile = File(...),
    name: str = Form(...),
    doc_type: str = Form(default="Other"),
    permission: str = Form(default="Internal Only"),
    deal_id: str = Form(default=""),
    deal_name: str = Form(default=""),
    project_id: str = Form(default=""),
    project_name: str = Form(default=""),
    version: str = Form(default="v1.0"),
    note: str = Form(default=""),
    is_confidential: bool = Form(default=False),
) -> Any:
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 50 MB)")

    storage_path = upload_file(content, file.filename or "file", file.content_type or "application/octet-stream")

    deal_uuid = uuid.UUID(deal_id) if deal_id else None
    project_uuid = uuid.UUID(project_id) if project_id else None
    final_project_name = project_name or None

    # Auto-resolve project from deal if deal linked but project not specified
    if deal_uuid and not project_uuid:
        deal = session.get(Deal, deal_uuid)
        if deal and deal.project_id:
            project_uuid = deal.project_id
            project = session.get(Project, deal.project_id)
            if project:
                final_project_name = project.name

    from datetime import datetime, timezone
    doc = Document(
        name=name,
        doc_type=doc_type,
        permission=permission,
        deal_id=deal_uuid,
        deal_name=deal_name or None,
        project_id=project_uuid,
        project_name=final_project_name,
        version=version or "v1.0",
        note=note or None,
        original_filename=file.filename or "file",
        file_size=len(content),
        content_type=file.content_type or "application/octet-stream",
        storage_path=storage_path,
        uploaded_by_id=current_user.id,
        uploaded_at=datetime.now(timezone.utc),
        is_confidential=is_confidential,
    )
    session.add(doc)
    session.commit()
    session.refresh(doc)
    return _to_public(doc, current_user)


# ── GET /documents/serve/{id} — stream file (local + MinIO) ──────────────────

def _user_from_token(session: SessionDep, token: str) -> Any:
    """Resolve a user from a raw JWT string (for query-param auth on direct
    file links — mobile browsers can't attach an Authorization header when
    opening a URL in a new tab)."""
    import jwt
    from app.core import security
    from app.models import TokenPayload, User
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[security.ALGORITHM])
        sub = TokenPayload(**payload).sub
    except Exception:
        return None
    return session.get(User, sub)


@router.get("/serve/{id}")
def serve_file(
    id: uuid.UUID,
    session: SessionDep,
    request: Request,
    token: str | None = None,
) -> Any:
    """Stream a document's bytes through the backend (same-origin).
    Auth accepted via Authorization header OR ?token= query param so that
    a plain link (window.open) works on mobile / iOS PWA. Handles local +
    MinIO storage and enforces confidential access. Inline disposition so
    PDFs/images preview in the browser."""
    # Resolve the user from header bearer or query token.
    user = None
    auth = request.headers.get("Authorization", "")
    if auth.lower().startswith("bearer "):
        user = _user_from_token(session, auth[7:])
    if user is None and token:
        user = _user_from_token(session, token)
    if user is None or not getattr(user, "is_active", False):
        raise HTTPException(status_code=403, detail="Could not validate credentials")

    doc = session.get(Document, id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.is_confidential and not _can_view(doc, user):
        raise HTTPException(status_code=403, detail="Access denied — confidential document")

    try:
        content = read_file(doc.storage_path)
    except Exception:
        raise HTTPException(status_code=404, detail="File not found in storage")

    mime = doc.content_type or "application/octet-stream"
    return Response(
        content=content,
        media_type=mime,
        headers={"Content-Disposition": f'inline; filename="{doc.original_filename}"'},
    )


# ── PATCH /documents/{id}/confidential — toggle confidential ─────────────────

@router.patch("/{id}/confidential", response_model=DocumentPublic)
def toggle_confidential(
    session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> Any:
    """Toggle confidential flag. Only uploader or senior roles."""
    doc = session.get(Document, id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not current_user.is_superuser and current_user.role not in SENIOR_ROLES and doc.uploaded_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    doc.is_confidential = not doc.is_confidential
    session.add(doc)
    session.commit()
    session.refresh(doc)
    return _to_public(doc, current_user)


# ── DELETE /documents/{id} ────────────────────────────────────────────────────

@router.delete("/{id}", response_model=Message)
def delete_document(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    doc = session.get(Document, id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    try:
        delete_file(doc.storage_path)
    except Exception:
        pass  # File might already be gone, still remove DB record
    session.delete(doc)
    session.commit()
    return Message(message="Document deleted")
