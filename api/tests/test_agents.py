from __future__ import annotations

import uuid
from types import SimpleNamespace
from unittest.mock import Mock

from conftest import BUYER_TEST_API_KEY, EXECUTOR_TEST_API_KEY, FakeScalarsResult, make_agent


def test_search_agents_requires_api_key(unauthenticated_client):
    resp = unauthenticated_client.get("/v1/agents/search")
    assert resp.status_code == 401
    assert resp.json()["error"] == "invalid_api_key"


def test_search_agents_accepts_bearer_api_key(unauthenticated_client, mock_session):
    mock_session.scalars.return_value = FakeScalarsResult([])
    mock_session.scalar.return_value = 0

    resp = unauthenticated_client.get(
        "/v1/agents/search",
        headers={"Authorization": f"Bearer {BUYER_TEST_API_KEY}"},
    )

    assert resp.status_code == 200


def test_search_agents_rejects_executor_key(unauthenticated_client):
    resp = unauthenticated_client.get(
        "/v1/agents/search",
        headers={"X-API-Key": EXECUTOR_TEST_API_KEY},
    )
    assert resp.status_code == 401
    assert resp.json()["error"] == "invalid_api_key"


def test_search_agents_empty(client, mock_session):
    mock_session.scalars.return_value = FakeScalarsResult([])
    mock_session.scalar.return_value = 0

    resp = client.get("/v1/agents/search")

    assert resp.status_code == 200
    body = resp.json()
    assert body["agents"] == []
    assert body["total"] == 0


def test_search_agents_returns_results(client, mock_session):
    agent = make_agent()
    mock_session.scalars.return_value = FakeScalarsResult([agent])
    mock_session.scalar.return_value = 1

    resp = client.get("/v1/agents/search", params={"q": "Test"})

    assert resp.status_code == 200
    body = resp.json()
    assert len(body["agents"]) == 1
    assert body["agents"][0]["name"] == "Test Agent"
    assert body["total"] == 1


def test_search_agents_with_tag_filter(client, mock_session):
    agent = make_agent(tags=["ml"])
    mock_session.scalars.return_value = FakeScalarsResult([agent])
    mock_session.scalar.return_value = 1

    resp = client.get("/v1/agents/search", params={"tag": "ml"})

    assert resp.status_code == 200
    body = resp.json()
    assert len(body["agents"]) == 1


def test_search_agents_pagination(client, mock_session):
    mock_session.scalars.return_value = FakeScalarsResult([])
    mock_session.scalar.return_value = 0

    resp = client.get("/v1/agents/search", params={"limit": 5, "offset": 10})

    assert resp.status_code == 200


def test_search_agents_invalid_limit(client, mock_session):
    resp = client.get("/v1/agents/search", params={"limit": 0})
    assert resp.status_code == 422


def test_get_agent_found(client, mock_session):
    agent = make_agent()
    mock_session.get.return_value = agent

    resp = client.get(f"/v1/agents/{agent.id}")

    assert resp.status_code == 200
    body = resp.json()
    assert body["agent_id"] == str(agent.id)
    assert body["name"] == agent.name
    assert body["description"] == agent.description
    assert body["tags"] == agent.tags
    assert body["pricing"] == agent.pricing
    assert body["input_schema"] == agent.input_schema
    assert body["output_schema"] == agent.output_schema


def test_get_agent_not_found(client, mock_session):
    mock_session.get.return_value = None
    agent_id = uuid.uuid4()

    resp = client.get(f"/v1/agents/{agent_id}")

    assert resp.status_code == 404
    body = resp.json()
    assert body["error"] == "agent_not_found"


def test_get_agent_invalid_uuid(client, mock_session):
    resp = client.get("/v1/agents/not-a-uuid")
    assert resp.status_code == 422


def test_get_agent_stats_found(client, mock_session):
    agent = make_agent()
    result = Mock()
    result.one_or_none.return_value = SimpleNamespace(
        total_jobs=5,
        completed_jobs=3,
        failed_jobs=1,
        avg_duration_seconds=42.5,
    )
    mock_session.execute.return_value = result

    resp = client.get(f"/v1/agents/{agent.id}/stats")

    assert resp.status_code == 200
    body = resp.json()
    assert body["total_jobs"] == 5
    assert body["completed_jobs"] == 3
    assert body["failed_jobs"] == 1
    assert body["avg_duration_seconds"] == 42.5
    assert body["success_rate"] == 0.6


def test_get_agent_stats_not_found(client, mock_session):
    result = Mock()
    result.one_or_none.return_value = None
    mock_session.execute.return_value = result
    agent_id = uuid.uuid4()

    resp = client.get(f"/v1/agents/{agent_id}/stats")

    assert resp.status_code == 404
    body = resp.json()
    assert body["error"] == "agent_not_found"


