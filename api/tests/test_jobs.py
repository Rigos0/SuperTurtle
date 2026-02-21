from __future__ import annotations

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock

from agnt_api.models.enums import JobStatus
from conftest import EXECUTOR_TEST_API_KEY, FakeScalarsResult, make_job, make_job_result


def test_list_jobs_requires_api_key(unauthenticated_client):
    resp = unauthenticated_client.get("/v1/jobs")
    assert resp.status_code == 401
    assert resp.json()["error"] == "invalid_api_key"


def test_list_jobs_rejects_executor_key(unauthenticated_client):
    resp = unauthenticated_client.get(
        "/v1/jobs",
        headers={"X-API-Key": EXECUTOR_TEST_API_KEY},
    )
    assert resp.status_code == 401
    assert resp.json()["error"] == "invalid_api_key"


def test_list_jobs_empty(client, mock_session):
    mock_session.scalars.return_value = FakeScalarsResult([])
    mock_session.scalar.return_value = 0

    resp = client.get("/v1/jobs")

    assert resp.status_code == 200
    body = resp.json()
    assert body["jobs"] == []
    assert body["total"] == 0


def test_list_jobs_returns_results(client, mock_session):
    created_at = datetime(2026, 2, 21, 10, 0, tzinfo=timezone.utc)
    completed_at = datetime(2026, 2, 21, 10, 5, tzinfo=timezone.utc)
    job = make_job(status=JobStatus.COMPLETED, progress=100, created_at=created_at, completed_at=completed_at)
    mock_session.scalars.return_value = FakeScalarsResult([job])
    mock_session.scalar.return_value = 1

    resp = client.get("/v1/jobs")

    assert resp.status_code == 200
    body = resp.json()
    assert len(body["jobs"]) == 1
    assert body["jobs"][0]["job_id"] == str(job.id)
    assert body["jobs"][0]["status"] == "completed"
    assert body["jobs"][0]["duration_seconds"] == 300
    assert body["total"] == 1


def test_list_jobs_filter_by_status(client, mock_session):
    job = make_job(status=JobStatus.RUNNING, progress=50)
    mock_session.scalars.return_value = FakeScalarsResult([job])
    mock_session.scalar.return_value = 1

    resp = client.get("/v1/jobs", params={"status": "running"})

    assert resp.status_code == 200
    body = resp.json()
    assert len(body["jobs"]) == 1
    assert body["jobs"][0]["status"] == "running"


def test_list_jobs_filter_by_agent_id(client, mock_session):
    agent_id = uuid.uuid4()
    job = make_job(agent_id=agent_id)
    mock_session.scalars.return_value = FakeScalarsResult([job])
    mock_session.scalar.return_value = 1

    resp = client.get("/v1/jobs", params={"agent_id": str(agent_id)})

    assert resp.status_code == 200
    body = resp.json()
    assert len(body["jobs"]) == 1


def test_list_jobs_pagination(client, mock_session):
    mock_session.scalars.return_value = FakeScalarsResult([])
    mock_session.scalar.return_value = 0

    resp = client.get("/v1/jobs", params={"limit": 5, "offset": 10})

    assert resp.status_code == 200


def test_list_jobs_invalid_limit(client, mock_session):
    resp = client.get("/v1/jobs", params={"limit": 0})
    assert resp.status_code == 422


def test_get_job_found(client, mock_session):
    job = make_job(params_json={"key": "value"})
    mock_session.get.return_value = job

    resp = client.get(f"/v1/jobs/{job.id}")

    assert resp.status_code == 200
    body = resp.json()
    assert body["job_id"] == str(job.id)
    assert body["agent_id"] == str(job.agent_id)
    assert body["prompt"] == job.prompt
    assert body["params"] == {"key": "value"}
    assert body["status"] == "pending"
    assert body["progress"] == 0
    assert body["decision_reason"] is None
    assert body["duration_seconds"] is None


def test_get_job_duration_seconds_when_completed(client, mock_session):
    created_at = datetime(2026, 2, 21, 10, 0, tzinfo=timezone.utc)
    completed_at = datetime(2026, 2, 21, 10, 2, 15, tzinfo=timezone.utc)
    job = make_job(
        status=JobStatus.COMPLETED,
        progress=100,
        created_at=created_at,
        completed_at=completed_at,
    )
    mock_session.get.return_value = job

    resp = client.get(f"/v1/jobs/{job.id}")

    assert resp.status_code == 200
    body = resp.json()
    assert body["duration_seconds"] == 135


def test_get_job_not_found(client, mock_session):
    mock_session.get.return_value = None

    resp = client.get(f"/v1/jobs/{uuid.uuid4()}")

    assert resp.status_code == 404
    body = resp.json()
    assert body["error"] == "job_not_found"


