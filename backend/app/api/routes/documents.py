import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import FileResponse, Response
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Document, DocumentPublic, DocumentsPublic,
    DocPermission, DocType, Message, UserRole,
)
from app.storage import delete_file, get_download_url, upload_file, LOCAL_UPLOAD_DIR

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
    url = get_download_url(doc.storage_path, doc.original_filename) if can else None
    return DocumentPublic(**doc.model_dump(), download_url=url, can_view=can)


# ── GET /documents ────────────────────────────────────────────────────────────

@router.get("/", response_model=DocumentsPublic)
def list_documents(
    session: SessionDep, current_user: CurrentUser,
    skip: int = 0, limit: int = Query(default=100, le=500),
    search: str | None = None,
    deal_id: uuid.UUID | None = None,
    doc_type: DocType | None = None,
    permission: DocPermission | None = None,
) -> Any:
    stmt = select(Document)
    if search:
        stmt = stmt.where(col(Document.name).ilike(f"%{search}%"))
    if deal_id:
        stmt = stmt.where(Document.deal_id == deal_id)
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
    version: str = Form(default="v1.0"),
    note: str = Form(default=""),
    is_confidential: bool = Form(default=False),
) -> Any:
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 50 MB)")

    storage_path = upload_file(content, file.filename or "file", file.content_type or "application/octet-stream")

    from datetime import datetime, timezone
    doc = Document(
        name=name,
        doc_type=doc_type,
        permission=permission,
        deal_id=uuid.UUID(deal_id) if deal_id else None,
        deal_name=deal_name or None,
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


# ── GET /documents/serve/{key} — local file serving ──────────────────────────

@router.get("/serve/{key}")
def serve_local_file(key: str, session: SessionDep, current_user: CurrentUser) -> Any:
    """Serve locally stored files. Checks confidential access."""
    # Find document by storage_path
    from sqlmodel import select as sel
    doc = session.exec(
        sel(Document).where(Document.storage_path == f"local://{key}")
    ).first()

    if doc and doc.is_confidential and not _can_view(doc, current_user):
        raise HTTPException(status_code=403, detail="Access denied — confidential document")

    p = LOCAL_UPLOAD_DIR / key
    if not p.exists():
        raise HTTPException(status_code=404, detail="File not found")

    # Read and return as bytes so browser can display inline
    content = p.read_bytes()
    import mimetypes
    mime = mimetypes.guess_type(str(p))[0] or "application/octet-stream"
    return Response(
        content=content,
        media_type=mime,
        headers={"Content-Disposition": f'inline; filename="{key.split("_", 1)[-1]}"'},
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
