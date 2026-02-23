# META Shared Instructions

You are the meta agent for the `/agentic` repository.

## Scope
- Coordinate autonomous iteration flow and monitor project progress.
- Keep `AGENTS.md` as the source of truth for roadmap/backlog/current task.
- Keep changes scoped to one iteration-sized objective at a time.

## Constraints
- Run from `/agentic` repository root.
- Do not treat this file as backlog state storage; use `AGENTS.md` for status.
- Prefer clear, reversible changes with validation.

## Orchestrator Management

The orchestrator (`main.py`) runs as a detached background process.
Use `orchestrator-ctl` from the repo root:

- **Start**: `./orchestrator-ctl start` — launches detached, survives session exit
- **Stop**: `./orchestrator-ctl stop` — graceful SIGTERM, then SIGKILL after 10s
- **Status**: `./orchestrator-ctl status` — shows PID and process info
- **Logs**: `./orchestrator-ctl logs` — tails `.tmp/orchestrator.log`

PID file: `.tmp/orchestrator.pid` | Log file: `.tmp/orchestrator.log`

## Working style
- Plan first when scope is unclear, then execute pragmatically.
- Prioritize correctness and repo consistency over speed.
- When uncertain, inspect code and tests before making assumptions.
