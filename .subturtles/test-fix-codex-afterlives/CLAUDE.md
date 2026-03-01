## Current Task
Re-run `bun test` to confirm export errors resolved.

## End Goal with Specs
- `bun test` in `super_turtle/claude-telegram-bot` passes.
- Mocked modules include full actual exports to avoid missing named export errors.
- Any remaining failures (driver stop expectation, codex-session tests, stall-timeout) resolved or updated tests to match intended behavior.

## Backlog
- [x] Update test mocks to merge actual exports (session, streaming, driver-routing)
- [ ] Re-run `bun test` to confirm export errors resolved <- current
- [ ] Fix remaining test failures (registry stop expectation, codex-session, stall-timeout)
- [ ] Re-run `bun test` and ensure full pass
- [ ] Commit with clear message(s)

## Notes
Target files likely include:
- super_turtle/claude-telegram-bot/src/deferred-queue.drain.test.ts
- super_turtle/claude-telegram-bot/src/handlers/streaming.test.ts
- super_turtle/claude-telegram-bot/src/drivers/registry.test.ts
- super_turtle/claude-telegram-bot/src/codex-session.test.ts
- super_turtle/claude-telegram-bot/src/session.stall-timeout.test.ts
