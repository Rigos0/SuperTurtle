"""SubTurtle: autonomous coding loop with multiple loop types.

Each SubTurtle gets its own workspace directory with a CLAUDE.md state file.
The loop runs from the repo root (full codebase access) but reads/writes
its own state file for task tracking.

Loop types:
  slow       — Plan -> Groom -> Execute -> Review (4 agent calls/iteration)
  yolo       — Single Claude call per iteration (Ralph loop style)
  yolo-codex — Single Codex call per iteration (Ralph loop style)
  yolo-codex-spark — Single Codex Spark call per iteration (faster Codex loop)

Usage:
  python -m super_turtle.subturtle --state-dir .subturtles/default --name default
  python -m super_turtle.subturtle --state-dir .subturtles/fast --name fast --type yolo
"""

import argparse
import datetime
import json
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

from .subturtle_loop import Claude, Codex
from super_turtle.state.conductor_state import ConductorStateStore
from super_turtle.state.run_state_writer import refresh_handoff_from_conductor

# Package root (super_turtle/), used for resolving skills directory
_SUPER_TURTLE_DIR = os.environ.get(
    "SUPER_TURTLE_DIR", str(Path(__file__).resolve().parent.parent)
)
_SKILLS_DIR = os.path.join(_SUPER_TURTLE_DIR, "skills")

STATS_SCRIPT = Path(__file__).resolve().parent / "claude-md-guard" / "stats.sh"

# ---------------------------------------------------------------------------
# Prompt templates — {state_file} is replaced with the SubTurtle's CLAUDE.md path
# ---------------------------------------------------------------------------

# --- Slow loop prompts (plan/groom/execute/review) ---

PLANNER_PROMPT = """\
Read {state_file}. Understand the current task, end goal, and backlog.

Produce a concrete implementation plan for the next iteration — one commit's
worth of focused work. The plan must:

- Address the item marked `<- current` in the backlog (or the current task).
- List specific files to create/modify and what changes to make.
- Be scoped so a single agent can execute it without ambiguity.
- NOT include any code — describe what to do, not how to write it.

Output the plan as structured markdown.
"""

GROOMER_PROMPT = """\
Your only job is to update {state_file}. Do not write code or touch other files.

## Current {state_file} stats

{{stats}}

## Instructions

1. Read {state_file} fully.
2. Read the plan below.
3. Update the **Current Task** section:
   - Replace it with a one-liner summary of what the plan describes.
   - Append `<- current` to the line.
4. Groom the **Backlog** section:
   - Mark the active item with `<- current`. Remove the marker from all others.
   - If the plan spans multiple items, combine them or clarify which is active.
   - If the plan introduces new work not in the backlog, add it.
   - Check off (`[x]`) items that are done based on codebase/git history.
   - Reorder if priorities shifted.
   - If backlog exceeds 6 iterations of completed items, prune the oldest.
5. Do NOT touch End Goal, Roadmap (Completed), or Roadmap (Upcoming).
6. Do NOT create or modify any other files.

## The plan

{{plan}}
"""

EXECUTOR_PROMPT = """\
You are the executor. Implement the following plan exactly as described.

Rules:
- Do NOT modify {state_file} or any AGENTS.md — another agent handles those.
- Commit all changes in a single commit with a clear message.
- If the plan is ambiguous, make the simplest reasonable choice.

## Plan

{{plan}}
"""

REVIEWER_PROMPT = """\
You are the reviewer. The plan below has been implemented. Your job:

1. Verify the implementation matches the plan — check changed files, run tests
   if a test suite exists, and read the commit diff.
2. If everything looks correct, you are done. Do not make unnecessary changes.
3. If you find major bugs or broken functionality:
   - Fix them directly.
   - Add a new backlog item to {state_file} describing what was fixed and whether
     follow-up refactoring is needed. Place it right after the current item.
4. If you see non-critical issues (style, minor refactoring opportunities):
   - Do NOT fix them now.
   - Add a backlog item to {state_file} for the next iteration describing the
     refactoring or cleanup needed.
5. If ALL backlog items in {state_file} are `[x]`, append `## Loop Control\nSTOP`
   to {state_file}.

## The plan that was executed

{{plan}}
"""

# --- Yolo loop prompt (single call, Ralph style) ---

