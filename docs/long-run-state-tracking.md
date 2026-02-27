# Long-Run State Tracking

Super Turtle persists long-running SubTurtle progress in two files under `super_turtle/state/`:

- `runs.jsonl`: append-only event ledger (`spawn`, `milestone`, `stop`, `completion`, etc.).
- `handoff.md`: human-readable summary refreshed from ledger data.

## Why this exists

Meta sessions can restart, but run history must survive. These files make status and cron supervision resumable without depending on chat context.

## Write events

Use the helper CLI:

```bash
python3 super_turtle/state/run_state_writer.py --state-dir super_turtle/state append \
  --run-name demo-run \
  --event milestone \
  --status running \
  --payload-json '{"note":"checkpoint reached"}'
```

## Refresh the handoff summary

```bash
python3 super_turtle/state/run_state_writer.py --state-dir super_turtle/state update-handoff \
  --active-run "demo-run (last event: milestone at 2026-02-27T00:00:00Z)" \
  --milestone "demo-run: milestone (running) at 2026-02-27T00:00:00Z" \
  --note "Auto-refreshed by cron check-ins from runs.jsonl."
```

## Minimal verification

Run:

```bash
python3 -m unittest super_turtle.state.test_run_state_writer
```

This validates bootstrap file creation, JSONL append behavior, handoff rendering, and CLI smoke paths.
