"""Tests for conductor state GC — written BEFORE implementation (TDD).

Each test creates a temp state directory, populates it with fixture data,
runs gc_conductor_state(), and asserts what was deleted vs preserved.
"""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from super_turtle.state.conductor_state import ConductorStateStore
from super_turtle.state.conductor_gc import gc_conductor_state, GcResult

# --- Timestamps ---
# "Old" = 2026-03-01, "Recent" = 2026-03-15, cutoff at 7 days from 2026-03-18
OLD_TS = "2026-03-01T00:00:00Z"
RECENT_TS = "2026-03-15T00:00:00Z"
MAX_AGE_SECONDS = 7 * 86400  # 7 days


def _make_old_worker(store: ConductorStateStore, name: str, state: str, **kw):
    """Helper: create and persist a worker with an old timestamp."""
    w = store.make_worker_state(
        worker_name=name,
        lifecycle_state=state,
        updated_by="test",
        created_at=OLD_TS,
        updated_at=OLD_TS,
        **kw,
    )
    return store.write_worker_state(w)


def _make_recent_worker(store: ConductorStateStore, name: str, state: str, **kw):
    """Helper: create and persist a worker with a recent timestamp."""
    w = store.make_worker_state(
        worker_name=name,
        lifecycle_state=state,
        updated_by="test",
        created_at=RECENT_TS,
        updated_at=RECENT_TS,
        **kw,
    )
    return store.write_worker_state(w)


def _make_old_wakeup(
    store: ConductorStateStore,
    wakeup_id: str,
    worker_name: str,
    delivery_state: str,
    run_id: str | None = None,
):
    """Helper: create and persist a wakeup with an old timestamp."""
    w = store.make_wakeup(
        worker_name=worker_name,
        category="notable",
        summary=f"Test wakeup {wakeup_id}",
        wakeup_id=wakeup_id,
        delivery_state=delivery_state,
        run_id=run_id,
        created_at=OLD_TS,
        updated_at=OLD_TS,
    )
    return store.write_wakeup(w)


def _make_recent_wakeup(
    store: ConductorStateStore,
    wakeup_id: str,
    worker_name: str,
    delivery_state: str,
    run_id: str | None = None,
):
    """Helper: create and persist a wakeup with a recent timestamp."""
    w = store.make_wakeup(
        worker_name=worker_name,
        category="notable",
        summary=f"Test wakeup {wakeup_id}",
        wakeup_id=wakeup_id,
        delivery_state=delivery_state,
        run_id=run_id,
        created_at=RECENT_TS,
        updated_at=RECENT_TS,
    )
    return store.write_wakeup(w)


def _write_inbox_item(
    inbox_dir: Path,
    item_id: str,
    delivery_state: str,
    updated_at: str = OLD_TS,
    acknowledged_at: str | None = None,
):
    """Helper: write a raw inbox JSON file (inbox is TS-only, no Python API)."""
    inbox_dir.mkdir(parents=True, exist_ok=True)
    record = {
        "kind": "meta_agent_inbox_item",
        "schema_version": 1,
        "id": item_id,
        "worker_name": "test-worker",
        "priority": "normal",
        "category": "notable",
        "title": f"Test inbox {item_id}",
        "text": "Test content",
        "delivery_state": delivery_state,
        "created_at": OLD_TS,
        "updated_at": updated_at,
    }
    if acknowledged_at:
        record["delivery"] = {"acknowledged_at": acknowledged_at}
    (inbox_dir / f"{item_id}.json").write_text(
        json.dumps(record, sort_keys=True) + "\n", encoding="utf-8"
    )


def _write_event_line(events_path: Path, timestamp: str, worker_name: str = "w"):
    """Helper: append a single event line to events.jsonl."""
    entry = {
        "kind": "worker_event",
        "schema_version": 1,
        "id": f"evt_{timestamp[:10].replace('-', '')}",
        "timestamp": timestamp,
        "worker_name": worker_name,
        "event_type": "worker.checkpoint",
        "emitted_by": "subturtle",
    }
    with events_path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, sort_keys=True) + "\n")


