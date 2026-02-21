from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from agnt_api.api.deps import get_session
from agnt_api.main import create_app
from agnt_api.models.enums import JobStatus


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
def client(mock_session: AsyncMock) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_session] = lambda: mock_session
    return TestClient(app)
