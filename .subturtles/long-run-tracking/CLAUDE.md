## Current Task
Implement small writer utility (append/update) for run state.

## End Goal with Specs
System persists long-running task state across meta sessions using two files: `super_turtle/state/runs.jsonl` (append-only ledger) and `super_turtle/state/handoff.md` (human resume summary). Updates happen on SubTurtle spawn, milestone, stop, completion. `/status` or cron check-ins can read these without relying on chat context.

## Backlog
- [x] Add `super_turtle/state/` folder with `runs.jsonl` + `handoff.md` creation helpers
- [ ] Implement small writer utility (append/update) for run state <- current
- [ ] Wire updates into spawn + stop paths in `super_turtle/subturtle/ctl` or bot handlers
- [ ] Update cron check-in flow to refresh handoff summary
- [ ] Add minimal tests or a smoke check
- [ ] Update docs if needed; update state and stop

## Notes
Keep it simple: append-only JSONL, human-friendly handoff. No DB. Use yolo-codex.
