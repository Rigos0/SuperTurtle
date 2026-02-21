from __future__ import annotations

import uuid

from conftest import FakeScalarsResult, make_agent


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