def _write_run_line(runs_path: Path, timestamp: str, run_name: str = "r"):
    """Helper: append a single run line to runs.jsonl."""
    entry = {
        "timestamp": timestamp,
        "run_name": run_name,
        "event": "spawn",
    }
    with runs_path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, sort_keys=True) + "\n")


# ============================================================================
# Wakeup pruning tests (T1–T7)
# ============================================================================


class TestWakeupPruning(unittest.TestCase):
    """Wakeups in terminal delivery states are pruned after the retention window."""

    def test_t1_sent_wakeup_older_than_max_age_deleted(self):
        """T1: A sent wakeup older than max_age is deleted."""
        with tempfile.TemporaryDirectory() as tmp:
            store = ConductorStateStore(tmp)
            _make_old_wakeup(store, "wake_sent_old", "w1", "sent")

            result = gc_conductor_state(Path(tmp), MAX_AGE_SECONDS)

            self.assertIsNone(store.load_wakeup("wake_sent_old"))
            self.assertEqual(result.wakeups_pruned, 1)

    def test_t2_suppressed_wakeup_older_than_max_age_deleted(self):
        """T2: A suppressed wakeup older than max_age is deleted."""
        with tempfile.TemporaryDirectory() as tmp:
            store = ConductorStateStore(tmp)
            _make_old_wakeup(store, "wake_supp_old", "w1", "suppressed")

            result = gc_conductor_state(Path(tmp), MAX_AGE_SECONDS)

            self.assertIsNone(store.load_wakeup("wake_supp_old"))
            self.assertEqual(result.wakeups_pruned, 1)

    def test_t3_failed_wakeup_older_than_max_age_deleted(self):
        """T3: A failed wakeup older than max_age is deleted."""
        with tempfile.TemporaryDirectory() as tmp:
            store = ConductorStateStore(tmp)
            _make_old_wakeup(store, "wake_fail_old", "w1", "failed")

            result = gc_conductor_state(Path(tmp), MAX_AGE_SECONDS)

            self.assertIsNone(store.load_wakeup("wake_fail_old"))
            self.assertEqual(result.wakeups_pruned, 1)

    def test_t4_pending_wakeup_older_than_max_age_preserved(self):
        """T4: A pending wakeup is NEVER deleted, even if old. Safety: undelivered notifications."""
        with tempfile.TemporaryDirectory() as tmp:
            store = ConductorStateStore(tmp)
            _make_old_wakeup(store, "wake_pend_old", "w1", "pending")

            result = gc_conductor_state(Path(tmp), MAX_AGE_SECONDS)

            self.assertIsNotNone(store.load_wakeup("wake_pend_old"))
            self.assertEqual(result.wakeups_pruned, 0)

    def test_t5_processing_wakeup_older_than_max_age_preserved(self):
        """T5: A processing wakeup is NEVER deleted. Safety: startup recovery replays these."""
        with tempfile.TemporaryDirectory() as tmp:
            store = ConductorStateStore(tmp)
            _make_old_wakeup(store, "wake_proc_old", "w1", "processing")

            result = gc_conductor_state(Path(tmp), MAX_AGE_SECONDS)

            self.assertIsNotNone(store.load_wakeup("wake_proc_old"))
            self.assertEqual(result.wakeups_pruned, 0)

    def test_t6_sent_wakeup_newer_than_max_age_preserved(self):
        """T6: A sent wakeup within the retention window is preserved."""
        with tempfile.TemporaryDirectory() as tmp:
            store = ConductorStateStore(tmp)
            _make_recent_wakeup(store, "wake_sent_new", "w1", "sent")

            result = gc_conductor_state(Path(tmp), MAX_AGE_SECONDS)

            self.assertIsNotNone(store.load_wakeup("wake_sent_new"))
            self.assertEqual(result.wakeups_pruned, 0)

    def test_t7_sent_wakeup_for_active_run_id_preserved(self):
        """T7: A sent wakeup whose run_id matches a non-archived worker is preserved.
        Safety: run-aware filtering — don't prune wakeups for workers that might need recovery.
        """
        with tempfile.TemporaryDirectory() as tmp:
            store = ConductorStateStore(tmp)
            # Active worker with run_id="run-active"
            _make_recent_worker(store, "active-w", "running", run_id="run-active")
            # Old sent wakeup referencing the same run_id
            _make_old_wakeup(store, "wake_active_run", "active-w", "sent", run_id="run-active")

            result = gc_conductor_state(Path(tmp), MAX_AGE_SECONDS)

            self.assertIsNotNone(store.load_wakeup("wake_active_run"))
            self.assertEqual(result.wakeups_pruned, 0)


