from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from agnt_api.api.deps import get_session, get_storage, require_executor_api_key
from agnt_api.api.errors import ApiError
from agnt_api.models import Job, JobResult, JobStatus
from agnt_api.schemas.common import ErrorResponse
from agnt_api.schemas.jobs import (
    CompleteJobResponse,
    ExecutorListJobsResponse,
    ExecutorListJobsResponseItem,
    UpdateJobStatusRequest,
    UpdateJobStatusResponse,
)
from agnt_api.storage import Storage

router = APIRouter(
    prefix="/executor/jobs",
    tags=["executor-jobs"],
    dependencies=[Depends(require_executor_api_key)],
)
logger = logging.getLogger(__name__)

ALLOWED_STATUS_UPDATES = {
    JobStatus.ACCEPTED,
    JobStatus.REJECTED,
    JobStatus.RUNNING,
    JobStatus.FAILED,
}
ALLOWED_TRANSITIONS = {
    JobStatus.PENDING: {JobStatus.ACCEPTED, JobStatus.REJECTED},
    JobStatus.ACCEPTED: {JobStatus.RUNNING},
    JobStatus.RUNNING: {JobStatus.FAILED},
}
REASON_STATUSES = {JobStatus.REJECTED, JobStatus.FAILED}
PROGRESS_STATUSES = {JobStatus.RUNNING}

MAX_FILES_PER_UPLOAD = 20
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MiB


@router.get("", response_model=ExecutorListJobsResponse)
async def list_executor_jobs(
    agent_id: UUID,
    status: JobStatus = Query(default=JobStatus.PENDING),
    session: AsyncSession = Depends(get_session),
) -> ExecutorListJobsResponse:
    stmt = (
        select(Job)
        .where(Job.agent_id == agent_id)
        .where(Job.status == status)
        .order_by(Job.created_at.asc())
    )
    jobs = list((await session.scalars(stmt)).all())
    return ExecutorListJobsResponse(
        jobs=[
            ExecutorListJobsResponseItem(
                job_id=job.id,
                agent_id=job.agent_id,
                prompt=job.prompt,
                params=job.params_json,
                status=job.status,
                progress=job.progress,
                created_at=job.created_at,
                started_at=job.started_at,
                updated_at=job.updated_at,
                completed_at=job.completed_at,
            )
            for job in jobs
        ]
    )


@router.post(
    "/{job_id}/status",
    response_model=UpdateJobStatusResponse,
    responses={404: {"model": ErrorResponse}, 409: {"model": ErrorResponse}},
)
async def update_job_status(
    job_id: UUID,
    payload: UpdateJobStatusRequest,
    session: AsyncSession = Depends(get_session),
) -> UpdateJobStatusResponse:
    if payload.status not in ALLOWED_STATUS_UPDATES:
        raise ApiError(
            status_code=409,
            error="invalid_status_update",
            message="Use /complete to mark jobs as completed.",
        )

    if payload.progress is not None and payload.status not in PROGRESS_STATUSES:
        raise ApiError(
            status_code=409,
            error="invalid_progress_update",
            message="Progress can only be set when status is running.",
        )

    if payload.reason is not None and payload.status not in REASON_STATUSES:
        raise ApiError(
            status_code=409,
            error="invalid_reason_update",
            message="Reason can only be set for rejected or failed status.",
        )

    job = await session.get(Job, job_id)
    if job is None:
        raise ApiError(status_code=404, error="job_not_found", message="Job does not exist.")

    if not is_valid_transition(job.status, payload.status):
        raise ApiError(
            status_code=409,
            error="invalid_transition",
            message=f"Cannot transition job from {job.status} to {payload.status}.",
        )

    now = _utc_now()
    job.status = payload.status
    job.updated_at = now

    if payload.status == JobStatus.RUNNING:
        if job.started_at is None:
            job.started_at = now
        if payload.progress is not None:
            job.progress = payload.progress

    if payload.status in REASON_STATUSES:
        job.decision_reason = payload.reason
        job.completed_at = now

    await session.commit()
    await session.refresh(job)

    return UpdateJobStatusResponse(
        job_id=job.id,
        status=job.status,
        progress=job.progress,
        decision_reason=job.decision_reason,
        started_at=job.started_at,
        updated_at=job.updated_at,
        completed_at=job.completed_at,
    )


