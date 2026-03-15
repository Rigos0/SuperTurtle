from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from super_turtle.state.conductor_state import (
    CONDUCTOR_SCHEMA_VERSION,
    ConductorStateStore,
    ensure_conductor_state_paths,
)


class ConductorStateStoreTests(unittest.TestCase):
    def test_ensure_conductor_state_paths_creates_layout(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            paths = ensure_conductor_state_paths(tmp_dir)

            self.assertTrue(paths.base_dir.exists())
            self.assertTrue(paths.events_jsonl_file.exists())
            self.assertTrue(paths.runs_jsonl_file.exists())
            self.assertTrue(paths.workers_dir.exists())
            self.assertTrue(paths.wakeups_dir.exists())
            self.assertEqual(paths.events_jsonl_file.read_text(encoding="utf-8"), "")
            self.assertEqual(paths.runs_jsonl_file.read_text(encoding="utf-8"), "")

    def test_write_and_load_worker_state_roundtrip(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            store = ConductorStateStore(tmp_dir)
            worker_state = store.make_worker_state(
                worker_name="alpha-run",
                lifecycle_state="running",
                updated_by="supervisor",
                run_id="run-123",
                workspace=".superturtle/subturtles/alpha-run",
                loop_type="yolo-codex",
                pid=12345,
                timeout_seconds=3600,
                cron_job_id="cron123",
                current_task="Implement the conductor state store",
                last_event_id="evt_abc123",
                last_event_at="2026-03-08T03:00:00Z",
                checkpoint={
                    "commit_sha": "deadbeef",
                    "backlog_done": 1,
                    "backlog_total": 4,
                },
                metadata={"source": "unit-test"},
                created_at="2026-03-08T02:55:00Z",
                updated_at="2026-03-08T03:00:00Z",
            )

            written = store.write_worker_state(worker_state)
            loaded = store.load_worker_state("alpha-run")

            self.assertEqual(loaded, written)
            self.assertEqual(loaded["schema_version"], CONDUCTOR_SCHEMA_VERSION)
            self.assertEqual(loaded["worker_name"], "alpha-run")
            self.assertEqual(loaded["lifecycle_state"], "running")
            self.assertEqual(loaded["checkpoint"]["commit_sha"], "deadbeef")
            self.assertEqual(loaded["metadata"]["source"], "unit-test")

    def test_append_event_writes_jsonl_entry(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            store = ConductorStateStore(tmp_dir)

            entry = store.append_event(
                worker_name="beta-run",
                event_type="worker.started",
                emitted_by="supervisor",
                run_id="run-456",
                lifecycle_state="running",
                payload={"pid": 999, "loop_type": "yolo"},
                event_id="evt_fixed",
                timestamp="2026-03-08T03:10:00Z",
                idempotency_key="start-beta-run",
            )

            lines = store.paths.events_jsonl_file.read_text(encoding="utf-8").strip().splitlines()
            self.assertEqual(len(lines), 1)
            parsed = json.loads(lines[0])
            self.assertEqual(parsed, entry)
            self.assertEqual(parsed["event_type"], "worker.started")
            self.assertEqual(parsed["worker_name"], "beta-run")
            self.assertEqual(parsed["emitted_by"], "supervisor")
            self.assertEqual(parsed["payload"]["pid"], 999)

    def test_write_and_update_wakeup(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            store = ConductorStateStore(tmp_dir)
            wakeup = store.make_wakeup(
                worker_name="gamma-run",
                category="notable",
                summary="gamma-run completed",
                reason_event_id="evt_done",
                run_id="run-789",
                wakeup_id="wake_fixed",
                payload={"kind": "completion"},
                metadata={"chat_id": 123},
                created_at="2026-03-08T03:15:00Z",
                updated_at="2026-03-08T03:15:00Z",
            )

            written = store.write_wakeup(wakeup)
            self.assertEqual(store.load_wakeup("wake_fixed"), written)

            updated = store.update_wakeup_delivery(
                wakeup_id="wake_fixed",
                delivery_state="sent",
                increment_attempts=True,
                last_attempt_at="2026-03-08T03:16:00Z",
                sent_at="2026-03-08T03:16:01Z",
            )

            self.assertEqual(updated["delivery_state"], "sent")
            self.assertEqual(updated["delivery"]["attempts"], 1)
            self.assertEqual(updated["delivery"]["sent_at"], "2026-03-08T03:16:01Z")
            self.assertEqual(len(store.list_wakeups("sent")), 1)

    def test_invalid_worker_name_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            store = ConductorStateStore(tmp_dir)
            with self.assertRaises(ValueError):
                store.make_worker_state(
                    worker_name="bad name",
                    lifecycle_state="running",
                    updated_by="supervisor",
                )


if __name__ == "__main__":
    unittest.main()
