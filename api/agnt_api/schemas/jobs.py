from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

from agnt_api.models.enums import JobStatus


class CreateJobRequest(BaseModel):
    agent_id: UUID
    prompt: str = Field(min_length=1)
    params: dict[str, Any] = Field(default_factory=dict)


class CreateJobResponse(BaseModel):
    job_id: UUID
    agent_id: UUID
    status: JobStatus
    created_at: datetime


class ExecutorListJobsResponseItem(BaseModel):
    job_id: UUID
    agent_id: UUID
    prompt: str
    params: dict[str, Any]
    status: JobStatus
    progress: int
    created_at: datetime
    started_at: datetime | None
    updated_at: datetime
    completed_at: datetime | None


class ExecutorListJobsResponse(BaseModel):
    jobs: list[ExecutorListJobsResponseItem]


class UpdateJobStatusRequest(BaseModel):
    status: JobStatus
    progress: int | None = Field(default=None, ge=0, le=100)
    reason: str | None = None


class UpdateJobStatusResponse(BaseModel):
    job_id: UUID
    status: JobStatus
    progress: int
    decision_reason: str | None
    started_at: datetime | None
    updated_at: datetime
    completed_at: datetime | None


class JobManifestFile(BaseModel):
    path: str
    download_url: str
    size_bytes: int | None = Field(default=None, ge=0)
    mime_type: str | None = None


class CompleteJobResponse(BaseModel):
    job_id: UUID
    status: JobStatus
    completed_at: datetime


class JobResultResponse(BaseModel):
    job_id: UUID
    status: JobStatus
    files: list[JobManifestFile]


class JobListItem(BaseModel):
    job_id: UUID
    agent_id: UUID
    prompt: str
    status: JobStatus
    progress: int
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None


class JobListResponse(BaseModel):
    jobs: list[JobListItem]
    total: int


class JobDetailResponse(BaseModel):
    job_id: UUID
    agent_id: UUID
    prompt: str
    params: dict[str, Any]
    status: JobStatus
    progress: int
    decision_reason: str | None
    created_at: datetime
    started_at: datetime | None
    updated_at: datetime
    completed_at: datetime | None
