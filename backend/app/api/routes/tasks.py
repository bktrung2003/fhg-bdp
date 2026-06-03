import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Query
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Activity, ActivityCreate, ActivityPublic, ActivitiesPublic,
    Message, Task, TaskCreate, TaskPublic, TasksPublic, TaskStatus, TaskUpdate,
)

router = APIRouter(tags=["tasks"])

TODAY = datetime.now(timezone.utc).date().isoformat()


def _task_public(t: Task) -> TaskPublic:
    overdue = (
        t.status not in (TaskStatus.DONE,)
        and t.due_date is not None
        and t.due_date < TODAY
    )
    return TaskPublic(**t.model_dump(), is_overdue=overdue)


# ── TASKS ─────────────────────────────────────────────────────────────────────

task_router = APIRouter(prefix="/tasks")


@task_router.get("/", response_model=TasksPublic)
def list_tasks(
    session: SessionDep, current_user: CurrentUser,
    skip: int = 0, limit: int = Query(default=100, le=500),
    search: str | None = None,
    status: TaskStatus | None = None,
    deal_id: uuid.UUID | None = None,
    overdue_only: bool = False,
) -> Any:
    stmt = select(Task)
    if search:
        stmt = stmt.where(col(Task.title).ilike(f"%{search}%"))
    if status:
        stmt = stmt.where(Task.status == status)
    if deal_id:
        stmt = stmt.where(Task.deal_id == deal_id)
    if overdue_only:
        stmt = stmt.where(Task.status != TaskStatus.DONE).where(Task.due_date < TODAY)

    count = session.exec(select(func.count()).select_from(stmt.subquery())).one()
    tasks = session.exec(
        stmt.order_by(col(Task.due_date).asc().nullslast()).offset(skip).limit(limit)
    ).all()
    return TasksPublic(data=[_task_public(t) for t in tasks], count=count)


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
    return _task_public(task)


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
    return _task_public(task)


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

activity_router = APIRouter(prefix="/activities")


@activity_router.get("/", response_model=ActivitiesPublic)
def list_activities(
    session: SessionDep, current_user: CurrentUser,
    skip: int = 0, limit: int = Query(default=50, le=200),
    deal_id: uuid.UUID | None = None,
) -> Any:
    stmt = select(Activity)
    if deal_id:
        stmt = stmt.where(Activity.deal_id == deal_id)
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
