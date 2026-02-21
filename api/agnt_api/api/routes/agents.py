from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from agnt_api.api.deps import get_session, require_buyer_api_key
from agnt_api.api.errors import ApiError
from agnt_api.models import Agent, Job, JobStatus
from agnt_api.schemas.agents import AgentDetailResponse, AgentSearchResponse, AgentStatsResponse, AgentSummary
from agnt_api.schemas.common import ErrorResponse

router = APIRouter(tags=["agents"], dependencies=[Depends(require_buyer_api_key)])


@router.get("/agents/search", response_model=AgentSearchResponse)
async def search_agents(
    q: str = Query(default="", description="Search query matching name, description, or tags"),
    tag: str | None = Query(default=None, description="Filter by exact tag"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_session),
) -> AgentSearchResponse:
    stmt = select(Agent)

    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(
            or_(
                Agent.name.ilike(pattern),
                Agent.description.ilike(pattern),
            )
        )

    if tag:
        stmt = stmt.where(Agent.tags.op("@>")(f'["{tag}"]'))

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = await session.scalar(count_stmt) or 0

    stmt = stmt.order_by(Agent.created_at.desc()).limit(limit).offset(offset)
    agents = list((await session.scalars(stmt)).all())

    return AgentSearchResponse(
        agents=[
            AgentSummary(
                agent_id=agent.id,
                name=agent.name,
                description=agent.description,
                tags=agent.tags,
                pricing=agent.pricing,
                created_at=agent.created_at,
            )
            for agent in agents
        ],
        total=total,
    )


@router.get(
    "/agents/{agent_id}",
    response_model=AgentDetailResponse,
    responses={404: {"model": ErrorResponse}},
)
async def get_agent(
    agent_id: UUID,
    session: AsyncSession = Depends(get_session),
) -> AgentDetailResponse:
    agent = await session.get(Agent, agent_id)
    if agent is None:
        raise ApiError(status_code=404, error="agent_not_found", message="Agent does not exist.")

    return AgentDetailResponse(
        agent_id=agent.id,
        name=agent.name,
        description=agent.description,
        tags=agent.tags,
        pricing=agent.pricing,
        input_schema=agent.input_schema,
        output_schema=agent.output_schema,
        created_at=agent.created_at,
        updated_at=agent.updated_at,
    )


@router.get(
    "/agents/{agent_id}/stats",
    response_model=AgentStatsResponse,
    responses={404: {"model": ErrorResponse}},
)
async def get_agent_stats(
    agent_id: UUID,
    session: AsyncSession = Depends(get_session),
) -> AgentStatsResponse:
    avg_duration_expr = func.extract("epoch", Job.completed_at - Job.created_at)
    stmt = (
        select(
            func.count(Job.id).label("total_jobs"),
            func.count(Job.id).filter(Job.status == JobStatus.COMPLETED).label("completed_jobs"),
            func.count(Job.id).filter(Job.status == JobStatus.FAILED).label("failed_jobs"),
            func.avg(avg_duration_expr).filter(Job.status == JobStatus.COMPLETED).label("avg_duration_seconds"),
        )
        .select_from(Agent)
        .outerjoin(Job, Job.agent_id == Agent.id)
        .where(Agent.id == agent_id)
        .group_by(Agent.id)
    )
    row = (await session.execute(stmt)).one_or_none()
    if row is None:
        raise ApiError(status_code=404, error="agent_not_found", message="Agent does not exist.")

    total_jobs = int(row.total_jobs or 0)
    completed_jobs = int(row.completed_jobs or 0)
    failed_jobs = int(row.failed_jobs or 0)
    avg_duration_seconds = (
        float(row.avg_duration_seconds) if row.avg_duration_seconds is not None else None
    )
    success_rate = (completed_jobs / total_jobs) if total_jobs > 0 else 0.0

    return AgentStatsResponse(
        total_jobs=total_jobs,
        completed_jobs=completed_jobs,
        failed_jobs=failed_jobs,
        avg_duration_seconds=avg_duration_seconds,
        success_rate=success_rate,
    )
