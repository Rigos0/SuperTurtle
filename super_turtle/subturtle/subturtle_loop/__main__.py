"""CLI entrypoint for running one SubTurtle iteration (plan -> groom -> execute)."""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Sequence

from .agents import Claude, Codex

DEFAULT_PROMPT = "Follow instructions in CLAUDE.md"

GROOMER_INSTRUCTIONS = """\
Update CLAUDE.md to reflect the plan attached below.

## Instructions
Your only job is to update CLAUDE.md - do not write any code.
1. Read CLAUDE.md fully.
2. Read the plan attached below.
3. Update the Current Task section with a concise one-line summary.
4. Groom Backlog so the active item is clear and completed items are checked.
5. Do NOT touch the Roadmap, End Goal, or Instructions sections.
6. Do NOT create or modify any other files.

The plan:
"""

EXECUTOR_PROMPT_TEMPLATE = """\
You are the executor. Implement the following plan.
After you are done,
commit the changes in one commit

{plan}
"""


def run_once(prompt: str, cwd: Path, skip_groom: bool) -> str:
    """Run one orchestration iteration and return the generated plan."""
    claude = Claude(cwd=cwd)
    codex = Codex(cwd=cwd)

    plan = claude.plan(prompt)
    if not skip_groom:
        claude.execute(f"{GROOMER_INSTRUCTIONS}\n{plan}")
    codex.execute(EXECUTOR_PROMPT_TEMPLATE.format(plan=plan))
    return plan


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="agnt-handoff",
        description="Run one Claude->Codex implementation handoff.",
    )
    parser.add_argument(
        "prompt",
        nargs="?",
        default=DEFAULT_PROMPT,
        help="Planning prompt sent to Claude.",
    )
    parser.add_argument(
        "--cwd",
        default=".",
        help="Working directory for both agents (default: current directory).",
    )
    parser.add_argument(
        "--skip-groom",
        action="store_true",
        help="Skip the CLAUDE.md grooming step before executor handoff.",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    run_once(prompt=args.prompt, cwd=Path(args.cwd).resolve(), skip_groom=args.skip_groom)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
