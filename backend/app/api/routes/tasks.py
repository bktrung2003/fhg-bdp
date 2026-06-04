import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Query
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Activity, ActivityCreate, ActivityPublic, ActivitiesPublic,
    Message, Task, TaskCreate, TaskPublic, TasksPublic, TaskStatus, TaskUpdate,
    User,
)

router = APIRouter()

TODAY = datetime.now(timezone.utc).date().isoformat()


def _task_public(t: Task, session: SessionDep | None = None) -> TaskPublic:
    overdue = (
        t.status not in (TaskStatus.DONE,)
        and t.due_date is not None
        and t.due_date < TODAY
    )
    owner_name = None
    owner_role = None
    if t.task_owner_id and session is not None:
        u = session.get(User, t.task_owner_id)
        if u:
            owner_name = u.full_name or u.email
            owner_role = u.role
    return TaskPublic(
        **t.model_dump(),
        is_overdue=overdue,
        task_owner_name=owner_name,
        task_owner_role=owner_role,
    )


# ── TASKS ─────────────────────────────────────────────────────────────────────

task_router = APIRouter(prefix="/tasks", tags=["tasks"])


@task_router.get("/", response_model=TasksPublic)
def list_tasks(
    session: SessionDep, current_user: CurrentUser,
    skip: int = 0, limit: int = Query(default=100, le=500),
    search: str | None = None,
    status: TaskStatus | None = None,
    deal_id: uuid.UUID | None = None,
    task_owner_id: uuid.UUID | None = None,
    overdue_only: bool = False,
    due_from: str | None = None,
    due_to: str | None = None,
    hide_archived: bool = True,   # hide Done tasks older than 30 days
) -> Any:
    stmt = select(Task)
    if search:
        stmt = stmt.where(col(Task.title).ilike(f"%{search}%"))
    if status:
        stmt = stmt.where(Task.status == status)
    if deal_id:
        stmt = stmt.where(Task.deal_id == deal_id)
    if task_owner_id:
        stmt = stmt.where(Task.task_owner_id == task_owner_id)
    if overdue_only:
        stmt = stmt.where(Task.status != TaskStatus.DONE).where(Task.due_date < TODAY)
    if due_from:
        stmt = stmt.where(Task.due_date >= due_from)
    if due_to:
        stmt = stmt.where(Task.due_date <= due_to)
    if hide_archived:
        # Hide Done tasks older than 30 days
        from datetime import timedelta
        threshold = (datetime.now(timezone.utc).date() - timedelta(days=30)).isoformat()
        # Keep: not Done, or (Done AND due_date >= threshold)
        stmt = stmt.where(
            (Task.status != TaskStatus.DONE) |
            (Task.due_date.is_(None)) |
            (Task.due_date >= threshold)
        )

    count = session.exec(select(func.count()).select_from(stmt.subquery())).one()
    tasks = session.exec(
        stmt.order_by(col(Task.due_date).asc().nullslast()).offset(skip).limit(limit)
    ).all()
    return TasksPublic(data=[_task_public(t, session) for t in tasks], count=count)


# ── Bulk operations ──────────────────────────────────────────────────────────

from pydantic import BaseModel

class BulkTaskUpdate(BaseModel):
    task_ids: list[uuid.UUID]
    status: TaskStatus | None = None
    task_owner_id: uuid.UUID | None = None


@task_router.post("/bulk-update", response_model=Message)
def bulk_update_tasks(
    *, session: SessionDep, current_user: CurrentUser, body: BulkTaskUpdate,
) -> Any:
    """Update multiple tasks at once — status and/or task_owner_id."""
    if not body.task_ids:
        return Message(message="No tasks selected.")
    updates: dict[str, Any] = {}
    if body.status is not None:
        updates["status"] = body.status
    if body.task_owner_id is not None:
        updates["task_owner_id"] = body.task_owner_id
    if not updates:
        return Message(message="No fields to update.")

    count = 0
    now = datetime.now(timezone.utc)
    for tid in body.task_ids:
        t = session.get(Task, tid)
        if not t:
            continue
        for k, v in updates.items():
            setattr(t, k, v)
        t.updated_at = now
        session.add(t)
        count += 1
    session.commit()
    return Message(message=f"Updated {count} task(s).")


