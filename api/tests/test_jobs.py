from __future__ import annotations

import uuid

from agnt_api.models.enums import JobStatus
from conftest import FakeScalarsResult, make_job


def test_list_jobs_empty(client, mock_session):
    mock_session.scalars.return_value = FakeScalarsResult([])
    mock_session.scalar.return_value = 0

    resp = client.get("/v1/jobs")

    assert resp.status_code == 200
    body = resp.json()
    assert body["jobs"] == []
    assert body["total"] == 0


def test_list_jobs_returns_results(client, mock_session):
    job = make_job()
    mock_session.scalars.return_value = FakeScalarsResult([job])
    mock_session.scalar.return_value = 1

    resp = client.get("/v1/jobs")

    assert resp.status_code == 200
    body = resp.json()
    assert len(body["jobs"]) == 1
    assert body["jobs"][0]["job_id"] == str(job.id)
    assert body["jobs"][0]["status"] == "pending"
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


def test_get_job_not_found(client, mock_session):
    mock_session.get.return_value = None

    resp = client.get(f"/v1/jobs/{uuid.uuid4()}")

    assert resp.status_code == 404
    body = resp.json()
    assert body["error"] == "job_not_found"


def test_get_job_invalid_uuid(client, mock_session):
    resp = client.get("/v1/jobs/not-a-uuid")
    assert resp.status_code == 422