@router.post(
    "/{job_id}/complete",
    response_model=CompleteJobResponse,
    responses={404: {"model": ErrorResponse}, 409: {"model": ErrorResponse}},
)
async def complete_job(
    job_id: UUID,
    files: list[UploadFile] = File(..., min_length=1),
    session: AsyncSession = Depends(get_session),
    storage: Storage = Depends(get_storage),
) -> CompleteJobResponse:
    if len(files) > MAX_FILES_PER_UPLOAD:
        raise ApiError(
            status_code=422,
            error="too_many_files",
            message=f"Upload at most {MAX_FILES_PER_UPLOAD} files per request.",
        )

    job = await session.get(Job, job_id)
    if job is None:
        raise ApiError(status_code=404, error="job_not_found", message="Job does not exist.")
    if job.status != JobStatus.RUNNING:
        raise ApiError(
            status_code=409,
            error="job_not_running",
            message="Only running jobs can be completed.",
        )

    uploaded_keys: list[str] = []
    file_manifest: list[dict[str, str | int | None]] = []
    try:
        for index, upload in enumerate(files):
            file_bytes = await upload.read()
            if len(file_bytes) > MAX_FILE_SIZE_BYTES:
                raise ApiError(
                    status_code=422,
                    error="file_too_large",
                    message=f"File '{upload.filename or index}' exceeds {MAX_FILE_SIZE_BYTES} byte limit.",
                )
            object_key = _build_result_object_key(job.id, index, upload.filename)
            content_type = upload.content_type or "application/octet-stream"
            stored_key = await storage.upload(object_key, file_bytes, content_type)
            uploaded_keys.append(stored_key)
            file_manifest.append(
                {
                    "path": stored_key,
                    "size_bytes": len(file_bytes),
                    "mime_type": content_type,
                }
            )
    except ApiError:
        await _cleanup_uploaded_files(storage, uploaded_keys)
        raise
    except Exception as exc:
        await _cleanup_uploaded_files(storage, uploaded_keys)
        raise ApiError(
            status_code=502,
            error="storage_upload_failed",
            message="Failed to upload one or more result files.",
        ) from exc
    finally:
        for upload in files:
            await upload.close()

    result = JobResult(
        job_id=job.id,
        files_json=file_manifest,
    )
    session.add(result)

    now = _utc_now()
    job.status = JobStatus.COMPLETED
    job.progress = 100
    job.updated_at = now
    job.completed_at = now

    try:
        await session.commit()
    except IntegrityError:
        await _cleanup_uploaded_files(storage, uploaded_keys)
        raise ApiError(
            status_code=409,
            error="job_already_completed",
            message="Job has already been completed.",
        )
    except Exception:
        await _cleanup_uploaded_files(storage, uploaded_keys)
        raise ApiError(
            status_code=500,
            error="commit_failed",
            message="Failed to persist job result.",
        )
    await session.refresh(job)

    return CompleteJobResponse(job_id=job.id, status=job.status, completed_at=job.completed_at)


_SAFE_FILENAME_RE = re.compile(r"[^a-zA-Z0-9._-]")


def _build_result_object_key(job_id: UUID, file_index: int, filename: str | None) -> str:
    raw = filename or ""
    # Strip directory components (both unix and windows style)
    basename = raw.rsplit("/", 1)[-1].rsplit("\\", 1)[-1].strip()
    # Replace unsafe characters, collapse runs of dashes
    safe_name = _SAFE_FILENAME_RE.sub("-", basename).strip("-") or f"file-{file_index}"
    return f"jobs/{job_id}/{file_index:03d}-{uuid4().hex}-{safe_name}"


async def _cleanup_uploaded_files(storage: Storage, object_keys: list[str]) -> None:
    for object_key in object_keys:
        try:
            await storage.delete(object_key)
        except Exception:
            logger.exception("Failed to clean up uploaded object: %s", object_key)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def is_valid_transition(current: JobStatus, target: JobStatus) -> bool:
    return target in ALLOWED_TRANSITIONS.get(current, set())
