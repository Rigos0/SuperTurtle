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
  python -m subturtle --state-dir .subturtles/default --name default
"""

import argparse
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

from . import prompts
from . import statefile
from .subturtle_loop.agents import Claude, Codex

# Package root (super_turtle/), used for resolving skills directory
_SUPER_TURTLE_DIR = os.environ.get(
    "SUPER_TURTLE_DIR", str(Path(__file__).resolve().parent.parent)
)
_SKILLS_DIR = os.path.join(_SUPER_TURTLE_DIR, "skills")

STATS_SCRIPT = Path(__file__).resolve().parent / "claude-md-guard" / "stats.sh"

PLANNER_PROMPT = prompts.PLANNER_PROMPT
GROOMER_PROMPT = prompts.GROOMER_PROMPT
EXECUTOR_PROMPT = prompts.EXECUTOR_PROMPT
REVIEWER_PROMPT = prompts.REVIEWER_PROMPT
YOLO_PROMPT = prompts.YOLO_PROMPT
build_prompts = prompts.build_prompts


# ---------------------------------------------------------------------------
# Loop implementations
# ---------------------------------------------------------------------------

RETRY_DELAY = 10  # seconds to wait after an agent crash before retrying
MAX_CONSECUTIVE_FAILURES = 5
MAX_FAILURES_MESSAGE = "max consecutive failures reached"

_extract_current_task = statefile.extract_current_task
_git_head_sha = statefile.git_head_sha
_record_checkpoint = statefile.record_checkpoint
_record_completion_pending = statefile.record_completion_pending
_record_failure_pending = statefile.record_failure_pending
_record_fatal_error = statefile.record_fatal_error
_refresh_handoff = statefile.refresh_handoff
_resolve_state_ref = statefile.resolve_state_ref
_run_state_dir = statefile.run_state_dir
_should_stop = statefile.should_stop
_utc_now_iso = statefile.utc_now_iso
STOP_DIRECTIVE = statefile.STOP_DIRECTIVE


def _require_cli(name: str, cli_name: str) -> None:
    """Exit with a clear error when a required CLI is missing from PATH."""
    if shutil.which(cli_name) is not None:
        return

    print(
        f"[subturtle:{name}] ERROR: '{cli_name}' not found on PATH",
        file=sys.stderr,
    )
    sys.exit(1)


def _agent_error_detail(error: subprocess.CalledProcessError | OSError) -> str:
    if isinstance(error, subprocess.CalledProcessError):
        return f"exit {error.returncode}"
    return f"{type(error).__name__}: {error}"


def _log_retry(name: str, error: subprocess.CalledProcessError | OSError) -> None:
    """Log a transient failure and sleep before retrying."""
    print(
        f"[subturtle:{name}] agent failed ({_agent_error_detail(error)}), retrying in {RETRY_DELAY}s...",
        file=sys.stderr,
    )
    time.sleep(RETRY_DELAY)


def _handle_agent_failure(
    state_dir: Path,
    name: str,
    project_dir: Path,
    loop_type: str,
    error: subprocess.CalledProcessError | OSError,
    consecutive_failures: int,
) -> tuple[int, bool]:
    consecutive_failures += 1
    if consecutive_failures >= MAX_CONSECUTIVE_FAILURES:
        print(
            (
                f"[subturtle:{name}] FATAL: reached {consecutive_failures} consecutive "
                f"agent failures ({_agent_error_detail(error)}); stopping loop"
            ),
            file=sys.stderr,
        )
        _record_failure_pending(
            state_dir,
            name,
            project_dir,
            loop_type,
            MAX_FAILURES_MESSAGE,
        )
        return consecutive_failures, True

    _log_retry(name, error)
    return consecutive_failures, False


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
    project_dir = Path.cwd()
    iteration = 0
    consecutive_failures = 0
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
            _record_checkpoint(state_dir, name, project_dir, "slow", iteration)
            consecutive_failures = 0
        except (subprocess.CalledProcessError, OSError) as e:
            consecutive_failures, should_stop = _handle_agent_failure(
                state_dir,
                name,
                project_dir,
                "slow",
                e,
                consecutive_failures,
            )
            if should_stop:
                break

        if _should_stop(state_file, name):
            stopped_by_directive = True
            break

    if stopped_by_directive:
        if iteration > 0:
            _record_completion_pending(state_dir, name, project_dir)
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
    project_dir = Path.cwd()
    iteration = 0
    consecutive_failures = 0
    stopped_by_directive = False

    while True:
        if _should_stop(state_file, name):
            stopped_by_directive = True
            break
        iteration += 1
        print(f"[subturtle:{name}] === yolo iteration {iteration} ===")
        try:
            claude.execute(prompt)
            _record_checkpoint(state_dir, name, project_dir, "yolo", iteration)
            consecutive_failures = 0
        except (subprocess.CalledProcessError, OSError) as e:
            consecutive_failures, should_stop = _handle_agent_failure(
                state_dir,
                name,
                project_dir,
                "yolo",
                e,
                consecutive_failures,
            )
            if should_stop:
                break

        if _should_stop(state_file, name):
            stopped_by_directive = True
            break

    if stopped_by_directive:
        if iteration > 0:
            _record_completion_pending(state_dir, name, project_dir)
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
    project_dir = Path.cwd()
    iteration = 0
    consecutive_failures = 0
    stopped_by_directive = False

    while True:
        if _should_stop(state_file, name):
            stopped_by_directive = True
            break
        iteration += 1
        print(f"[subturtle:{name}] === yolo-codex iteration {iteration} ===")
        try:
            codex.execute(prompt)
            _record_checkpoint(state_dir, name, project_dir, "yolo-codex", iteration)
            consecutive_failures = 0
        except (subprocess.CalledProcessError, OSError) as e:
            consecutive_failures, should_stop = _handle_agent_failure(
                state_dir,
                name,
                project_dir,
                "yolo-codex",
                e,
                consecutive_failures,
            )
            if should_stop:
                break

        if _should_stop(state_file, name):
            stopped_by_directive = True
            break

    if stopped_by_directive:
        if iteration > 0:
            _record_completion_pending(state_dir, name, project_dir)
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
    project_dir = Path.cwd()
    iteration = 0
    consecutive_failures = 0
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
                state_dir, name, project_dir, "yolo-codex-spark", iteration
            )
            consecutive_failures = 0
        except (subprocess.CalledProcessError, OSError) as e:
            consecutive_failures, should_stop = _handle_agent_failure(
                state_dir,
                name,
                project_dir,
                "yolo-codex-spark",
                e,
                consecutive_failures,
            )
            if should_stop:
                break

        if _should_stop(state_file, name):
            stopped_by_directive = True
            break

    if stopped_by_directive:
        if iteration > 0:
            _record_completion_pending(state_dir, name, project_dir)
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
