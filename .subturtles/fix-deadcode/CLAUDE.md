# Current task
Fix #27: remove unused `ORCHESTRATOR_PROMPT` loading/export from `super_turtle/claude-telegram-bot/src/config.ts` after verifying no TS file imports it.

# End goal with specs
Remove 3 dead code items cleanly. Each removal = one commit. Make sure nothing breaks.

# Roadmap (Completed)
- Nothing yet

# Roadmap (Upcoming)
- Dead code cleanup from code review

# Backlog
- [x] Fix #14: super_turtle/subturtle/__main__.py — delete the `_write_completion_notification` function (lines ~210-326). It has zero callers; completion now uses `_record_completion_pending`. Search the file to confirm no references exist before deleting.
- [x] Fix #19: super_turtle/subturtle/subturtle_loop/__main__.py — delete this entire file. It defines its own `run_once()`, `GROOMER_INSTRUCTIONS`, `EXECUTOR_PROMPT_TEMPLATE`, and a `main()` CLI entrypoint that is never used by the actual SubTurtle system (which runs through `super_turtle/subturtle/__main__.py`). Verify nothing imports from it first.
- [ ] Fix #27: super_turtle/claude-telegram-bot/src/config.ts — remove the loading and export of `ORCHESTRATOR_PROMPT`. The bot never uses it; `ctl` reads the orchestrator prompt file directly. Find where it's loaded (lines ~281-295), remove the file read, template expansion, and the export. Verify no other TS file imports `ORCHESTRATOR_PROMPT` from config. <- current
- [ ] Fix #21: super_turtle/meta/claude-meta line 6 — replace the hardcoded `cd /agentic` hint with a generic message like `echo "[claude-meta] hint: cd to the repo root (where AGENTS.md lives) and retry" >&2`
- [ ] Fix #26: super_turtle/meta/claude-meta line 23 — check if the `--allowedTools` list uses `Task` instead of `Agent`. If so, replace `Task,TaskOutput,TaskStop` with `Agent,TaskOutput,TaskStop` (the Task tool was renamed to Agent).