# ============================================================================
# Inbox pruning tests (T8–T12)
# ============================================================================


class TestInboxPruning(unittest.TestCase):
    """Inbox items in terminal delivery states are pruned after the retention window.
    Inbox is TypeScript-only — GC reads raw JSON files from inbox/ directory.
    """

    def test_t8_acknowledged_inbox_older_than_max_age_deleted(self):
        """T8: An acknowledged inbox item older than max_age is deleted."""
        with tempfile.TemporaryDirectory() as tmp:
            store = ConductorStateStore(tmp)
            inbox_dir = Path(tmp) / "inbox"
            _write_inbox_item(inbox_dir, "inbox_ack_old", "acknowledged", OLD_TS)

            result = gc_conductor_state(Path(tmp), MAX_AGE_SECONDS)

            self.assertFalse((inbox_dir / "inbox_ack_old.json").exists())
            self.assertEqual(result.inbox_pruned, 1)

    def test_t9_suppressed_inbox_older_than_max_age_deleted(self):
        """T9: A suppressed inbox item older than max_age is deleted."""
        with tempfile.TemporaryDirectory() as tmp:
            store = ConductorStateStore(tmp)
            inbox_dir = Path(tmp) / "inbox"
            _write_inbox_item(inbox_dir, "inbox_supp_old", "suppressed", OLD_TS)

            result = gc_conductor_state(Path(tmp), MAX_AGE_SECONDS)

            self.assertFalse((inbox_dir / "inbox_supp_old.json").exists())
            self.assertEqual(result.inbox_pruned, 1)

    def test_t10_pending_inbox_older_than_max_age_preserved(self):
        """T10: A pending inbox item is NEVER deleted. Safety: uninjected background context."""
        with tempfile.TemporaryDirectory() as tmp:
            store = ConductorStateStore(tmp)
            inbox_dir = Path(tmp) / "inbox"
            _write_inbox_item(inbox_dir, "inbox_pend_old", "pending", OLD_TS)

            result = gc_conductor_state(Path(tmp), MAX_AGE_SECONDS)

            self.assertTrue((inbox_dir / "inbox_pend_old.json").exists())
            self.assertEqual(result.inbox_pruned, 0)

    def test_t11_acknowledged_inbox_newer_than_max_age_preserved(self):
        """T11: An acknowledged inbox item within the retention window is preserved."""
        with tempfile.TemporaryDirectory() as tmp:
            store = ConductorStateStore(tmp)
            inbox_dir = Path(tmp) / "inbox"
            _write_inbox_item(inbox_dir, "inbox_ack_new", "acknowledged", RECENT_TS)

            result = gc_conductor_state(Path(tmp), MAX_AGE_SECONDS)

            self.assertTrue((inbox_dir / "inbox_ack_new.json").exists())
            self.assertEqual(result.inbox_pruned, 0)

    def test_t12_uses_acknowledged_at_over_updated_at(self):
        """T12: When delivery.acknowledged_at exists, GC uses it for age — not updated_at.

        Context: A record might have a recent updated_at (from a retry or metadata update)
        but an old acknowledged_at (the actual acknowledgment happened long ago). The GC
        should use the most precise timestamp: acknowledged_at.
        """
        with tempfile.TemporaryDirectory() as tmp:
            store = ConductorStateStore(tmp)
            inbox_dir = Path(tmp) / "inbox"
            # updated_at is recent, but acknowledged_at is old — should be pruned
            _write_inbox_item(
                inbox_dir,
                "inbox_ack_ts",
                "acknowledged",
                updated_at=RECENT_TS,
                acknowledged_at=OLD_TS,
            )

            result = gc_conductor_state(Path(tmp), MAX_AGE_SECONDS)

            self.assertFalse((inbox_dir / "inbox_ack_ts.json").exists())
            self.assertEqual(result.inbox_pruned, 1)


