from fastapi import APIRouter

from app.api.routes import deals, documents, feasibility, items, login, masterdata, milestones, owners, private, projects, seed, tasks, users, utils
from app.core.config import settings

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(utils.router)
api_router.include_router(items.router)
api_router.include_router(deals.router)
api_router.include_router(owners.router)
api_router.include_router(tasks.router)
api_router.include_router(documents.router)
api_router.include_router(feasibility.router)
api_router.include_router(feasibility.assessment_router)
api_router.include_router(milestones.router)
api_router.include_router(masterdata.router)
api_router.include_router(projects.router)


# Seed router always registered — demo endpoints work in any env (superuser-gated),
# legacy clear/load endpoints inside have their own local-env guards.
api_router.include_router(seed.router)

if settings.ENVIRONMENT == "local":
    api_router.include_router(private.router)
