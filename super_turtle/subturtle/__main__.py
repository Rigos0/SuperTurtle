"""SubTurtle: autonomous coding loop that plans, grooms, executes, and reviews.

Each SubTurtle gets its own workspace directory with a CLAUDE.md state file.
The loop runs from the repo root (full codebase access) but reads/writes
its own state file for task tracking.

Usage:
  python -m super_turtle.subturtle --state-dir .subturtles/default --name default
"""

import argparse
import subprocess
import sys
from pathlib import Path

from .subturtle_loop import Claude, Codex

STATS_SCRIPT = Path(__file__).resolve().parent / "claude-md-guard" / "stats.sh"

# ---------------------------------------------------------------------------
# Prompt templates — {state_file} is replaced with the SubTurtle's CLAUDE.md path
# ---------------------------------------------------------------------------

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

## The plan that was executed

{{plan}}
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
# Loop
# ---------------------------------------------------------------------------

def run_loop(state_dir: Path, name: str) -> None:
    """Run the SubTurtle loop forever, using state_dir/CLAUDE.md as the state file."""
    state_file = state_dir / "CLAUDE.md"

    if not state_file.exists():
        print(f"[subturtle:{name}] ERROR: state file not found: {state_file}", file=sys.stderr)
        sys.exit(1)

    # Use a relative path if state_dir is under the project root, otherwise absolute
    try:
        rel_state = state_file.relative_to(Path.cwd())
        state_ref = str(rel_state)
    except ValueError:
        state_ref = str(state_file)

    prompts = build_prompts(state_ref)

    print(f"[subturtle:{name}] starting loop")
    print(f"[subturtle:{name}] state file: {state_ref}")

    claude = Claude()
    codex = Codex()

    while True:
        plan = claude.plan(prompts["planner"])

        stats = subprocess.check_output(
            ["bash", str(STATS_SCRIPT), str(state_file)], text=True
        )
        claude.execute(prompts["groomer"].format(stats=stats, plan=plan))

        codex.execute(prompts["executor"].format(plan=plan))

        claude.execute(prompts["reviewer"].format(plan=plan))


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
    args = parser.parse_args()

    run_loop(state_dir=Path(args.state_dir).resolve(), name=args.name)


if __name__ == "__main__":
    main()