# ============================================================================
# Worker pruning tests (T13–T19)
# ============================================================================


class TestWorkerPruning(unittest.TestCase):
    """Only 'archived' workers are eligible for GC per the CLAUDE.md backlog:
    'stale archived worker records'. Other terminal states are preserved.
    """

    def test_t13_archived_worker_no_wakeups_old_deleted(self):
        """T13: An archived worker older than max_age with no pending wakeups is deleted."""
        with tempfile.TemporaryDirectory() as tmp:
            store = ConductorStateStore(tmp)
            _make_old_worker(store, "arch-old", "archived", run_id="run-done")

            result = gc_conductor_state(Path(tmp), MAX_AGE_SECONDS)

            self.assertIsNone(store.load_worker_state("arch-old"))
            self.assertEqual(result.workers_pruned, 1)

    def test_t14_archived_worker_with_pending_wakeup_preserved(self):
        """T14: An archived worker is preserved if it has pending wakeups.
        Safety: worker stays until all wakeups are delivered.
        """
        with tempfile.TemporaryDirectory() as tmp:
            store = ConductorStateStore(tmp)
            _make_old_worker(store, "arch-pend", "archived", run_id="run-pend")
            _make_old_wakeup(store, "wake_pend", "arch-pend", "pending", run_id="run-pend")

            result = gc_conductor_state(Path(tmp), MAX_AGE_SECONDS)

            self.assertIsNotNone(store.load_worker_state("arch-pend"))
            self.assertEqual(result.workers_pruned, 0)

    def test_t15_archived_worker_recent_preserved(self):
        """T15: An archived worker within the retention window is preserved."""
        with tempfile.TemporaryDirectory() as tmp:
            store = ConductorStateStore(tmp)
            _make_recent_worker(store, "arch-new", "archived")

            result = gc_conductor_state(Path(tmp), MAX_AGE_SECONDS)

            self.assertIsNotNone(store.load_worker_state("arch-new"))
            self.assertEqual(result.workers_pruned, 0)

    def test_t16_completed_worker_old_preserved(self):
        """T16: A completed worker is NEVER GC'd — only archived workers are.
        Safety: completed workers may still need supervisor reconciliation.
        """
        with tempfile.TemporaryDirectory() as tmp:
            store = ConductorStateStore(tmp)
            _make_old_worker(store, "comp-old", "completed")

            result = gc_conductor_state(Path(tmp), MAX_AGE_SECONDS)

            self.assertIsNotNone(store.load_worker_state("comp-old"))
            self.assertEqual(result.workers_pruned, 0)

    def test_t17_failed_worker_old_preserved(self):
        """T17: A failed worker is NEVER GC'd — only archived workers are."""
        with tempfile.TemporaryDirectory() as tmp:
            store = ConductorStateStore(tmp)
            _make_old_worker(store, "fail-old", "failed")

            result = gc_conductor_state(Path(tmp), MAX_AGE_SECONDS)

            self.assertIsNotNone(store.load_worker_state("fail-old"))
            self.assertEqual(result.workers_pruned, 0)

    def test_t18_running_worker_old_preserved(self):
        """T18: A running worker is NEVER deleted. Safety: active worker state."""
        with tempfile.TemporaryDirectory() as tmp:
            store = ConductorStateStore(tmp)
            _make_old_worker(store, "run-old", "running")

            result = gc_conductor_state(Path(tmp), MAX_AGE_SECONDS)

            self.assertIsNotNone(store.load_worker_state("run-old"))
            self.assertEqual(result.workers_pruned, 0)

    def test_t19_archived_worker_with_active_run_id_preserved(self):
        """T19: An archived worker whose run_id matches a non-archived worker is preserved.
        Edge case: reused worker name — old run_id collides with an active worker's run_id.
        """
        with tempfile.TemporaryDirectory() as tmp:
            store = ConductorStateStore(tmp)
            # Active worker sharing the same run_id
            _make_recent_worker(store, "active-w2", "running", run_id="shared-run")
            # Old archived worker with the same run_id
            _make_old_worker(store, "arch-shared", "archived", run_id="shared-run")

            result = gc_conductor_state(Path(tmp), MAX_AGE_SECONDS)

            self.assertIsNotNone(store.load_worker_state("arch-shared"))
            self.assertEqual(result.workers_pruned, 0)