def test_get_job_invalid_uuid(client, mock_session):
    resp = client.get("/v1/jobs/not-a-uuid")
    assert resp.status_code == 422


def test_get_job_result_returns_presigned_urls(client_with_storage, mock_session, mock_storage):
    job = make_job(status=JobStatus.COMPLETED, progress=100)
    result = make_job_result(
        job_id=job.id,
        files_json=[
            {"path": f"jobs/{job.id}/result.txt", "size_bytes": 5, "mime_type": "text/plain"},
            {"path": f"jobs/{job.id}/summary.json", "size_bytes": 11, "mime_type": "application/json"},
        ],
    )
    mock_session.get.return_value = job
    mock_session.scalar.return_value = result

    mock_storage.presigned_url = AsyncMock(
        side_effect=[
            "https://example.com/download/result.txt",
            "https://example.com/download/summary.json",
        ]
    )

    resp = client_with_storage.get(f"/v1/jobs/{job.id}/result")

    assert resp.status_code == 200
    body = resp.json()
    assert body["job_id"] == str(job.id)
    assert body["status"] == "completed"
    assert len(body["files"]) == 2
    assert body["files"][0]["path"] == f"jobs/{job.id}/result.txt"
    assert body["files"][0]["download_url"] == "https://example.com/download/result.txt"
    assert body["files"][1]["path"] == f"jobs/{job.id}/summary.json"
    assert body["files"][1]["download_url"] == "https://example.com/download/summary.json"
    assert mock_storage.presigned_url.await_count == 2
    assert mock_storage.presigned_url.await_args_list[0].args[0] == f"jobs/{job.id}/result.txt"
    assert mock_storage.presigned_url.await_args_list[1].args[0] == f"jobs/{job.id}/summary.json"


def test_get_job_result_returns_404_when_job_missing(client_with_storage, mock_session):
    mock_session.get.return_value = None

    resp = client_with_storage.get(f"/v1/jobs/{uuid.uuid4()}/result")

    assert resp.status_code == 404
    assert resp.json()["error"] == "job_not_found"


def test_get_job_result_returns_409_when_job_not_completed(client_with_storage, mock_session):
    job = make_job(status=JobStatus.RUNNING, progress=75)
    mock_session.get.return_value = job

    resp = client_with_storage.get(f"/v1/jobs/{job.id}/result")

    assert resp.status_code == 409
    assert resp.json()["error"] == "job_not_completed"


def test_get_job_result_returns_404_when_result_missing(client_with_storage, mock_session):
    job = make_job(status=JobStatus.COMPLETED, progress=100)
    mock_session.get.return_value = job
    mock_session.scalar.return_value = None

    resp = client_with_storage.get(f"/v1/jobs/{job.id}/result")

    assert resp.status_code == 404
    assert resp.json()["error"] == "job_result_not_found"


def test_get_job_result_returns_502_when_presign_fails(client_with_storage, mock_session, mock_storage):
    job = make_job(status=JobStatus.COMPLETED, progress=100)
    result = make_job_result(
        job_id=job.id,
        files_json=[{"path": f"jobs/{job.id}/result.txt", "size_bytes": 5, "mime_type": "text/plain"}],
    )
    mock_session.get.return_value = job
    mock_session.scalar.return_value = result

    mock_storage.presigned_url = AsyncMock(side_effect=RuntimeError("storage down"))

    resp = client_with_storage.get(f"/v1/jobs/{job.id}/result")

    assert resp.status_code == 502
    assert resp.json()["error"] == "storage_presign_failed"


def test_get_job_result_returns_500_when_manifest_has_no_path(client_with_storage, mock_session):
    job = make_job(status=JobStatus.COMPLETED, progress=100)
    result = make_job_result(
        job_id=job.id,
        files_json=[{"size_bytes": 5, "mime_type": "text/plain"}],
    )
    mock_session.get.return_value = job
    mock_session.scalar.return_value = result

    resp = client_with_storage.get(f"/v1/jobs/{job.id}/result")

    assert resp.status_code == 500
    assert resp.json()["error"] == "invalid_job_result_manifest"


def test_get_job_result_returns_500_when_files_json_not_a_list(client_with_storage, mock_session):
    job = make_job(status=JobStatus.COMPLETED, progress=100)
    result = make_job_result(
        job_id=job.id,
        files_json={"not": "a list"},
    )
    mock_session.get.return_value = job
    mock_session.scalar.return_value = result

    resp = client_with_storage.get(f"/v1/jobs/{job.id}/result")

    assert resp.status_code == 500
    assert resp.json()["error"] == "invalid_job_result_manifest"
