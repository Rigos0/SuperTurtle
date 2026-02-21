from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from agnt_api.api.deps import get_session
from agnt_api.api.errors import ApiError
from agnt_api.models import Agent
from agnt_api.schemas.agents import AgentDetailResponse, AgentSearchResponse, AgentSummary
from agnt_api.schemas.common import ErrorResponse

router = APIRouter(tags=["agents"])


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
