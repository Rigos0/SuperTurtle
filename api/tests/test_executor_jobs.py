from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import uuid

from sqlalchemy.exc import IntegrityError

from agnt_api.api.deps import get_storage
from agnt_api.api.routes.executor_jobs import (
    MAX_FILE_SIZE_BYTES,
    MAX_FILES_PER_UPLOAD,
    _build_result_object_key,
)
from agnt_api.models.enums import JobStatus
from conftest import EXECUTOR_TEST_API_KEY, FakeScalarsResult, make_job


def test_executor_list_jobs_requires_api_key(unauthenticated_client):
    resp = unauthenticated_client.get(f"/v1/executor/jobs?agent_id={uuid.uuid4()}")
    assert resp.status_code == 401
    assert resp.json()["error"] == "invalid_api_key"


def test_executor_list_jobs_accepts_bearer_api_key(unauthenticated_client, mock_session):
    mock_session.scalars.return_value = FakeScalarsResult([])
    resp = unauthenticated_client.get(
        f"/v1/executor/jobs?agent_id={uuid.uuid4()}",
        headers={"Authorization": f"Bearer {EXECUTOR_TEST_API_KEY}"},
    )
    assert resp.status_code == 200


def test_complete_job_uploads_files_and_marks_completed(executor_client, mock_session):
    job = make_job(status=JobStatus.RUNNING, progress=35)
    mock_session.get.return_value = job
    mock_session.add = MagicMock()

    mock_storage = AsyncMock()
    mock_storage.upload = AsyncMock(side_effect=lambda key, _data, _content_type: key)
    mock_storage.delete = AsyncMock()
    executor_client.app.dependency_overrides[get_storage] = lambda: mock_storage

    try:
        resp = executor_client.post(
            f"/v1/executor/jobs/{job.id}/complete",
            files=[
                ("files", ("result.txt", b"hello", "text/plain")),
                ("files", ("summary.json", b'{"ok":true}', "application/json")),
            ],
        )
    finally:
        executor_client.app.dependency_overrides.pop(get_storage, None)

    assert resp.status_code == 200
    body = resp.json()
    assert body["job_id"] == str(job.id)
    assert body["status"] == "completed"
    assert job.status == JobStatus.COMPLETED
    assert job.progress == 100
    assert job.completed_at is not None

    assert mock_storage.upload.await_count == 2
    first_upload = mock_storage.upload.await_args_list[0]
    second_upload = mock_storage.upload.await_args_list[1]
    assert first_upload.args[0].startswith(f"jobs/{job.id}/")
    assert first_upload.args[1] == b"hello"
    assert first_upload.args[2] == "text/plain"
    assert second_upload.args[0].startswith(f"jobs/{job.id}/")
    assert second_upload.args[1] == b'{"ok":true}'
    assert second_upload.args[2] == "application/json"

    assert mock_session.add.call_count == 1
    result_model = mock_session.add.call_args.args[0]
    assert result_model.job_id == job.id
    assert len(result_model.files_json) == 2
    assert result_model.files_json[0]["path"].startswith(f"jobs/{job.id}/")
    assert result_model.files_json[0]["size_bytes"] == 5
    assert result_model.files_json[0]["mime_type"] == "text/plain"
    assert result_model.files_json[1]["path"].startswith(f"jobs/{job.id}/")
    assert result_model.files_json[1]["size_bytes"] == 11
    assert result_model.files_json[1]["mime_type"] == "application/json"
    assert mock_storage.delete.await_count == 0


def test_complete_job_returns_404_when_job_missing(executor_client, mock_session):
    mock_session.get.return_value = None
    mock_storage = AsyncMock()
    executor_client.app.dependency_overrides[get_storage] = lambda: mock_storage

    try:
        resp = executor_client.post(
            "/v1/executor/jobs/7be6a3db-83be-4d3a-a64b-e8e6efc84f9f/complete",
            files=[("files", ("result.txt", b"hello", "text/plain"))],
        )
    finally:
        executor_client.app.dependency_overrides.pop(get_storage, None)

    assert resp.status_code == 404
    assert resp.json()["error"] == "job_not_found"
    assert mock_storage.upload.await_count == 0


def test_complete_job_returns_409_when_not_running(executor_client, mock_session):
    job = make_job(status=JobStatus.ACCEPTED, progress=0)
    mock_session.get.return_value = job
    mock_storage = AsyncMock()
    executor_client.app.dependency_overrides[get_storage] = lambda: mock_storage

    try:
        resp = executor_client.post(
            f"/v1/executor/jobs/{job.id}/complete",
            files=[("files", ("result.txt", b"hello", "text/plain"))],
        )
    finally:
        executor_client.app.dependency_overrides.pop(get_storage, None)

    assert resp.status_code == 409
    assert resp.json()["error"] == "job_not_running"
    assert mock_storage.upload.await_count == 0


def test_complete_job_cleans_up_on_upload_failure(executor_client, mock_session):
    job = make_job(status=JobStatus.RUNNING, progress=50)
    mock_session.get.return_value = job

    successful_upload_keys: list[str] = []

    async def upload_side_effect(key: str, _data: bytes, _content_type: str) -> str:
        if not successful_upload_keys:
            successful_upload_keys.append(key)
            return key
        raise RuntimeError("upload failed")

    mock_storage = AsyncMock()
    mock_storage.upload = AsyncMock(side_effect=upload_side_effect)
    mock_storage.delete = AsyncMock()
    executor_client.app.dependency_overrides[get_storage] = lambda: mock_storage

    try:
        resp = executor_client.post(
            f"/v1/executor/jobs/{job.id}/complete",
            files=[
                ("files", ("a.txt", b"a", "text/plain")),
                ("files", ("b.txt", b"b", "text/plain")),
            ],
        )
    finally:
        executor_client.app.dependency_overrides.pop(get_storage, None)

    assert resp.status_code == 502
    body = resp.json()
    assert body["error"] == "storage_upload_failed"
    assert mock_storage.delete.await_count == 1
    assert mock_storage.delete.await_args.args[0] == successful_upload_keys[0]
    assert mock_session.commit.await_count == 0