# ============================================================================
# Events/runs rotation tests (T20–T25)
# ============================================================================


class TestLogRotation(unittest.TestCase):
    """events.jsonl and runs.jsonl are rotated: old lines move to .1 archive,
    recent lines stay in the main file. The file itself is never deleted.
    """

    def test_t20_old_events_archived_to_events_jsonl_1(self):
        """T20: Old event lines are moved to events.jsonl.1."""
        with tempfile.TemporaryDirectory() as tmp:
            store = ConductorStateStore(tmp)
            _write_event_line(store.paths.events_jsonl_file, OLD_TS, "w1")
            _write_event_line(store.paths.events_jsonl_file, RECENT_TS, "w2")

            result = gc_conductor_state(Path(tmp), MAX_AGE_SECONDS)

            archive = Path(tmp) / "events.jsonl.1"
            self.assertTrue(archive.exists())
            archived_lines = archive.read_text(encoding="utf-8").strip().splitlines()
            self.assertEqual(len(archived_lines), 1)
            self.assertIn(OLD_TS, archived_lines[0])
            self.assertEqual(result.events_archived, 1)

    def test_t21_recent_events_kept_in_events_jsonl(self):
        """T21: Recent event lines remain in the main events.jsonl file."""
        with tempfile.TemporaryDirectory() as tmp:
            store = ConductorStateStore(tmp)
            _write_event_line(store.paths.events_jsonl_file, OLD_TS, "w1")
            _write_event_line(store.paths.events_jsonl_file, RECENT_TS, "w2")

            gc_conductor_state(Path(tmp), MAX_AGE_SECONDS)

            main_lines = store.paths.events_jsonl_file.read_text(encoding="utf-8").strip().splitlines()
            self.assertEqual(len(main_lines), 1)
            self.assertIn(RECENT_TS, main_lines[0])

    def test_t22_empty_events_jsonl_noop(self):
        """T22: Empty events.jsonl → no-op, no crash, no archive created."""
        with tempfile.TemporaryDirectory() as tmp:
            store = ConductorStateStore(tmp)
            # events.jsonl exists but is empty (created by ensure_conductor_state_paths)

            result = gc_conductor_state(Path(tmp), MAX_AGE_SECONDS)

            archive = Path(tmp) / "events.jsonl.1"
            self.assertFalse(archive.exists())
            self.assertEqual(result.events_archived, 0)

    def test_t23_all_events_old_events_jsonl_empty(self):
        """T23: When all events are old, events.jsonl becomes empty, all go to archive."""
        with tempfile.TemporaryDirectory() as tmp:
            store = ConductorStateStore(tmp)
            _write_event_line(store.paths.events_jsonl_file, OLD_TS, "w1")
            _write_event_line(store.paths.events_jsonl_file, "2026-03-02T00:00:00Z", "w2")

            result = gc_conductor_state(Path(tmp), MAX_AGE_SECONDS)

            main_text = store.paths.events_jsonl_file.read_text(encoding="utf-8")
            self.assertEqual(main_text.strip(), "")
            archive = Path(tmp) / "events.jsonl.1"
            archived_lines = archive.read_text(encoding="utf-8").strip().splitlines()
            self.assertEqual(len(archived_lines), 2)
            self.assertEqual(result.events_archived, 2)

    def test_t24_existing_archive_appended_not_overwritten(self):
        """T24: Running GC twice appends to existing archive, doesn't overwrite."""
        with tempfile.TemporaryDirectory() as tmp:
            store = ConductorStateStore(tmp)
            archive = Path(tmp) / "events.jsonl.1"
            # Pre-existing archive with 1 line
            archive.write_text(
                json.dumps({"timestamp": "2026-02-20T00:00:00Z", "pre_existing": True}) + "\n",
                encoding="utf-8",
            )
            _write_event_line(store.paths.events_jsonl_file, OLD_TS, "w1")

            gc_conductor_state(Path(tmp), MAX_AGE_SECONDS)

            archived_lines = archive.read_text(encoding="utf-8").strip().splitlines()
            self.assertEqual(len(archived_lines), 2)
            self.assertIn("pre_existing", archived_lines[0])

    def test_t25_runs_jsonl_rotated_same_as_events(self):
        """T25: runs.jsonl is rotated with the same logic as events.jsonl."""
        with tempfile.TemporaryDirectory() as tmp:
            store = ConductorStateStore(tmp)
            _write_run_line(store.paths.runs_jsonl_file, OLD_TS, "old-run")
            _write_run_line(store.paths.runs_jsonl_file, RECENT_TS, "new-run")

            result = gc_conductor_state(Path(tmp), MAX_AGE_SECONDS)

            runs_archive = Path(tmp) / "runs.jsonl.1"
            self.assertTrue(runs_archive.exists())
            archived_lines = runs_archive.read_text(encoding="utf-8").strip().splitlines()
            self.assertEqual(len(archived_lines), 1)
            self.assertIn(OLD_TS, archived_lines[0])
            main_lines = store.paths.runs_jsonl_file.read_text(encoding="utf-8").strip().splitlines()
            self.assertEqual(len(main_lines), 1)
            self.assertIn(RECENT_TS, main_lines[0])
            self.assertEqual(result.runs_archived, 1)