YOLO_PROMPT = """\
You are an autonomous coding agent. You work alone — there is no human in the loop.

## Your task file

Read `{state_file}` now. It contains:
- **Current task** — what you should work on RIGHT NOW.
- **End goal with specs** — the overall objective and acceptance criteria.
- **Backlog** — ordered checklist of work items. The one marked `<- current` is yours.

## Your job

Do ONE commit's worth of focused work on the current task. Follow this sequence:

1. **Understand** — Read `{state_file}`. Read any code files relevant to the current task. Understand what exists and what needs to change.

2. **Implement** — Make the changes. Write clean, working code that follows existing patterns in the codebase. Keep the scope tight — one logical change, not a sprawling refactor.

3. **Verify** — If there are tests, run them. If there is a build step, run it. If you broke something, fix it before moving on.

4. **Update state** — Edit `{state_file}`:
   - If the current backlog item is DONE, check it off (`[x]`) and move `<- current` to the next unchecked item.
   - If it is NOT done but you made progress, leave it as `<- current` and optionally add a note.
   - Update **Current task** to reflect what `<- current` now points to.
   - Do NOT touch End Goal, Roadmap (Completed), or Roadmap (Upcoming) sections.

5. **Commit** — Stage ALL changed files (code + `{state_file}`) and commit with a clear message describing what you implemented. Do NOT commit unrelated files.

6. **Self-stop when complete** — If ALL backlog items in `{state_file}` are `[x]` after your commit:
   - Append `## Loop Control\nSTOP` to `{state_file}`.
   - Amend the commit to include this state-file change.

## Rules

- You MUST read `{state_file}` before doing anything else.
- You MUST commit before you finish. No uncommitted work.
- You MUST update `{state_file}` to reflect progress. The next iteration of this loop will read it.
- Do NOT ask questions. Make reasonable decisions and move forward.
- Do NOT over-scope. One commit, one focused change. Stop after committing.
"""


def build_prompts(state_file: str) -> dict[str, str]:
    """Build prompt templates with the state file path baked in.

    Returns templates that still have {stats} and {plan} placeholders
    for the loop to fill in at runtime.
    """
    return {
        "planner": PLANNER_PROMPT.format(state_file=state_file),
        "groomer": GROOMER_PROMPT.format(state_file=state_file),
        "executor": EXECUTOR_PROMPT.format(state_file=state_file),
        "reviewer": REVIEWER_PROMPT.format(state_file=state_file),
    }


# ---------------------------------------------------------------------------
# State file helper
# ---------------------------------------------------------------------------

def _resolve_state_ref(state_dir: Path, name: str) -> tuple[Path, str]:
    """Return (state_file_path, state_ref_string) or exit on error."""
    state_file = state_dir / "CLAUDE.md"

    if not state_file.exists():
        print(
            f"[subturtle:{name}] ERROR: state file not found: {state_file}\n"
            f"[subturtle:{name}] The meta agent must write CLAUDE.md before starting a SubTurtle.",
            file=sys.stderr,
        )
        sys.exit(1)

    # Use a relative path if state_dir is under the project root, otherwise absolute
    try:
        rel_state = state_file.relative_to(Path.cwd())
        state_ref = str(rel_state)
    except ValueError:
        state_ref = str(state_file)

    return state_file, state_ref


# ---------------------------------------------------------------------------
# Loop implementations
# ---------------------------------------------------------------------------

RETRY_DELAY = 10  # seconds to wait after an agent crash before retrying
STOP_DIRECTIVE = "## Loop Control\nSTOP"


