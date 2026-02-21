"""Entry point: run from repo root so both agents see the full project."""

from orchestrator.agnt_orchestrator import Claude, Codex

prompt = "Follow instructions in CLAUDE.md"

claude = Claude()
codex = Codex()

plan = claude.plan(prompt)
codex.execute(f"Implement the following plan.\n\n{plan}")