class BulkTaskDelete(BaseModel):
    task_ids: list[uuid.UUID]


@task_router.post("/bulk-delete", response_model=Message)
def bulk_delete_tasks(
    *, session: SessionDep, current_user: CurrentUser, body: BulkTaskDelete,
) -> Any:
    """Delete multiple tasks at once."""
    count = 0
    for tid in body.task_ids:
        t = session.get(Task, tid)
        if t:
            session.delete(t)
            count += 1
    session.commit()
    return Message(message=f"Deleted {count} task(s).")


@task_router.post("/", response_model=TaskPublic, status_code=201)
def create_task(*, session: SessionDep, current_user: CurrentUser, task_in: TaskCreate) -> Any:
    now = datetime.now(timezone.utc)
    task = Task.model_validate(task_in, update={
        "created_by_id": current_user.id,
        "created_at": now, "updated_at": now,
    })
    session.add(task)
    session.commit()
    session.refresh(task)
    return _task_public(task, session)


@task_router.put("/{id}", response_model=TaskPublic)
def update_task(
    *, session: SessionDep, current_user: CurrentUser,
    id: uuid.UUID, task_in: TaskUpdate,
) -> Any:
    from fastapi import HTTPException
    task = session.get(Task, id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.sqlmodel_update(task_in.model_dump(exclude_unset=True))
    task.updated_at = datetime.now(timezone.utc)
    session.add(task)
    session.commit()
    session.refresh(task)
    return _task_public(task, session)


@task_router.delete("/{id}", response_model=Message)
def delete_task(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    from fastapi import HTTPException
    task = session.get(Task, id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    session.delete(task)
    session.commit()
    return Message(message="Task deleted")


# ── ACTIVITIES ────────────────────────────────────────────────────────────────

activity_router = APIRouter(prefix="/activities", tags=["activities"])


@activity_router.get("/", response_model=ActivitiesPublic)
def list_activities(
    session: SessionDep, current_user: CurrentUser,
    skip: int = 0, limit: int = Query(default=50, le=500),
    deal_id: uuid.UUID | None = None,
    date_from: str | None = None,   # "2026-05-01"
    date_to: str | None = None,     # "2026-06-04"
    search: str | None = None,
) -> Any:
    stmt = select(Activity)
    if deal_id:
        stmt = stmt.where(Activity.deal_id == deal_id)
    if date_from:
        stmt = stmt.where(Activity.date >= date_from)
    if date_to:
        stmt = stmt.where(Activity.date <= date_to)
    if search:
        q = f"%{search.lower()}%"
        stmt = stmt.where(
            col(Activity.note).ilike(q) | col(Activity.deal_name).ilike(q)
        )
    count = session.exec(select(func.count()).select_from(stmt.subquery())).one()
    acts = session.exec(stmt.order_by(col(Activity.date).desc()).offset(skip).limit(limit)).all()
    return ActivitiesPublic(data=list(acts), count=count)


@activity_router.post("/", response_model=ActivityPublic, status_code=201)
def create_activity(
    *, session: SessionDep, current_user: CurrentUser, act_in: ActivityCreate
) -> Any:
    now = datetime.now(timezone.utc)
    act = Activity.model_validate(act_in, update={"created_by_id": current_user.id, "created_at": now})
    session.add(act)
    session.commit()
    session.refresh(act)
    return act


@activity_router.delete("/{id}", response_model=Message)
def delete_activity(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    from fastapi import HTTPException
    act = session.get(Activity, id)
    if not act:
        raise HTTPException(status_code=404, detail="Activity not found")
    session.delete(act)
    session.commit()
    return Message(message="Activity deleted")


# ── Register both under /tasks router ─────────────────────────────────────────
router.include_router(task_router)
router.include_router(activity_router)
