"""Conductor state GC and log rotation.

Prunes old terminal records from .superturtle/state/ to prevent unbounded growth.
Targets: wakeups, inbox, archived workers, events.jsonl, and runs.jsonl.
"""

from __future__ import annotations

import datetime
import json
import logging
import os
from dataclasses import dataclass
from pathlib import Path

from super_turtle.state.conductor_state import ConductorStateStore

logger = logging.getLogger(__name__)


@dataclass
class GcResult:
    """Statistics from a GC run."""

    wakeups_pruned: int = 0
    inbox_pruned: int = 0
    workers_pruned: int = 0
    events_archived: int = 0
    runs_archived: int = 0
    dry_run: bool = False


def gc_conductor_state(
    state_dir: Path,
    max_age_seconds: int,
    dry_run: bool = False,
) -> GcResult:
    """Main GC entry point."""
    store = ConductorStateStore(str(state_dir))
    cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(
        seconds=max_age_seconds
    )
    cutoff_iso = cutoff.isoformat().replace("+00:00", "Z")

    res = GcResult(dry_run=dry_run)

    # 1. Load worker states manually (resilient to malformed JSON)
    active_run_ids: set[str] = set()
    archived_workers: list[dict] = []

    for p in store.paths.workers_dir.glob("*.json"):
        try:
            with p.open("r", encoding="utf-8") as f:
                w = json.load(f)
            if not isinstance(w, dict):
                continue
            
            run_id = w.get("run_id")
            if w.get("lifecycle_state") != "archived":
                if run_id:
                    active_run_ids.add(run_id)
            else:
                w["_path"] = p  # Store path for deletion
                archived_workers.append(w)
        except (json.JSONDecodeError, OSError):
            continue

    # 2. Load wakeups manually (resilient to malformed JSON)
    all_wakeups: list[dict] = []
    pending_wakeup_run_ids: set[str] = set()
    
    for p in store.paths.wakeups_dir.glob("*.json"):
        try:
            with p.open("r", encoding="utf-8") as f:
                wk = json.load(f)
            if not isinstance(wk, dict):
                continue
            
            wk["_path"] = p  # Store path for deletion
            all_wakeups.append(wk)
            
            if wk.get("delivery_state") in ("pending", "processing"):
                rid = wk.get("run_id")
                if rid:
                    pending_wakeup_run_ids.add(rid)
        except (json.JSONDecodeError, OSError):
            continue

    # 3. Prune targets
    res.wakeups_pruned = _prune_wakeups(
        all_wakeups, cutoff_iso, active_run_ids, dry_run
    )
    res.inbox_pruned = _prune_inbox(state_dir / "inbox", cutoff_iso, dry_run)
    res.workers_pruned = _prune_workers(
        archived_workers, cutoff_iso, active_run_ids, pending_wakeup_run_ids, dry_run
    )

    # 4. Rotate logs
    res.events_archived = _rotate_jsonl(
        state_dir / "events.jsonl", cutoff_iso, dry_run
    )
    res.runs_archived = _rotate_jsonl(
        state_dir / "runs.jsonl", cutoff_iso, dry_run
    )

    return res


def _prune_wakeups(
    wakeups: list[dict],
    cutoff_iso: str,
    active_run_ids: set[str],
    dry_run: bool,
) -> int:
    """Prune wakeups in terminal states (sent, suppressed, failed) older than cutoff."""
    count = 0
    terminal_states = ("sent", "suppressed", "failed")

    for wk in wakeups:
        if wk.get("delivery_state") not in terminal_states:
            continue

        updated_at = wk.get("updated_at") or ""
        run_id = wk.get("run_id")

        if updated_at < cutoff_iso and run_id not in active_run_ids:
            count += 1
            if not dry_run:
                path = wk.get("_path")
                if path and isinstance(path, Path):
                    path.unlink(missing_ok=True)

    return count


def _prune_inbox(inbox_dir: Path, cutoff_iso: str, dry_run: bool) -> int:
    """Prune inbox items (TypeScript-owned, raw JSON) in terminal states."""
    if not inbox_dir.is_dir():
        return 0

    count = 0
    terminal_states = ("acknowledged", "suppressed")

    for p in inbox_dir.glob("*.json"):
        try:
            with p.open("r", encoding="utf-8") as f:
                data = json.load(f)
        except (json.JSONDecodeError, OSError):
            continue

        if not isinstance(data, dict):
            continue

        if data.get("delivery_state") not in terminal_states:
            continue

        # Use acknowledged_at if available (more precise), fallback to updated_at
        delivery = data.get("delivery") or {}
        ts = delivery.get("acknowledged_at") or data.get("updated_at") or ""

        if ts < cutoff_iso:
            count += 1
            if not dry_run:
                p.unlink(missing_ok=True)

    return count


