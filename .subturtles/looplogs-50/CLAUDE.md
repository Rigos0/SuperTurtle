## Current task
All backlog items for `/looplogs` are complete; commit and stop this loop.

## End goal with specs
A single low-complexity debugging feature exists: log retrieval from the main caffeinated loop without new orchestration layers.

Acceptance criteria:
- Telegram command `/looplogs` exists and returns exactly the last 50 lines from the main loop log.
- Uses existing auth/allowed-user protections.
- If log file is missing/unreadable, returns a concise actionable error.
- Output is safe for Telegram (chunking or truncation only if required by platform limit).
- Main/meta agent can read same file path via existing shell access (document path in code comment or docs).
- Add at least one focused test for command behavior (success + missing-file path preferred).

## Roadmap (Completed)
- E2B hardening SubTurtle in progress separately.

## Roadmap (Upcoming)
- Add `/looplogs` command handler
- Add tests and tiny docs note

## Backlog
- [x] Locate main loop log file path currently used by caffeinated/run-loop execution
- [x] Implement `/looplogs` command in `super_turtle/claude-telegram-bot/src/handlers/commands.ts` (fixed 50 lines)
- [x] Register command routing (if needed) and ensure help/command list includes it
- [x] Add tests in handlers tests for success path and missing log file path
- [x] Add short docs note with log path + command usage
- [x] Run targeted tests and commit

## Notes
- Keep implementation minimal; no filtering, no snapshots, no complex infra.
- Avoid introducing new config unless absolutely necessary.
- Verification detail: `bun test src/handlers/commands.looplogs.test.ts` passes. Repo-wide typecheck currently has pre-existing failures in `src/dashboard.ts` and `src/session.stall-timeout.test.ts`.

## Loop Control
STOP
