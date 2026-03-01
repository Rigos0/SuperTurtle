## Current Task
All backlog items completed.

## End Goal with Specs
Tests cover:
- callback `switch:codex` when CODEX_AVAILABLE=false returns unavailable alert and does not switch
- callback `switch:codex` when CODEX_AVAILABLE=true resets sessions, starts new thread, sets active driver
- callback `codex_model:*` and `codex_effort:*` with active session restarts thread and edits message
- `/switch` command when CODEX_ENABLED=false shows codex unavailable option
- `/switch codex` command success/failure paths

## Backlog
- [x] Review `super_turtle/claude-telegram-bot/src/handlers/callback.ts` switch and codex model/effort blocks
- [x] Add callback tests in `super_turtle/claude-telegram-bot/src/handlers/callback.test.ts` (new) or extend existing tests
- [x] Add command tests in `super_turtle/claude-telegram-bot/src/handlers/commands.test.ts`
- [x] Run targeted bun tests for new coverage
- [x] Commit

## Notes
Target files:
- super_turtle/claude-telegram-bot/src/handlers/callback.ts
- super_turtle/claude-telegram-bot/src/handlers/commands.ts

## Loop Control
STOP