def _prune_workers(
    archived_workers: list[dict],
    cutoff_iso: str,
    active_run_ids: set[str],
    pending_wakeup_run_ids: set[str],
    dry_run: bool,
) -> int:
    """Prune archived workers older than cutoff with no pending/active dependencies."""
    count = 0

    for w in archived_workers:
        updated_at = w.get("updated_at") or ""
        run_id = w.get("run_id")

        if (
            updated_at < cutoff_iso
            and run_id not in active_run_ids
            and run_id not in pending_wakeup_run_ids
        ):
            count += 1
            if not dry_run:
                path = w.get("_path")
                if path and isinstance(path, Path):
                    path.unlink(missing_ok=True)

    return count


def _rotate_jsonl(jsonl_path: Path, cutoff_iso: str, dry_run: bool) -> int:
    """Rotate append-only JSONL files: keep recent lines, archive old ones."""
    if not jsonl_path.exists():
        return 0

    keep_lines: list[str] = []
    archive_lines: list[str] = []

    try:
        with jsonl_path.open("r", encoding="utf-8", errors="replace") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    data = json.loads(line)
                    ts = data.get("timestamp") or ""
                    if ts < cutoff_iso:
                        archive_lines.append(line)
                    else:
                        keep_lines.append(line)
                except json.JSONDecodeError:
                    keep_lines.append(line)  # Keep malformed lines in main file
    except OSError:
        return 0

    if not archive_lines:
        return 0

    if not dry_run:
        archive_path = jsonl_path.with_suffix(jsonl_path.suffix + ".1")
        # Append to existing archive
        with archive_path.open("a", encoding="utf-8") as f:
            for line in archive_lines:
                f.write(line + "\n")

        # Atomic rewrite of main file
        tmp_path = jsonl_path.with_suffix(".tmp")
        with tmp_path.open("w", encoding="utf-8") as f:
            for line in keep_lines:
                f.write(line + "\n")
        tmp_path.replace(jsonl_path)

    return len(archive_lines)


if __name__ == "__main__":
    import argparse
    import sys

    parser = argparse.ArgumentParser(description="Conductor state GC")
    parser.add_argument("--state-dir", required=True, type=Path, help="State directory")
    parser.add_argument(
        "--max-age",
        default="7d",
        help="Max age (e.g. 7d, 24h, 3600s). Default 7d.",
    )
    parser.add_argument("--dry-run", action="store_true", help="Don't delete anything")
    parser.add_argument("--verbose", action="store_true", help="Verbose logging")

    args = parser.parse_args()

    log_level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(level=log_level, format="%(levelname)s: %(message)s")

    # Parse duration (simple support for s, h, d)
    val_str = args.max_age.strip().lower()
    try:
        if val_str.endswith("d"):
            seconds = int(val_str[:-1]) * 86400
        elif val_str.endswith("h"):
            seconds = int(val_str[:-1]) * 3600
        elif val_str.endswith("s"):
            seconds = int(val_str[:-1])
        else:
            seconds = int(val_str)
    except ValueError:
        print(f"CRITICAL ERROR: Invalid --max-age: {args.max_age}", file=sys.stderr)
        sys.exit(1)

    if not args.state_dir.is_dir():
        print(
            f"CRITICAL ERROR: State directory not found: {args.state_dir}",
            file=sys.stderr,
        )
        sys.exit(1)

    result = gc_conductor_state(args.state_dir, seconds, dry_run=args.dry_run)

    if args.dry_run:
        print("DIAGNOSTIC: DRY RUN — no files were deleted or modified.")

    print(f"DIAGNOSTIC: GC summary for {args.state_dir}:")
    print(f"  - Wakeups pruned:  {result.wakeups_pruned}")
    print(f"  - Inbox items pruned: {result.inbox_pruned}")
    print(f"  - Workers pruned:  {result.workers_pruned}")
    print(f"  - Event log lines archived: {result.events_archived}")
    print(f"  - Run log lines archived:   {result.runs_archived}")