def test_complete_job_cleans_up_on_commit_failure(executor_client, mock_session):
    job = make_job(status=JobStatus.RUNNING, progress=50)
    mock_session.get.return_value = job
    mock_session.add = MagicMock()
    mock_session.commit = AsyncMock(side_effect=RuntimeError("db down"))

    mock_storage = AsyncMock()
    mock_storage.upload = AsyncMock(side_effect=lambda key, _data, _ct: key)
    mock_storage.delete = AsyncMock()
    executor_client.app.dependency_overrides[get_storage] = lambda: mock_storage

    try:
        resp = executor_client.post(
            f"/v1/executor/jobs/{job.id}/complete",
            files=[("files", ("a.txt", b"data", "text/plain"))],
        )
    finally:
        executor_client.app.dependency_overrides.pop(get_storage, None)

    assert resp.status_code == 500
    assert resp.json()["error"] == "commit_failed"
    assert mock_storage.delete.await_count == 1


def test_complete_job_returns_409_on_duplicate_completion(executor_client, mock_session):
    job = make_job(status=JobStatus.RUNNING, progress=80)
    mock_session.get.return_value = job
    mock_session.add = MagicMock()
    mock_session.commit = AsyncMock(side_effect=IntegrityError("dup", {}, None))

    mock_storage = AsyncMock()
    mock_storage.upload = AsyncMock(side_effect=lambda key, _data, _ct: key)
    mock_storage.delete = AsyncMock()
    executor_client.app.dependency_overrides[get_storage] = lambda: mock_storage

    try:
        resp = executor_client.post(
            f"/v1/executor/jobs/{job.id}/complete",
            files=[("files", ("a.txt", b"data", "text/plain"))],
        )
    finally:
        executor_client.app.dependency_overrides.pop(get_storage, None)

    assert resp.status_code == 409
    assert resp.json()["error"] == "job_already_completed"
    assert mock_storage.delete.await_count == 1


def test_complete_job_rejects_too_many_files(executor_client, mock_session):
    job = make_job(status=JobStatus.RUNNING, progress=10)
    mock_session.get.return_value = job

    mock_storage = AsyncMock()
    executor_client.app.dependency_overrides[get_storage] = lambda: mock_storage

    file_count = MAX_FILES_PER_UPLOAD + 1
    file_list = [("files", (f"f{i}.txt", b"x", "text/plain")) for i in range(file_count)]

    try:
        resp = executor_client.post(f"/v1/executor/jobs/{job.id}/complete", files=file_list)
    finally:
        executor_client.app.dependency_overrides.pop(get_storage, None)

    assert resp.status_code == 422
    assert resp.json()["error"] == "too_many_files"
    assert mock_storage.upload.await_count == 0


def test_complete_job_rejects_oversized_file(executor_client, mock_session):
    job = make_job(status=JobStatus.RUNNING, progress=10)
    mock_session.get.return_value = job

    mock_storage = AsyncMock()
    mock_storage.upload = AsyncMock(side_effect=lambda key, _data, _ct: key)
    mock_storage.delete = AsyncMock()
    executor_client.app.dependency_overrides[get_storage] = lambda: mock_storage

    big_data = b"x" * (MAX_FILE_SIZE_BYTES + 1)

    try:
        resp = executor_client.post(
            f"/v1/executor/jobs/{job.id}/complete",
            files=[("files", ("huge.bin", big_data, "application/octet-stream"))],
        )
    finally:
        executor_client.app.dependency_overrides.pop(get_storage, None)

    assert resp.status_code == 422
    assert resp.json()["error"] == "file_too_large"
    assert mock_storage.upload.await_count == 0


def test_complete_job_sanitises_traversal_filename(executor_client, mock_session):
    job = make_job(status=JobStatus.RUNNING, progress=10)
    mock_session.get.return_value = job
    mock_session.add = MagicMock()

    mock_storage = AsyncMock()
    mock_storage.upload = AsyncMock(side_effect=lambda key, _data, _ct: key)
    executor_client.app.dependency_overrides[get_storage] = lambda: mock_storage

    try:
        resp = executor_client.post(
            f"/v1/executor/jobs/{job.id}/complete",
            files=[("files", ("../../etc/passwd", b"bad", "text/plain"))],
        )
    finally:
        executor_client.app.dependency_overrides.pop(get_storage, None)

    assert resp.status_code == 200
    uploaded_key = mock_storage.upload.await_args.args[0]
    assert uploaded_key.startswith(f"jobs/{job.id}/")
    assert ".." not in uploaded_key
    assert "etc" not in uploaded_key or "passwd" in uploaded_key


def test_build_result_object_key_no_filename():
    job_id = uuid.uuid4()
    key = _build_result_object_key(job_id, 0, None)
    assert key.startswith(f"jobs/{job_id}/000-")
    assert "file-0" in key


def test_build_result_object_key_traversal_stripped():
    job_id = uuid.uuid4()
    key = _build_result_object_key(job_id, 1, "../../etc/passwd")
    assert ".." not in key
    assert key.endswith("passwd")


def test_build_result_object_key_windows_path():
    job_id = uuid.uuid4()
    key = _build_result_object_key(job_id, 0, "C:\\Users\\evil\\payload.exe")
    assert "\\" not in key
    assert key.endswith("payload.exe")
