## Current Task
Backlog complete for this subtask; Codex SDK/session + driver registry test coverage added.

## End Goal with Specs
Tests cover:
- Codex session initialization, model/effort persistence, and error paths
- Driver registry returns expected drivers, stop/kill behavior
- SDK wrapper calls are mocked and validated

## Backlog
- [x] Review `super_turtle/claude-telegram-bot/src/codex-session.ts` and `src/drivers/`
- [x] Add tests in `super_turtle/claude-telegram-bot/src/codex-session.test.ts` (new) and/or extend phase tests
- [x] Add driver registry tests
- [x] Run targeted bun tests
- [x] Commit

## Notes
Mock external SDK + filesystem. Keep commits small and frequent.

## Loop Control
STOP
