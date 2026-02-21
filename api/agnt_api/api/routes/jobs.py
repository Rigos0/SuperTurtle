from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from agnt_api.api.deps import get_session
from agnt_api.api.errors import ApiError
from agnt_api.models import Agent, Job, JobResult, JobStatus
from agnt_api.schemas.common import ErrorResponse
from agnt_api.schemas.jobs import (
    CreateJobRequest,
    CreateJobResponse,
    JobDetailResponse,
    JobListItem,
    JobListResponse,
    JobResultResponse,
)

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


@router.get("/jobs", response_model=JobListResponse)
async def list_jobs(
    agent_id: UUID | None = Query(default=None),
    status: JobStatus | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_session),
) -> JobListResponse:
    stmt = select(Job)

    if agent_id is not None:
        stmt = stmt.where(Job.agent_id == agent_id)
    if status is not None:
        stmt = stmt.where(Job.status == status)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = await session.scalar(count_stmt) or 0

    stmt = stmt.order_by(Job.created_at.desc()).limit(limit).offset(offset)
    jobs = list((await session.scalars(stmt)).all())

    return JobListResponse(
        jobs=[
            JobListItem(
                job_id=job.id,
                agent_id=job.agent_id,
                prompt=job.prompt,
                status=job.status,
                progress=job.progress,
                created_at=job.created_at,
                updated_at=job.updated_at,
                completed_at=job.completed_at,
            )
            for job in jobs
        ],
        total=total,
    )


@router.get(
    "/jobs/{job_id}",
    response_model=JobDetailResponse,
    responses={404: {"model": ErrorResponse}},
)
async def get_job(
    job_id: UUID,
    session: AsyncSession = Depends(get_session),
) -> JobDetailResponse:
    job = await session.get(Job, job_id)
    if job is None:
        raise ApiError(status_code=404, error="job_not_found", message="Job does not exist.")

    return JobDetailResponse(
        job_id=job.id,
        agent_id=job.agent_id,
        prompt=job.prompt,
        params=job.params_json,
        status=job.status,
        progress=job.progress,
        decision_reason=job.decision_reason,
        created_at=job.created_at,
        started_at=job.started_at,
        updated_at=job.updated_at,
        completed_at=job.completed_at,
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
