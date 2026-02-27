from __future__ import annotations

import argparse
import json
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping, Sequence

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


def _load_payload(raw_payload: str | None) -> dict[str, Any] | None:
    if raw_payload is None:
        return None

    loaded = json.loads(raw_payload)
    if not isinstance(loaded, dict):
        raise ValueError("--payload-json must decode to a JSON object")
    return loaded


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

    raise ValueError(f"Unsupported command: {args.command}")


if __name__ == "__main__":
    raise SystemExit(main())
