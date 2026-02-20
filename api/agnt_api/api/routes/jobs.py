from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from agnt_api.api.deps import get_session
from agnt_api.api.errors import ApiError
from agnt_api.models import Agent, Job, JobResult, JobStatus
from agnt_api.schemas.common import ErrorResponse
from agnt_api.schemas.jobs import CreateJobRequest, CreateJobResponse, JobResultResponse

router = APIRouter(tags=["jobs"])


@router.post(
    "/jobs",
    response_model=CreateJobResponse,
    responses={404: {"model": ErrorResponse}},
)
async def create_job(
    payload: CreateJobRequest,
    session: AsyncSession = Depends(get_session),
) -> CreateJobResponse:
    agent = await session.get(Agent, payload.agent_id)
    if agent is None:
        raise ApiError(status_code=404, error="agent_not_found", message="Agent does not exist.")

    job = Job(
        agent_id=payload.agent_id,
        prompt=payload.prompt,
        params_json=payload.params,
        status=JobStatus.PENDING,
        progress=0,
    )
    session.add(job)
    await session.commit()
    await session.refresh(job)

    return CreateJobResponse(
        job_id=job.id,
        agent_id=job.agent_id,
        status=job.status,
        created_at=job.created_at,
    )


@router.get(
    "/jobs/{job_id}/result",
    response_model=JobResultResponse,
    responses={404: {"model": ErrorResponse}, 409: {"model": ErrorResponse}},
)
async def get_job_result(
    job_id: UUID,
    session: AsyncSession = Depends(get_session),
) -> JobResultResponse:
    job = await session.get(Job, job_id)
    if job is None:
        raise ApiError(status_code=404, error="job_not_found", message="Job does not exist.")
    if job.status != JobStatus.COMPLETED:
        raise ApiError(
            status_code=409,
            error="job_not_completed",
            message="Job is not completed yet.",
        )

    result = await session.scalar(select(JobResult).where(JobResult.job_id == job_id))
    if result is None:
        raise ApiError(status_code=404, error="job_result_not_found", message="Job result does not exist.")

    return JobResultResponse(job_id=job.id, status=job.status, files=result.files_json)
