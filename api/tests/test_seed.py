"""Regression tests for seed data integrity.

Validates that all seeded agents (especially executor agents) have correct
shapes, required fields, and consistent UUIDs so they surface properly in
CLI, Web, and executor polling.
"""

from __future__ import annotations

import uuid

from seed import SAMPLE_AGENTS

# ------------------------------------------------------------------ #
#  Expected executor agent IDs and names                              #
# ------------------------------------------------------------------ #

EXECUTOR_AGENTS = {
    "55555555-5555-5555-5555-555555555555": "gemini-assistant",
    "66666666-6666-6666-6666-666666666666": "claude-assistant",
    "77777777-7777-7777-7777-777777777777": "codex-assistant",
    "88888888-8888-8888-8888-888888888888": "code-review-specialist",
}

REQUIRED_FIELDS = {"id", "name", "description", "tags", "pricing", "input_schema", "output_schema"}
REQUIRED_PRICING_KEYS = {"currency", "unit", "amount"}


class TestSeedDataIntegrity:
    """Ensure every seeded agent has the correct shape."""

    def test_total_agent_count(self):
        assert len(SAMPLE_AGENTS) == 8

    def test_all_agents_have_required_fields(self):
        for agent in SAMPLE_AGENTS:
            missing = REQUIRED_FIELDS - set(agent.keys())
            assert not missing, f"Agent {agent.get('name', '?')} missing fields: {missing}"

    def test_all_ids_are_valid_uuids(self):
        for agent in SAMPLE_AGENTS:
            parsed = uuid.UUID(agent["id"])
            assert str(parsed) == agent["id"]

    def test_no_duplicate_ids(self):
        ids = [a["id"] for a in SAMPLE_AGENTS]
        assert len(ids) == len(set(ids))

    def test_no_duplicate_names(self):
        names = [a["name"] for a in SAMPLE_AGENTS]
        assert len(names) == len(set(names))

    def test_all_agents_have_valid_pricing(self):
        for agent in SAMPLE_AGENTS:
            pricing = agent["pricing"]
            missing = REQUIRED_PRICING_KEYS - set(pricing.keys())
            assert not missing, f"Agent {agent['name']} pricing missing keys: {missing}"
            assert isinstance(pricing["amount"], (int, float))
            assert pricing["amount"] > 0
            assert pricing["currency"] == "USD"

    def test_all_agents_have_valid_schemas(self):
        for agent in SAMPLE_AGENTS:
            for schema_key in ("input_schema", "output_schema"):
                schema = agent[schema_key]
                assert isinstance(schema, dict), f"{agent['name']}.{schema_key} is not a dict"
                assert schema.get("type") == "object", (
                    f"{agent['name']}.{schema_key} missing type=object"
                )

    def test_tags_are_non_empty_string_lists(self):
        for agent in SAMPLE_AGENTS:
            tags = agent["tags"]
            assert isinstance(tags, list)
            assert len(tags) > 0, f"Agent {agent['name']} has empty tags"
            assert all(isinstance(t, str) and len(t) > 0 for t in tags)


class TestExecutorAgents:
    """Validate the 4 executor agents that must match running executors."""

    def test_executor_agent_count(self):
        executor_ids = set(EXECUTOR_AGENTS.keys())
        actual = [a for a in SAMPLE_AGENTS if a["id"] in executor_ids]
        assert len(actual) == 4

    def test_executor_ids_and_names(self):
        for agent in SAMPLE_AGENTS:
            if agent["id"] in EXECUTOR_AGENTS:
                expected_name = EXECUTOR_AGENTS[agent["id"]]
                assert agent["name"] == expected_name, (
                    f"UUID {agent['id']}: expected name={expected_name}, got {agent['name']}"
                )

    def test_coding_executors_share_ai_tag(self):
        coding_ids = {
            "55555555-5555-5555-5555-555555555555",
            "66666666-6666-6666-6666-666666666666",
            "77777777-7777-7777-7777-777777777777",
        }
        for agent in SAMPLE_AGENTS:
            if agent["id"] in coding_ids:
                assert "ai" in agent["tags"], f"{agent['name']} missing 'ai' tag"
                assert "coding" in agent["tags"], f"{agent['name']} missing 'coding' tag"

    def test_code_review_executor_tags(self):
        agent = next(a for a in SAMPLE_AGENTS if a["id"] == "88888888-8888-8888-8888-888888888888")
        assert "ai" in agent["tags"]
        assert "code-review" in agent["tags"]

    def test_executor_agents_have_files_output_schema(self):
        """All executors produce file artifacts."""
        executor_ids = set(EXECUTOR_AGENTS.keys())
        for agent in SAMPLE_AGENTS:
            if agent["id"] in executor_ids:
                props = agent["output_schema"].get("properties", {})
                assert "files" in props, f"{agent['name']} output_schema missing 'files' property"

    def test_gemini_assistant_details(self):
        agent = next(a for a in SAMPLE_AGENTS if a["name"] == "gemini-assistant")
        assert agent["id"] == "55555555-5555-5555-5555-555555555555"
        assert "gemini" in agent["tags"]
        assert agent["pricing"]["amount"] == 0.10

    def test_claude_assistant_details(self):
        agent = next(a for a in SAMPLE_AGENTS if a["name"] == "claude-assistant")
        assert agent["id"] == "66666666-6666-6666-6666-666666666666"
        assert "claude" in agent["tags"]
        assert agent["pricing"]["amount"] == 0.10

    def test_codex_assistant_details(self):
        agent = next(a for a in SAMPLE_AGENTS if a["name"] == "codex-assistant")
        assert agent["id"] == "77777777-7777-7777-7777-777777777777"
        assert "codex" in agent["tags"]
        assert agent["pricing"]["amount"] == 0.10

    def test_code_review_specialist_details(self):
        agent = next(a for a in SAMPLE_AGENTS if a["name"] == "code-review-specialist")
        assert agent["id"] == "88888888-8888-8888-8888-888888888888"
        assert "quality" in agent["tags"]
        assert agent["pricing"]["amount"] == 0.08
        assert "code" in agent["input_schema"].get("required", [])
