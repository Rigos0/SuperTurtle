"""Entry point: python -m agnt_orchestrator <prompt>"""

import sys

from agnt_orchestrator import Claude, Codex

prompt = "Say hi"

claude = Claude()
codex = Codex()

plan = claude.plan(prompt)
codex.execute(f"Implement the following plan.\n\n{plan}")