def test_get_agent_stats_with_no_jobs(client, mock_session):
    agent = make_agent()
    result = Mock()
    result.one_or_none.return_value = SimpleNamespace(
        total_jobs=0,
        completed_jobs=0,
        failed_jobs=0,
        avg_duration_seconds=None,
    )
    mock_session.execute.return_value = result

    resp = client.get(f"/v1/agents/{agent.id}/stats")

    assert resp.status_code == 200
    body = resp.json()
    assert body["total_jobs"] == 0
    assert body["completed_jobs"] == 0
    assert body["failed_jobs"] == 0
    assert body["avg_duration_seconds"] is None
    assert body["success_rate"] == 0.0


# ------------------------------------------------------------------ #
#  Executor agent marketplace surface regression                      #
# ------------------------------------------------------------------ #


def _make_executor_agent(name: str, agent_id: str, tags: list[str]):
    """Create a mock agent matching seeded executor shape."""
    return make_agent(
        id=uuid.UUID(agent_id),
        name=name,
        tags=tags,
        pricing={"currency": "USD", "unit": "job", "amount": 0.10},
        input_schema={"type": "object", "properties": {}, "required": []},
        output_schema={"type": "object", "properties": {"files": {"type": "array", "items": {"type": "string"}}}},
    )


def test_search_returns_executor_agents(client, mock_session):
    """Executor agents surface when searching by name substring."""
    agents = [
        _make_executor_agent("gemini-assistant", "55555555-5555-5555-5555-555555555555", ["ai", "gemini", "coding"]),
        _make_executor_agent("claude-assistant", "66666666-6666-6666-6666-666666666666", ["ai", "claude", "coding"]),
        _make_executor_agent("codex-assistant", "77777777-7777-7777-7777-777777777777", ["ai", "codex", "coding"]),
    ]
    mock_session.scalars.return_value = FakeScalarsResult(agents)
    mock_session.scalar.return_value = 3

    resp = client.get("/v1/agents/search", params={"q": "assistant"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 3
    names = {a["name"] for a in body["agents"]}
    assert names == {"gemini-assistant", "claude-assistant", "codex-assistant"}


def test_search_by_ai_tag_returns_executor_agents(client, mock_session):
    """Filtering by 'ai' tag returns all executor agents."""
    agents = [
        _make_executor_agent("gemini-assistant", "55555555-5555-5555-5555-555555555555", ["ai", "gemini", "coding"]),
        _make_executor_agent("claude-assistant", "66666666-6666-6666-6666-666666666666", ["ai", "claude", "coding"]),
        _make_executor_agent("codex-assistant", "77777777-7777-7777-7777-777777777777", ["ai", "codex", "coding"]),
        _make_executor_agent("code-review-specialist", "88888888-8888-8888-8888-888888888888", ["ai", "claude", "code-review"]),
    ]
    mock_session.scalars.return_value = FakeScalarsResult(agents)
    mock_session.scalar.return_value = 4

    resp = client.get("/v1/agents/search", params={"tag": "ai"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 4


def test_get_executor_agent_detail(client, mock_session):
    """Executor agent detail returns all expected fields including schemas."""
    agent = _make_executor_agent(
        "claude-assistant",
        "66666666-6666-6666-6666-666666666666",
        ["ai", "claude", "coding", "code-generation"],
    )
    mock_session.get.return_value = agent

    resp = client.get(f"/v1/agents/{agent.id}")

    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "claude-assistant"
    assert body["tags"] == ["ai", "claude", "coding", "code-generation"]
    assert body["pricing"] == {"currency": "USD", "unit": "job", "amount": 0.10}
    assert "files" in body["output_schema"]["properties"]


def test_get_executor_agent_stats_with_completed_jobs(client, mock_session):
    """Executor agent stats compute correctly with real job data."""
    agent = _make_executor_agent(
        "gemini-assistant",
        "55555555-5555-5555-5555-555555555555",
        ["ai", "gemini", "coding"],
    )
    result = Mock()
    result.one_or_none.return_value = SimpleNamespace(
        total_jobs=20,
        completed_jobs=18,
        failed_jobs=2,
        avg_duration_seconds=95.3,
    )
    mock_session.execute.return_value = result

    resp = client.get(f"/v1/agents/{agent.id}/stats")

    assert resp.status_code == 200
    body = resp.json()
    assert body["total_jobs"] == 20
    assert body["completed_jobs"] == 18
    assert body["failed_jobs"] == 2
    assert body["avg_duration_seconds"] == 95.3
    assert body["success_rate"] == 0.9
