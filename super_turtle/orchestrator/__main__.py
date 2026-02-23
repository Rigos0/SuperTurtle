"""Entry point: run from repo root so both agents see the full project."""

import subprocess
from pathlib import Path

from .agnt_orchestrator import Claude, Codex

STATS_SCRIPT = Path(__file__).resolve().parent / "claude-md-guard" / "stats.sh"

# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

PLANNER_PROMPT = """\
Read CLAUDE.md. Understand the current task, end goal, and backlog.

Produce a concrete implementation plan for the next iteration — one commit's
worth of focused work. The plan must:

- Address the item marked `<- current` in the backlog (or the current task).
- List specific files to create/modify and what changes to make.
- Be scoped so a single agent can execute it without ambiguity.
- NOT include any code — describe what to do, not how to write it.

Output the plan as structured markdown.
"""

GROOMER_PROMPT = """\
Your only job is to update CLAUDE.md. Do not write code or touch other files.

## Current CLAUDE.md stats

{stats}

## Instructions

1. Read CLAUDE.md fully.
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

{plan}
"""

EXECUTOR_PROMPT = """\
You are the executor. Implement the following plan exactly as described.

Rules:
- Do NOT modify CLAUDE.md or AGENTS.md — another agent handles those.
- Commit all changes in a single commit with a clear message.
- If the plan is ambiguous, make the simplest reasonable choice.

## Plan

{plan}
"""

REVIEWER_PROMPT = """\
You are the reviewer. The plan below has been implemented. Your job:

1. Verify the implementation matches the plan — check changed files, run tests
   if a test suite exists, and read the commit diff.
2. If everything looks correct, you are done. Do not make unnecessary changes.
3. If you find major bugs or broken functionality:
   - Fix them directly.
   - Add a new backlog item to CLAUDE.md describing what was fixed and whether
     follow-up refactoring is needed. Place it right after the current item.
4. If you see non-critical issues (style, minor refactoring opportunities):
   - Do NOT fix them now.
   - Add a backlog item to CLAUDE.md for the next iteration describing the
     refactoring or cleanup needed.

## The plan that was executed

{plan}
"""

# ---------------------------------------------------------------------------
# Loop
# ---------------------------------------------------------------------------

claude = Claude()
codex = Codex()

while True:
    plan = claude.plan(PLANNER_PROMPT)

    stats = subprocess.check_output(
        ["bash", str(STATS_SCRIPT), "CLAUDE.md"], text=True
    )
    claude.execute(GROOMER_PROMPT.format(stats=stats, plan=plan))

    codex.execute(EXECUTOR_PROMPT.format(plan=plan))

    claude.execute(REVIEWER_PROMPT.format(plan=plan))
