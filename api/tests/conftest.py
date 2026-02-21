from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from agnt_api.api.deps import get_app_settings, get_session, get_storage
from agnt_api.config import Settings
from agnt_api.main import create_app
from agnt_api.models.enums import JobStatus

BUYER_TEST_API_KEY = "buyer-test-key"
EXECUTOR_TEST_API_KEY = "executor-test-key"


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class FakeModel:
    """Lightweight stand-in for a SQLAlchemy row."""

    def __init__(self, **kwargs: Any) -> None:
        for k, v in kwargs.items():
            setattr(self, k, v)


def make_agent(**overrides: Any) -> FakeModel:
    defaults: dict[str, Any] = {
        "id": uuid.uuid4(),
        "name": "Test Agent",
        "description": "A test agent",
        "tags": ["test", "demo"],
        "pricing": {"per_job": 100},
        "input_schema": {"type": "object"},
        "output_schema": {"type": "object"},
        "created_at": _utc_now(),
        "updated_at": _utc_now(),
    }
    defaults.update(overrides)
    return FakeModel(**defaults)


def make_job(**overrides: Any) -> FakeModel:
    defaults: dict[str, Any] = {
        "id": uuid.uuid4(),
        "agent_id": uuid.uuid4(),
        "prompt": "Do something",
        "params_json": {},
        "status": JobStatus.PENDING,
        "progress": 0,
        "decision_reason": None,
        "created_at": _utc_now(),
        "started_at": None,
        "updated_at": _utc_now(),
        "completed_at": None,
    }
    defaults.update(overrides)
    return FakeModel(**defaults)


def make_job_result(**overrides: Any) -> FakeModel:
    defaults: dict[str, Any] = {
        "job_id": uuid.uuid4(),
        "files_json": [
            {
                "path": "jobs/default/result.txt",
                "size_bytes": 12,
                "mime_type": "text/plain",
            }
        ],
        "created_at": _utc_now(),
    }
    defaults.update(overrides)
    return FakeModel(**defaults)


class FakeScalarsResult:
    """Mimics the result of session.scalars()."""

    def __init__(self, items: list[Any]) -> None:
        self._items = items

    def all(self) -> list[Any]:
        return self._items


@pytest.fixture()
def mock_session() -> AsyncMock:
    return AsyncMock()


@pytest.fixture()
def mock_storage() -> AsyncMock:
    storage = AsyncMock()
    storage.presigned_url = AsyncMock(return_value="https://example.com/download/file")
    return storage


@pytest.fixture()
def test_settings() -> Settings:
    return Settings(
        buyer_api_key=BUYER_TEST_API_KEY,
        executor_api_key=EXECUTOR_TEST_API_KEY,
    )


@pytest.fixture()
def client(mock_session: AsyncMock, test_settings: Settings) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_session] = lambda: mock_session
    app.dependency_overrides[get_app_settings] = lambda: test_settings
    test_client = TestClient(app)
    test_client.headers.update({"X-API-Key": BUYER_TEST_API_KEY})
    return test_client


@pytest.fixture()
def client_with_storage(
    mock_session: AsyncMock,
    mock_storage: AsyncMock,
    test_settings: Settings,
) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_session] = lambda: mock_session
    app.dependency_overrides[get_storage] = lambda: mock_storage
    app.dependency_overrides[get_app_settings] = lambda: test_settings
    test_client = TestClient(app)
    test_client.headers.update({"X-API-Key": BUYER_TEST_API_KEY})
    return test_client


@pytest.fixture()
def executor_client(mock_session: AsyncMock, test_settings: Settings) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_session] = lambda: mock_session
    app.dependency_overrides[get_app_settings] = lambda: test_settings
    test_client = TestClient(app)
    test_client.headers.update({"X-API-Key": EXECUTOR_TEST_API_KEY})
    return test_client


@pytest.fixture()
def unauthenticated_client(mock_session: AsyncMock, test_settings: Settings) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_session] = lambda: mock_session
    app.dependency_overrides[get_app_settings] = lambda: test_settings
    return TestClient(app)
