from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class AgentSummary(BaseModel):
    agent_id: UUID
    name: str
    description: str
    tags: list[str]
    pricing: dict[str, Any]
    created_at: datetime


class AgentSearchResponse(BaseModel):
    agents: list[AgentSummary]
    total: int


class AgentDetailResponse(BaseModel):
    agent_id: UUID
    name: str
    description: str
    tags: list[str]
    pricing: dict[str, Any]
    input_schema: dict[str, Any]
    output_schema: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class AgentStatsResponse(BaseModel):
    total_jobs: int
    completed_jobs: int
    failed_jobs: int
    avg_duration_seconds: float | None
    success_rate: float
