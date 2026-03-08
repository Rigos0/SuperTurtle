from __future__ import annotations

import argparse
import json
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping, Sequence

from super_turtle.state.conductor_state import ConductorStateStore

DEFAULT_HANDOFF_NOTE = "This summary is refreshed by supervision flows."


def _utc_now_iso() -> str:
    return (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def render_handoff(
    *,
    updated_at: str,
    active_runs: Sequence[str],
    recent_milestones: Sequence[str],
    notes: Sequence[str] | None = None,
) -> str:
    lines: list[str] = [
        "# SubTurtle Long-Run Handoff",
        "",
        f"Last updated: {updated_at}",
        "",
        "## Active Runs",
    ]

    if active_runs:
        lines.extend(f"- {item}" for item in active_runs)
    else:
        lines.append("- None yet.")

    lines.extend(["", "## Recent Milestones"])
    if recent_milestones:
        lines.extend(f"- {item}" for item in recent_milestones)
    else:
        lines.append("- None yet.")

    lines.extend(["", "## Notes"])
    notes_list = list(notes or [DEFAULT_HANDOFF_NOTE])
    lines.extend(f"- {item}" for item in notes_list)
    lines.append("")
    return "\n".join(lines)


def _atomic_write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        "w", encoding="utf-8", delete=False, dir=path.parent
    ) as tmp_file:
        tmp_file.write(content)
        tmp_path = Path(tmp_file.name)
    tmp_path.replace(path)


def ensure_state_files(state_dir: str | Path) -> tuple[Path, Path]:
    base_dir = Path(state_dir)
    base_dir.mkdir(parents=True, exist_ok=True)

    runs_jsonl_file = base_dir / "runs.jsonl"
    handoff_md_file = base_dir / "handoff.md"

    runs_jsonl_file.touch(exist_ok=True)
    if not handoff_md_file.exists():
        handoff_md_file.write_text(
            render_handoff(
                updated_at="not yet",
                active_runs=[],
                recent_milestones=[],
                notes=[DEFAULT_HANDOFF_NOTE],
            ),
            encoding="utf-8",
        )

    return runs_jsonl_file, handoff_md_file


class RunStateWriter:
    def __init__(self, state_dir: str | Path):
        self.state_dir = Path(state_dir)
        runs_jsonl_file, handoff_md_file = ensure_state_files(self.state_dir)
        self.runs_jsonl_file = runs_jsonl_file
        self.handoff_md_file = handoff_md_file

    def append_event(
        self,
        *,
        run_name: str,
        event: str,
        status: str | None = None,
        payload: Mapping[str, Any] | None = None,
    ) -> dict[str, Any]:
        run_name = run_name.strip()
        event = event.strip()
        if not run_name:
            raise ValueError("run_name must not be empty")
        if not event:
            raise ValueError("event must not be empty")

        entry: dict[str, Any] = {
            "timestamp": _utc_now_iso(),
            "run_name": run_name,
            "event": event,
        }
        if status:
            entry["status"] = status
        if payload:
            entry["payload"] = dict(payload)

        with self.runs_jsonl_file.open("a", encoding="utf-8") as jsonl_file:
            jsonl_file.write(json.dumps(entry, sort_keys=True) + "\n")
        return entry

    def update_handoff(
        self,
        *,
        active_runs: Sequence[str],
        recent_milestones: Sequence[str],
        notes: Sequence[str] | None = None,
        updated_at: str | None = None,
    ) -> str:
        content = render_handoff(
            updated_at=updated_at or _utc_now_iso(),
            active_runs=active_runs,
            recent_milestones=recent_milestones,
            notes=notes,
        )
        _atomic_write_text(self.handoff_md_file, content)
        return content


def _load_json_object(raw_payload: str | None, *, arg_name: str) -> dict[str, Any] | None:
    if raw_payload is None:
        return None

    loaded = json.loads(raw_payload)
    if not isinstance(loaded, dict):
        raise ValueError(f"{arg_name} must decode to a JSON object")
    return loaded


