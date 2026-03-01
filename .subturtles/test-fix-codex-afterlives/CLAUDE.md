## Current Task
All backlog items completed.

## End Goal with Specs
- `bun test` in `super_turtle/claude-telegram-bot` passes.
- Mocked modules include full actual exports to avoid missing named export errors.
- Any remaining failures (driver stop expectation, codex-session tests, stall-timeout) resolved or updated tests to match intended behavior.

## Backlog
- [x] Update test mocks to merge actual exports (session, streaming, driver-routing)
- [x] Re-run `bun test` to confirm export errors resolved
- [x] Fix remaining test failures (registry stop expectation, commands/driver-routing)
- [x] Re-run `bun test` and ensure full pass
- [x] Commit with clear message(s)

## Notes
Target files likely include:
- super_turtle/claude-telegram-bot/src/deferred-queue.drain.test.ts
- super_turtle/claude-telegram-bot/src/handlers/streaming.test.ts
- super_turtle/claude-telegram-bot/src/drivers/registry.test.ts
- super_turtle/claude-telegram-bot/src/codex-session.test.ts
- super_turtle/claude-telegram-bot/src/session.stall-timeout.test.ts

Latest `bun test` run (2026-03-01) summary:
- 156 passing, 7 failing, 163 total tests.
- Export-related mock failures no longer present.
- Remaining failures:
  - src/drivers/registry.test.ts (1)
  - src/handlers/commands.test.ts (2)
  - src/handlers/driver-routing.test.ts (2)

Progress update (this loop):
- Fixed `src/codex-session.test.ts` expectations for runtime policy options and working directory handling.
- Verified with: `bun test src/codex-session.test.ts` (3 passing).
- Fixed cross-suite test isolation issues in `src/deferred-queue.drain.test.ts` and `src/handlers/driver-routing.test.ts`.
- Verified with: `bun test` (163 passing, 0 failing).

## Loop Control
STOP
