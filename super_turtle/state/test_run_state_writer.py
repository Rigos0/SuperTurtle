from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from super_turtle.state.run_state_writer import (
    DEFAULT_HANDOFF_NOTE,
    RunStateWriter,
    ensure_state_files,
    main,
)


class RunStateWriterTests(unittest.TestCase):
    def test_ensure_state_files_creates_defaults(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            runs_jsonl_file, handoff_md_file = ensure_state_files(tmp_dir)

            self.assertTrue(runs_jsonl_file.exists())
            self.assertTrue(handoff_md_file.exists())
            self.assertEqual(runs_jsonl_file.read_text(encoding="utf-8"), "")

            handoff_content = handoff_md_file.read_text(encoding="utf-8")
            self.assertIn("# SubTurtle Long-Run Handoff", handoff_content)
            self.assertIn("Last updated: not yet", handoff_content)
            self.assertIn(f"- {DEFAULT_HANDOFF_NOTE}", handoff_content)

    def test_append_event_writes_jsonl_entry(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            writer = RunStateWriter(tmp_dir)
            expected_payload = {"source": "unit-test", "count": 1}

            entry = writer.append_event(
                run_name="long-run-alpha",
                event="spawn",
                status="running",
                payload=expected_payload,
            )

            lines = writer.runs_jsonl_file.read_text(encoding="utf-8").strip().splitlines()
            self.assertEqual(len(lines), 1)

            parsed_line = json.loads(lines[0])
            self.assertEqual(parsed_line, entry)
            self.assertEqual(parsed_line["run_name"], "long-run-alpha")
            self.assertEqual(parsed_line["event"], "spawn")
            self.assertEqual(parsed_line["status"], "running")
            self.assertEqual(parsed_line["payload"], expected_payload)
            self.assertTrue(parsed_line["timestamp"].endswith("Z"))

    def test_update_handoff_writes_sections(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            writer = RunStateWriter(tmp_dir)
            writer.update_handoff(
                active_runs=["long-run-alpha (last event: spawn at 2026-02-27T00:00:00Z)"],
                recent_milestones=["long-run-alpha: completion (done) at 2026-02-27T01:00:00Z"],
                notes=["Auto-refreshed by test."],
                updated_at="2026-02-27T02:00:00Z",
            )

            handoff_content = writer.handoff_md_file.read_text(encoding="utf-8")
            self.assertIn("Last updated: 2026-02-27T02:00:00Z", handoff_content)
            self.assertIn("- long-run-alpha (last event: spawn at 2026-02-27T00:00:00Z)", handoff_content)
            self.assertIn("- long-run-alpha: completion (done) at 2026-02-27T01:00:00Z", handoff_content)
            self.assertIn("- Auto-refreshed by test.", handoff_content)

    def test_cli_commands_smoke(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            self.assertEqual(
                main(
                    [
                        "--state-dir",
                        tmp_dir,
                        "append",
                        "--run-name",
                        "long-run-beta",
                        "--event",
                        "milestone",
                        "--status",
                        "done",
                        "--payload-json",
                        '{"step":"smoke"}',
                    ]
                ),
                0,
            )
            self.assertEqual(
                main(
                    [
                        "--state-dir",
                        tmp_dir,
                        "update-handoff",
                        "--active-run",
                        "long-run-beta (last event: milestone at 2026-02-27T03:00:00Z)",
                        "--milestone",
                        "long-run-beta: milestone (done) at 2026-02-27T03:00:00Z",
                    ]
                ),
                0,
            )

            runs_jsonl_file = Path(tmp_dir) / "runs.jsonl"
            handoff_md_file = Path(tmp_dir) / "handoff.md"

            self.assertTrue(runs_jsonl_file.exists())
            self.assertTrue(handoff_md_file.exists())
            self.assertIn("long-run-beta", runs_jsonl_file.read_text(encoding="utf-8"))
            self.assertIn("long-run-beta", handoff_md_file.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