# ============================================================================
# Integration tests (T26–T31)
# ============================================================================


class TestIntegration(unittest.TestCase):
    """End-to-end GC passes covering mixed state, dry run, edge cases."""

    def test_t26_full_gc_on_mixed_state(self):
        """T26: Full GC pass with a realistic mix of state — correct pruning decisions."""
        with tempfile.TemporaryDirectory() as tmp:
            store = ConductorStateStore(tmp)
            inbox_dir = Path(tmp) / "inbox"

            # Workers: 1 archived old (prune), 1 running (keep), 1 completed old (keep)
            _make_old_worker(store, "w-arch", "archived", run_id="run-arch")
            _make_old_worker(store, "w-run", "running", run_id="run-active")
            _make_old_worker(store, "w-comp", "completed", run_id="run-comp")

            # Wakeups: 1 sent old (prune), 1 pending old (keep), 1 sent for active run (keep)
            _make_old_wakeup(store, "wake_prune", "w-arch", "sent", run_id="run-arch")
            _make_old_wakeup(store, "wake_keep_pend", "w-run", "pending", run_id="run-active")
            _make_old_wakeup(store, "wake_keep_run", "w-run", "sent", run_id="run-active")

            # Inbox: 1 acknowledged old (prune), 1 pending (keep)
            _write_inbox_item(inbox_dir, "inbox_prune", "acknowledged", OLD_TS)
            _write_inbox_item(inbox_dir, "inbox_keep", "pending", OLD_TS)

            # Events: 1 old (archive), 1 recent (keep)
            _write_event_line(store.paths.events_jsonl_file, OLD_TS)
            _write_event_line(store.paths.events_jsonl_file, RECENT_TS)

            result = gc_conductor_state(Path(tmp), MAX_AGE_SECONDS)

            # Wakeups
            self.assertIsNone(store.load_wakeup("wake_prune"))
            self.assertIsNotNone(store.load_wakeup("wake_keep_pend"))
            self.assertIsNotNone(store.load_wakeup("wake_keep_run"))
            self.assertEqual(result.wakeups_pruned, 1)

            # Inbox
            self.assertFalse((inbox_dir / "inbox_prune.json").exists())
            self.assertTrue((inbox_dir / "inbox_keep.json").exists())
            self.assertEqual(result.inbox_pruned, 1)

            # Workers
            self.assertIsNone(store.load_worker_state("w-arch"))
            self.assertIsNotNone(store.load_worker_state("w-run"))
            self.assertIsNotNone(store.load_worker_state("w-comp"))
            self.assertEqual(result.workers_pruned, 1)

            # Events
            self.assertEqual(result.events_archived, 1)

    def test_t27_dry_run_deletes_nothing(self):
        """T27: Dry run reports counts but deletes nothing."""
        with tempfile.TemporaryDirectory() as tmp:
            store = ConductorStateStore(tmp)
            inbox_dir = Path(tmp) / "inbox"

            _make_old_worker(store, "w-arch-dry", "archived")
            _make_old_wakeup(store, "wake_dry", "w-arch-dry", "sent")
            _write_inbox_item(inbox_dir, "inbox_dry", "acknowledged", OLD_TS)
            _write_event_line(store.paths.events_jsonl_file, OLD_TS)

            result = gc_conductor_state(Path(tmp), MAX_AGE_SECONDS, dry_run=True)

            # Nothing deleted
            self.assertIsNotNone(store.load_wakeup("wake_dry"))
            self.assertTrue((inbox_dir / "inbox_dry.json").exists())
            self.assertIsNotNone(store.load_worker_state("w-arch-dry"))
            events_text = store.paths.events_jsonl_file.read_text(encoding="utf-8")
            self.assertTrue(events_text.strip())

            # But counts are reported
            self.assertTrue(result.dry_run)
            self.assertGreater(result.wakeups_pruned, 0)
            self.assertGreater(result.inbox_pruned, 0)
            self.assertGreater(result.workers_pruned, 0)
            self.assertGreater(result.events_archived, 0)

    def test_t28_empty_state_dir_noop(self):
        """T28: GC on a freshly initialized state dir → no-op, no crash."""
        with tempfile.TemporaryDirectory() as tmp:
            store = ConductorStateStore(tmp)

            result = gc_conductor_state(Path(tmp), MAX_AGE_SECONDS)

            self.assertEqual(result.wakeups_pruned, 0)
            self.assertEqual(result.inbox_pruned, 0)
            self.assertEqual(result.workers_pruned, 0)
            self.assertEqual(result.events_archived, 0)
            self.assertEqual(result.runs_archived, 0)

    def test_t29_gc_idempotent(self):
        """T29: Running GC twice gives the same result — second pass is a no-op."""
        with tempfile.TemporaryDirectory() as tmp:
            store = ConductorStateStore(tmp)
            inbox_dir = Path(tmp) / "inbox"

            _make_old_worker(store, "w-idem", "archived")
            _make_old_wakeup(store, "wake_idem", "w-idem", "sent")
            _write_inbox_item(inbox_dir, "inbox_idem", "acknowledged", OLD_TS)
            _write_event_line(store.paths.events_jsonl_file, OLD_TS)

            first = gc_conductor_state(Path(tmp), MAX_AGE_SECONDS)
            second = gc_conductor_state(Path(tmp), MAX_AGE_SECONDS)

            self.assertGreater(first.wakeups_pruned, 0)
            self.assertEqual(second.wakeups_pruned, 0)
            self.assertEqual(second.inbox_pruned, 0)
            self.assertEqual(second.workers_pruned, 0)
            self.assertEqual(second.events_archived, 0)

    def test_t30_malformed_json_skipped(self):
        """T30: Malformed JSON files in wakeups/inbox/workers are skipped, not crashed on."""
        with tempfile.TemporaryDirectory() as tmp:
            store = ConductorStateStore(tmp)
            inbox_dir = Path(tmp) / "inbox"
            inbox_dir.mkdir(parents=True, exist_ok=True)

            # Write garbage into each directory
            (store.paths.wakeups_dir / "bad_wakeup.json").write_text("{{{bad json", encoding="utf-8")
            (store.paths.workers_dir / "bad_worker.json").write_text("not json", encoding="utf-8")
            (inbox_dir / "bad_inbox.json").write_text("[1,2,3]", encoding="utf-8")

            # Also write a valid old wakeup to prove GC still runs
            _make_old_wakeup(store, "wake_valid", "w1", "sent")

            result = gc_conductor_state(Path(tmp), MAX_AGE_SECONDS)

            # The valid wakeup was still pruned
            self.assertIsNone(store.load_wakeup("wake_valid"))
            self.assertEqual(result.wakeups_pruned, 1)

    def test_t31_missing_inbox_dir_noop(self):
        """T31: If inbox/ directory doesn't exist, GC skips inbox pruning gracefully.
        Context: ConductorStateStore doesn't create inbox/ (it's TS-only).
        """
        with tempfile.TemporaryDirectory() as tmp:
            store = ConductorStateStore(tmp)
            inbox_dir = Path(tmp) / "inbox"
            self.assertFalse(inbox_dir.exists())

            result = gc_conductor_state(Path(tmp), MAX_AGE_SECONDS)

            self.assertEqual(result.inbox_pruned, 0)

    def test_t32_timestamp_normalization_resilience(self):
        """T32: GC handles different ISO8601 UTC formats (Z vs +00:00).
        Context: Different tools might write UTC in different ways. The GC should
        be lexicographically resilient if possible or handle normalization.
        """
        with tempfile.TemporaryDirectory() as tmp:
            store = ConductorStateStore(tmp)
            inbox_dir = Path(tmp) / "inbox"
            # Using +00:00 instead of Z.
            # Lexicographically, "2026-03-01T00:00:00+00:00" < "2026-03-11T..."
            _write_inbox_item(
                inbox_dir, "inbox_alt_tz", "acknowledged", 
                updated_at="2026-03-01T00:00:00+00:00"
            )

            result = gc_conductor_state(Path(tmp), MAX_AGE_SECONDS)

            self.assertFalse((inbox_dir / "inbox_alt_tz.json").exists())
            self.assertEqual(result.inbox_pruned, 1)

    def test_t33_atomic_rotation_safety(self):
        """T33: Rotation should be atomic. If the process is interrupted, 
        we shouldn't lose the main log file or leave it in a corrupted state.
        Implementation check: Uses replace() which is atomic on Unix.
        """
        with tempfile.TemporaryDirectory() as tmp:
            store = ConductorStateStore(tmp)
            events_path = store.paths.events_jsonl_file
            _write_event_line(events_path, OLD_TS, "w1")
            _write_event_line(events_path, RECENT_TS, "w2")

            # We can't easily "interrupt" it, but we can verify the 
            # post-condition is exactly as expected.
            gc_conductor_state(Path(tmp), MAX_AGE_SECONDS)

            self.assertTrue(events_path.exists())
            lines = events_path.read_text(encoding="utf-8").strip().splitlines()
            self.assertEqual(len(lines), 1)
            self.assertIn(RECENT_TS, lines[0])


if __name__ == "__main__":
    unittest.main()