def _utc_now_iso() -> str:
    return (
        datetime.datetime.now(datetime.timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def _run_state_dir(project_dir: Path) -> Path:
    return project_dir / ".superturtle" / "state"


def _extract_current_task(state_file: Path) -> str | None:
    try:
        text = state_file.read_text(encoding="utf-8")
    except OSError:
        return None

    lines = text.splitlines()
    in_current = False
    for line in lines:
        stripped = line.strip()
        if not in_current:
            if stripped.lower() == "# current task":
                in_current = True
            continue

        if stripped.startswith("#"):
            break

        cleaned = re.sub(r"\s*<-\s*current\s*$", "", stripped).strip()
        if cleaned:
            return cleaned
    return None


def _record_completion_pending(state_dir: Path, name: str, project_dir: Path) -> None:
    state_file = state_dir / "CLAUDE.md"
    store = ConductorStateStore(_run_state_dir(project_dir))
    existing = store.load_worker_state(name) or {}
    completion_requested_at = _utc_now_iso()

    event = store.append_event(
        worker_name=name,
        event_type="worker.completion_requested",
        emitted_by="subturtle",
        run_id=existing.get("run_id"),
        lifecycle_state="completion_pending",
        payload={"kind": "self_stop", "stop_directive": True},
    )

    state = store.make_worker_state(
        worker_name=name,
        lifecycle_state="completion_pending",
        updated_by="subturtle",
        run_id=existing.get("run_id"),
        workspace=existing.get("workspace") or str(state_dir),
        loop_type=existing.get("loop_type"),
        pid=existing.get("pid"),
        timeout_seconds=existing.get("timeout_seconds"),
        cron_job_id=existing.get("cron_job_id"),
        current_task=_extract_current_task(state_file) or existing.get("current_task"),
        stop_reason="completed",
        completion_requested_at=completion_requested_at,
        terminal_at=existing.get("terminal_at"),
        created_at=existing.get("created_at"),
        last_event_id=event["id"],
        last_event_at=event["timestamp"],
        checkpoint=existing.get("checkpoint")
        if isinstance(existing.get("checkpoint"), dict)
        else None,
        metadata=existing.get("metadata")
        if isinstance(existing.get("metadata"), dict)
        else None,
    )
    store.write_worker_state(state)

    wakeup = store.make_wakeup(
        worker_name=name,
        category="notable",
        summary=f"SubTurtle {name} completed and needs reconciliation.",
        reason_event_id=event["id"],
        run_id=existing.get("run_id"),
        payload={"kind": "completion_requested"},
    )
    store.write_wakeup(wakeup)
    _refresh_handoff(project_dir, name)


def _refresh_handoff(project_dir: Path, name: str) -> None:
    try:
        refresh_handoff_from_conductor(_run_state_dir(project_dir))
    except (OSError, ValueError, json.JSONDecodeError, RuntimeError) as error:
        print(
            f"[subturtle:{name}] WARNING: failed to refresh handoff: {error}",
            file=sys.stderr,
        )


def _git_head_sha(project_dir: Path) -> str | None:
    try:
        sha = subprocess.check_output(
            ["git", "rev-parse", "HEAD"],
            cwd=project_dir,
            text=True,
        ).strip()
    except (subprocess.CalledProcessError, OSError):
        return None
    return sha or None


def _record_checkpoint(
    state_dir: Path,
    name: str,
    project_dir: Path,
    loop_type: str,
    iteration: int,
) -> None:
    state_file = state_dir / "CLAUDE.md"
    store = ConductorStateStore(_run_state_dir(project_dir))

    try:
        existing = store.load_worker_state(name) or {}
        current_task = _extract_current_task(state_file) or existing.get("current_task")
        head_sha = _git_head_sha(project_dir)
        checkpoint = {
            "recorded_at": _utc_now_iso(),
            "iteration": iteration,
            "loop_type": existing.get("loop_type") or loop_type,
        }
        if head_sha:
            checkpoint["head_sha"] = head_sha
        if current_task:
            checkpoint["current_task"] = current_task

        event = store.append_event(
            worker_name=name,
            event_type="worker.checkpoint",
            emitted_by="subturtle",
            run_id=existing.get("run_id"),
            lifecycle_state="running",
            payload={"kind": "iteration_complete", **checkpoint},
        )

        state = store.make_worker_state(
            worker_name=name,
            lifecycle_state="running",
            updated_by="subturtle",
            run_id=existing.get("run_id"),
            workspace=existing.get("workspace") or str(state_dir),
            loop_type=existing.get("loop_type") or loop_type,
            pid=existing.get("pid"),
            timeout_seconds=existing.get("timeout_seconds"),
            cron_job_id=existing.get("cron_job_id"),
            current_task=current_task,
            stop_reason=existing.get("stop_reason"),
            completion_requested_at=existing.get("completion_requested_at"),
            terminal_at=existing.get("terminal_at"),
            created_at=existing.get("created_at"),
            last_event_id=event["id"],
            last_event_at=event["timestamp"],
            checkpoint=checkpoint,
            metadata=existing.get("metadata")
            if isinstance(existing.get("metadata"), dict)
            else None,
        )
        store.write_worker_state(state)
        _refresh_handoff(project_dir, name)
    except (OSError, ValueError, json.JSONDecodeError, RuntimeError) as error:
        print(
            f"[subturtle:{name}] WARNING: failed to record checkpoint: {error}",
            file=sys.stderr,
        )


def _record_fatal_error(
    state_dir: Path,
    name: str,
    project_dir: Path,
    loop_type: str,
    error: Exception,
) -> None:
    state_file = state_dir / "CLAUDE.md"
    store = ConductorStateStore(_run_state_dir(project_dir))

    try:
        existing = store.load_worker_state(name) or {}
        current_task = _extract_current_task(state_file) or existing.get("current_task")
        error_payload = {
            "kind": "fatal_error",
            "error_type": type(error).__name__,
            "message": str(error),
        }

        event = store.append_event(
            worker_name=name,
            event_type="worker.fatal_error",
            emitted_by="subturtle",
            run_id=existing.get("run_id"),
            lifecycle_state="failure_pending",
            payload=error_payload,
        )

        metadata = (
            dict(existing.get("metadata"))
            if isinstance(existing.get("metadata"), dict)
            else {}
        )
        metadata["last_error"] = {
            **error_payload,
            "recorded_at": event["timestamp"],
        }

        state = store.make_worker_state(
            worker_name=name,
            lifecycle_state="failure_pending",
            updated_by="subturtle",
            run_id=existing.get("run_id"),
            workspace=existing.get("workspace") or str(state_dir),
            loop_type=existing.get("loop_type") or loop_type,
            pid=existing.get("pid"),
            timeout_seconds=existing.get("timeout_seconds"),
            cron_job_id=existing.get("cron_job_id"),
            current_task=current_task,
            stop_reason="fatal_error",
            completion_requested_at=existing.get("completion_requested_at"),
            terminal_at=existing.get("terminal_at"),
            created_at=existing.get("created_at"),
            last_event_id=event["id"],
            last_event_at=event["timestamp"],
            checkpoint=existing.get("checkpoint")
            if isinstance(existing.get("checkpoint"), dict)
            else None,
            metadata=metadata,
        )
        store.write_worker_state(state)

        wakeup = store.make_wakeup(
            worker_name=name,
            category="critical",
            summary=f"SubTurtle {name} hit a fatal error and needs reconciliation.",
            reason_event_id=event["id"],
            run_id=existing.get("run_id"),
            payload=error_payload,
        )
        store.write_wakeup(wakeup)
        _refresh_handoff(project_dir, name)
    except (OSError, ValueError, json.JSONDecodeError, RuntimeError) as record_error:
        print(
            f"[subturtle:{name}] WARNING: failed to record fatal error state: {record_error}",
            file=sys.stderr,
        )


def _should_stop(state_file: Path, name: str) -> bool:
    """Return True when the SubTurtle wrote the STOP directive to its state file."""
    try:
        state_text = state_file.read_text(encoding="utf-8")
    except OSError as error:
        print(
            f"[subturtle:{name}] WARNING: could not read state file for stop check: {error}",
            file=sys.stderr,
        )
        return False

    if STOP_DIRECTIVE in state_text:
        print(f"[subturtle:{name}] 🛑 agent wrote STOP directive — exiting loop")
        return True

    return False


def _require_cli(name: str, cli_name: str) -> None:
    """Exit with a clear error when a required CLI is missing from PATH."""
    if shutil.which(cli_name) is not None:
        return

    print(
        f"[subturtle:{name}] ERROR: '{cli_name}' not found on PATH",
        file=sys.stderr,
    )
    sys.exit(1)


def _log_retry(name: str, error: subprocess.CalledProcessError | OSError) -> None:
    """Log a transient failure and sleep before retrying."""
    if isinstance(error, subprocess.CalledProcessError):
        detail = f"exit {error.returncode}"
    else:
        detail = f"{type(error).__name__}: {error}"

    print(
        f"[subturtle:{name}] agent failed ({detail}), retrying in {RETRY_DELAY}s...",
        file=sys.stderr,
    )
    time.sleep(RETRY_DELAY)


def _archive_workspace(state_dir: Path, name: str) -> None:
    """Finalize a self-stopped SubTurtle workspace via ctl stop."""
    ctl_path = Path(__file__).resolve().with_name("ctl")
    pid_file = state_dir / "subturtle.pid"

    # Self-stop runs inside the SubTurtle process. Clear our own PID marker
    # first so `ctl stop` does not try to kill this process.
    # Keep metadata intact so `ctl stop` can remove the recurring cron job.
    try:
        if pid_file.exists():
            pid_text = pid_file.read_text(encoding="utf-8").strip()
            if pid_text and int(pid_text) == os.getpid():
                pid_file.unlink(missing_ok=True)
    except (OSError, ValueError):
        pass

    try:
        subprocess.run(
            [str(ctl_path), "stop", name],
            cwd=Path.cwd(),
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except (subprocess.CalledProcessError, OSError) as error:
        print(
            f"[subturtle:{name}] WARNING: failed to archive workspace {state_dir}: {error}",
            file=sys.stderr,
        )


def run_slow_loop(state_dir: Path, name: str, skills: list[str] | None = None) -> None:
    """Slow loop: Plan -> Groom -> Execute -> Review. 4 agent calls per iteration."""
    if skills is None:
        skills = []
    _require_cli(name, "claude")
    _require_cli(name, "codex")

    state_file, state_ref = _resolve_state_ref(state_dir, name)
    prompts = build_prompts(state_ref)

    print(f"[subturtle:{name}] 🐢 spawned (slow loop: plan → groom → execute → review)")
    print(f"[subturtle:{name}] state file: {state_ref}")
    if skills:
        print(f"[subturtle:{name}] skills: {', '.join(skills)}")

    add_dirs = [_SKILLS_DIR] if skills else []
    claude = Claude(add_dirs=add_dirs)
    codex = Codex(add_dirs=add_dirs)
    iteration = 0
    stopped_by_directive = False

    while True:
        if _should_stop(state_file, name):
            stopped_by_directive = True
            break
        iteration += 1
        print(f"[subturtle:{name}] === slow iteration {iteration} ===")
        try:
            plan = claude.plan(prompts["planner"])

            stats = subprocess.check_output(
                ["bash", str(STATS_SCRIPT), str(state_file)], text=True
            )
            claude.execute(prompts["groomer"].format(stats=stats, plan=plan))

            codex.execute(prompts["executor"].format(plan=plan))

            claude.execute(prompts["reviewer"].format(plan=plan))
            _record_checkpoint(state_dir, name, Path.cwd(), "slow", iteration)
        except (subprocess.CalledProcessError, OSError) as e:
            _log_retry(name, e)

        if _should_stop(state_file, name):
            stopped_by_directive = True
            break

    if stopped_by_directive:
        if iteration > 0:
            _record_completion_pending(state_dir, name, Path.cwd())
        _archive_workspace(state_dir, name)


def run_yolo_loop(state_dir: Path, name: str, skills: list[str] | None = None) -> None:
    """Yolo loop: single Claude call per iteration. Ralph loop style."""
    if skills is None:
        skills = []
    _require_cli(name, "claude")

    state_file, state_ref = _resolve_state_ref(state_dir, name)
    prompt = YOLO_PROMPT.format(state_file=state_ref)

    print(f"[subturtle:{name}] 🐢 spawned (yolo loop: claude)")
    print(f"[subturtle:{name}] state file: {state_ref}")
    if skills:
        print(f"[subturtle:{name}] skills: {', '.join(skills)}")

    add_dirs = [_SKILLS_DIR] if skills else []
    claude = Claude(add_dirs=add_dirs)
    iteration = 0
    stopped_by_directive = False

    while True:
        if _should_stop(state_file, name):
            stopped_by_directive = True
            break
        iteration += 1
        print(f"[subturtle:{name}] === yolo iteration {iteration} ===")
        try:
            claude.execute(prompt)
            _record_checkpoint(state_dir, name, Path.cwd(), "yolo", iteration)
        except (subprocess.CalledProcessError, OSError) as e:
            _log_retry(name, e)

        if _should_stop(state_file, name):
            stopped_by_directive = True
            break

    if stopped_by_directive:
        if iteration > 0:
            _record_completion_pending(state_dir, name, Path.cwd())
        _archive_workspace(state_dir, name)


def run_yolo_codex_loop(state_dir: Path, name: str, skills: list[str] | None = None) -> None:
    """Yolo-codex loop: single Codex call per iteration. Ralph loop style."""
    if skills is None:
        skills = []
    _require_cli(name, "codex")

    state_file, state_ref = _resolve_state_ref(state_dir, name)
    prompt = YOLO_PROMPT.format(state_file=state_ref)

    print(f"[subturtle:{name}] 🐢 spawned (yolo-codex loop: codex)")
    print(f"[subturtle:{name}] state file: {state_ref}")
    if skills:
        print(f"[subturtle:{name}] skills: {', '.join(skills)}")

    add_dirs = [_SKILLS_DIR] if skills else []
    codex = Codex(add_dirs=add_dirs)
    iteration = 0
    stopped_by_directive = False

    while True:
        if _should_stop(state_file, name):
            stopped_by_directive = True
            break
        iteration += 1
        print(f"[subturtle:{name}] === yolo-codex iteration {iteration} ===")
        try:
            codex.execute(prompt)
            _record_checkpoint(state_dir, name, Path.cwd(), "yolo-codex", iteration)
        except (subprocess.CalledProcessError, OSError) as e:
            _log_retry(name, e)

        if _should_stop(state_file, name):
            stopped_by_directive = True
            break

    if stopped_by_directive:
        if iteration > 0:
            _record_completion_pending(state_dir, name, Path.cwd())
        _archive_workspace(state_dir, name)


def run_yolo_codex_spark_loop(
    state_dir: Path, name: str, skills: list[str] | None = None
) -> None:
    """Yolo-codex-spark loop: single Codex Spark call per iteration."""
    if skills is None:
        skills = []
    _require_cli(name, "codex")

    state_file, state_ref = _resolve_state_ref(state_dir, name)
    prompt = YOLO_PROMPT.format(state_file=state_ref)

    print(f"[subturtle:{name}] 🐢 spawned (yolo-codex-spark loop: codex spark)")
    print(f"[subturtle:{name}] state file: {state_ref}")
    if skills:
        print(f"[subturtle:{name}] skills: {', '.join(skills)}")

    add_dirs = [_SKILLS_DIR] if skills else []
    codex = Codex(add_dirs=add_dirs, model="gpt-5.3-codex-spark")
    iteration = 0
    stopped_by_directive = False

    while True:
        if _should_stop(state_file, name):
            stopped_by_directive = True
            break
        iteration += 1
        print(f"[subturtle:{name}] === yolo-codex-spark iteration {iteration} ===")
        try:
            codex.execute(prompt)
            _record_checkpoint(
                state_dir, name, Path.cwd(), "yolo-codex-spark", iteration
            )
        except (subprocess.CalledProcessError, OSError) as e:
            _log_retry(name, e)

        if _should_stop(state_file, name):
            stopped_by_directive = True
            break

    if stopped_by_directive:
        if iteration > 0:
            _record_completion_pending(state_dir, name, Path.cwd())
        _archive_workspace(state_dir, name)


# ---------------------------------------------------------------------------
# Dispatch
# ---------------------------------------------------------------------------

LOOP_TYPES = {
    "slow": run_slow_loop,
    "yolo": run_yolo_loop,
    "yolo-codex": run_yolo_codex_loop,
    "yolo-codex-spark": run_yolo_codex_spark_loop,
}


def run_loop(state_dir: Path, name: str, loop_type: str = "slow", skills: list[str] | None = None) -> None:
    """Dispatch to the appropriate loop function."""
    if skills is None:
        skills = []
    fn = LOOP_TYPES.get(loop_type)
    if fn is None:
        print(
            f"[subturtle:{name}] ERROR: unknown loop type '{loop_type}'",
            file=sys.stderr,
        )
        sys.exit(1)
    try:
        fn(state_dir, name, skills)
    except Exception as error:
        _record_fatal_error(state_dir, name, Path.cwd(), loop_type, error)
        raise


def main() -> None:
    parser = argparse.ArgumentParser(description="SubTurtle autonomous coding loop")
    parser.add_argument(
        "--state-dir",
        required=True,
        help="Path to this SubTurtle's workspace directory (contains CLAUDE.md)",
    )
    parser.add_argument(
        "--name",
        default="default",
        help="Human-readable name for this SubTurtle (used in log prefixes)",
    )
    parser.add_argument(
        "--type",
        default="slow",
        choices=list(LOOP_TYPES.keys()),
        help=(
            "Loop type: slow (plan/groom/execute/review), yolo (single Claude call), "
            "yolo-codex (single Codex call), yolo-codex-spark (single Codex Spark call)"
        ),
    )
    parser.add_argument(
        "--skills",
        nargs="*",
        default=[],
        help="List of Claude Code skills to load (e.g. frontend testing)",
    )
    args = parser.parse_args()

    run_loop(state_dir=Path(args.state_dir).resolve(), name=args.name, loop_type=args.type, skills=args.skills)


if __name__ == "__main__":
    main()
