#!/usr/bin/env python3
"""
Handoff: Claude Code -> Codex pipeline.

Stage 1: Claude Code (plan mode) creates an implementation plan.
Stage 2: Codex implements the plan.
"""

import argparse
import subprocess
import sys


def main():
    parser = argparse.ArgumentParser(description="Claude -> Codex handoff pipeline")
    parser.add_argument("prompt", help="Initial task description")
    parser.add_argument(
        "-C", "--cwd",
        default=".",
        help="Working directory for both agents (default: current dir)",
    )
    args = parser.parse_args()

    cmd = [
        "claude",
        "--permission-mode", "plan",
        "-p",
        args.prompt,
    ]
    print("[stage 1] claude planning...", file=sys.stderr)
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=args.cwd)

    plan = result.stdout.strip()
    print(f"[stage 1] done ({len(plan)} chars)", file=sys.stderr)
    print(plan)


if __name__ == "__main__":
    main()
