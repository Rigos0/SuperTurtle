from fastapi import APIRouter

from agnt_api.api.routes.executor_jobs import router as executor_jobs_router
from agnt_api.api.routes.jobs import router as jobs_router

api_router = APIRouter(prefix="/v1")
api_router.include_router(jobs_router)
api_router.include_router(executor_jobs_router)