def _load_payload(raw_payload: str | None) -> dict[str, Any] | None:
    return _load_json_object(raw_payload, arg_name="--payload-json")


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="run_state_writer",
        description="Append run events and update handoff summaries.",
    )
    parser.add_argument(
        "--state-dir",
        default="super_turtle/state",
        help="Directory containing runs.jsonl and handoff.md.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    append_parser = subparsers.add_parser("append", help="Append a JSONL run event.")
    append_parser.add_argument("--run-name", required=True, help="SubTurtle run name.")
    append_parser.add_argument("--event", required=True, help="Event type (spawn, stop, milestone, ...).")
    append_parser.add_argument("--status", default=None, help="Optional run status.")
    append_parser.add_argument(
        "--payload-json",
        default=None,
        help="Optional JSON object payload to attach to the event.",
    )

    handoff_parser = subparsers.add_parser(
        "update-handoff",
        help="Rewrite handoff.md with the latest summary.",
    )
    handoff_parser.add_argument(
        "--active-run",
        action="append",
        default=[],
        help="Add one active run line (repeatable).",
    )
    handoff_parser.add_argument(
        "--milestone",
        action="append",
        default=[],
        help="Add one milestone line (repeatable).",
    )
    handoff_parser.add_argument(
        "--note",
        action="append",
        default=[],
        help="Add one notes line (repeatable).",
    )
    handoff_parser.add_argument(
        "--updated-at",
        default=None,
        help="Override timestamp string (defaults to current UTC).",
    )

    worker_parser = subparsers.add_parser(
        "put-worker",
        help="Write canonical worker state under workers/<name>.json.",
    )
    worker_parser.add_argument("--worker-name", required=True, help="Worker name.")
    worker_parser.add_argument(
        "--lifecycle-state",
        required=True,
        help="Canonical worker lifecycle state.",
    )
    worker_parser.add_argument(
        "--updated-by",
        required=True,
        help="Subsystem writing this state record.",
    )
    worker_parser.add_argument("--run-id", default=None, help="Optional run id.")
    worker_parser.add_argument("--workspace", default=None, help="Workspace path.")
    worker_parser.add_argument("--loop-type", default=None, help="Loop type.")
    worker_parser.add_argument("--pid", type=int, default=None, help="Optional PID.")
    worker_parser.add_argument(
        "--timeout-seconds",
        type=int,
        default=None,
        help="Worker timeout in seconds.",
    )
    worker_parser.add_argument("--cron-job-id", default=None, help="Recurring cron job id.")
    worker_parser.add_argument("--current-task", default=None, help="Current task summary.")
    worker_parser.add_argument("--stop-reason", default=None, help="Optional stop reason.")
    worker_parser.add_argument(
        "--completion-requested-at",
        default=None,
        help="Completion request timestamp.",
    )
    worker_parser.add_argument(
        "--terminal-at",
        default=None,
        help="Terminal-state timestamp.",
    )
    worker_parser.add_argument("--last-event-id", default=None, help="Last event id.")
    worker_parser.add_argument("--last-event-at", default=None, help="Last event timestamp.")
    worker_parser.add_argument(
        "--checkpoint-json",
        default=None,
        help="Optional checkpoint JSON object.",
    )
    worker_parser.add_argument(
        "--metadata-json",
        default=None,
        help="Optional metadata JSON object.",
    )
    worker_parser.add_argument("--created-at", default=None, help="Creation timestamp.")
    worker_parser.add_argument("--updated-at", default=None, help="Update timestamp.")

    event_parser = subparsers.add_parser(
        "append-conductor-event",
        help="Append a canonical worker event to events.jsonl.",
    )
    event_parser.add_argument("--worker-name", required=True, help="Worker name.")
    event_parser.add_argument("--event-type", required=True, help="Canonical event type.")
    event_parser.add_argument(
        "--emitted-by",
        required=True,
        help="Subsystem that emitted the event.",
    )
    event_parser.add_argument("--run-id", default=None, help="Optional run id.")
    event_parser.add_argument(
        "--lifecycle-state",
        default=None,
        help="Optional lifecycle state snapshot.",
    )
    event_parser.add_argument(
        "--payload-json",
        default=None,
        help="Optional event payload JSON object.",
    )
    event_parser.add_argument("--event-id", default=None, help="Optional explicit event id.")
    event_parser.add_argument("--timestamp", default=None, help="Optional event timestamp.")
    event_parser.add_argument(
        "--idempotency-key",
        default=None,
        help="Optional idempotency key.",
    )

    wakeup_parser = subparsers.add_parser(
        "enqueue-wakeup",
        help="Write a durable wake-up record under wakeups/<id>.json.",
    )
    wakeup_parser.add_argument("--worker-name", required=True, help="Worker name.")
    wakeup_parser.add_argument(
        "--category",
        required=True,
        help="Wake-up delivery category.",
    )
    wakeup_parser.add_argument(
        "--summary",
        required=True,
        help="Short wake-up summary.",
    )
    wakeup_parser.add_argument(
        "--reason-event-id",
        default=None,
        help="Event id that triggered this wake-up.",
    )
    wakeup_parser.add_argument("--run-id", default=None, help="Optional run id.")
    wakeup_parser.add_argument("--wakeup-id", default=None, help="Optional explicit wake-up id.")
    wakeup_parser.add_argument(
        "--delivery-state",
        default="pending",
        help="Initial delivery state.",
    )
    wakeup_parser.add_argument(
        "--payload-json",
        default=None,
        help="Optional wake-up payload JSON object.",
    )
    wakeup_parser.add_argument(
        "--metadata-json",
        default=None,
        help="Optional wake-up metadata JSON object.",
    )
    wakeup_parser.add_argument("--created-at", default=None, help="Creation timestamp.")
    wakeup_parser.add_argument("--updated-at", default=None, help="Update timestamp.")

    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    writer = RunStateWriter(args.state_dir)

    if args.command == "append":
        payload = _load_payload(args.payload_json)
        entry = writer.append_event(
            run_name=args.run_name,
            event=args.event,
            status=args.status,
            payload=payload,
        )
        print(json.dumps(entry, sort_keys=True))
        return 0

    if args.command == "update-handoff":
        notes: list[str] | None = args.note if args.note else None
        writer.update_handoff(
            active_runs=args.active_run,
            recent_milestones=args.milestone,
            notes=notes,
            updated_at=args.updated_at,
        )
        print(str(writer.handoff_md_file))
        return 0

    conductor = ConductorStateStore(args.state_dir)

    if args.command == "put-worker":
        checkpoint = _load_json_object(
            args.checkpoint_json, arg_name="--checkpoint-json"
        )
        metadata = _load_json_object(args.metadata_json, arg_name="--metadata-json")
        existing = conductor.load_worker_state(args.worker_name) or {}
        state = conductor.make_worker_state(
            worker_name=args.worker_name,
            lifecycle_state=args.lifecycle_state,
            updated_by=args.updated_by,
            run_id=args.run_id if args.run_id is not None else existing.get("run_id"),
            workspace=(
                args.workspace if args.workspace is not None else existing.get("workspace")
            ),
            loop_type=(
                args.loop_type if args.loop_type is not None else existing.get("loop_type")
            ),
            pid=args.pid if args.pid is not None else existing.get("pid"),
            timeout_seconds=(
                args.timeout_seconds
                if args.timeout_seconds is not None
                else existing.get("timeout_seconds")
            ),
            cron_job_id=(
                args.cron_job_id
                if args.cron_job_id is not None
                else existing.get("cron_job_id")
            ),
            current_task=(
                args.current_task
                if args.current_task is not None
                else existing.get("current_task")
            ),
            stop_reason=(
                args.stop_reason
                if args.stop_reason is not None
                else existing.get("stop_reason")
            ),
            completion_requested_at=(
                args.completion_requested_at
                if args.completion_requested_at is not None
                else existing.get("completion_requested_at")
            ),
            terminal_at=(
                args.terminal_at
                if args.terminal_at is not None
                else existing.get("terminal_at")
            ),
            last_event_id=(
                args.last_event_id
                if args.last_event_id is not None
                else existing.get("last_event_id")
            ),
            last_event_at=(
                args.last_event_at
                if args.last_event_at is not None
                else existing.get("last_event_at")
            ),
            checkpoint=checkpoint if checkpoint is not None else existing.get("checkpoint"),
            metadata=metadata if metadata is not None else existing.get("metadata"),
            created_at=args.created_at if args.created_at is not None else existing.get("created_at"),
            updated_at=args.updated_at,
        )
        written = conductor.write_worker_state(state)
        print(json.dumps(written, sort_keys=True))
        return 0

    if args.command == "append-conductor-event":
        payload = _load_payload(args.payload_json)
        entry = conductor.append_event(
            worker_name=args.worker_name,
            event_type=args.event_type,
            emitted_by=args.emitted_by,
            run_id=args.run_id,
            lifecycle_state=args.lifecycle_state,
            payload=payload,
            event_id=args.event_id,
            timestamp=args.timestamp,
            idempotency_key=args.idempotency_key,
        )
        print(json.dumps(entry, sort_keys=True))
        return 0

    if args.command == "enqueue-wakeup":
        payload = _load_payload(args.payload_json)
        metadata = _load_json_object(args.metadata_json, arg_name="--metadata-json")
        wakeup = conductor.make_wakeup(
            worker_name=args.worker_name,
            category=args.category,
            summary=args.summary,
            reason_event_id=args.reason_event_id,
            run_id=args.run_id,
            wakeup_id=args.wakeup_id,
            delivery_state=args.delivery_state,
            payload=payload,
            metadata=metadata,
            created_at=args.created_at,
            updated_at=args.updated_at,
        )
        written = conductor.write_wakeup(wakeup)
        print(json.dumps(written, sort_keys=True))
        return 0

    raise ValueError(f"Unsupported command: {args.command}")


if __name__ == "__main__":
    raise SystemExit(main())
