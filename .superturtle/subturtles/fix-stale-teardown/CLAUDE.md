# Current task
Finish isolating `src/handlers/commands.subturtle.test.ts` and `src/handlers/callback.subturtle.test.ts` from cross-file board-state collisions under full `bun test`, then re-check which unrelated failures still remain.

# End goal with specs
In `codex-driver.ts`, the `done` status is deferred (line 51-57) so it fires after pending output flush. But in `codex-session.ts` (line 1543-1546), the stale-session detection path calls `statusCallback("done", "")` then throws. This means:

1. Wrapped status callback captures `done` into `deferredDone`
2. Then the throw causes `codexSession.sendMessage()` to reject
3. The `finally` block stops the pending pump (line 77)
4. But lines 80-88 (flushAfterCompletion + deferred done delivery) are SKIPPED because the exception propagates
5. The downstream `done` callback (which runs `teardownStreamingState`) never fires

Fix: Move the deferred done delivery into the `finally` block (or a try/finally wrapping lines 80-88) so it always runs even when sendMessage throws.

Acceptance criteria:
- When stale-session throws after emitting done, the downstream done callback still fires
- Normal (non-stale) done flow is unchanged
- Add test: stale session emits done then throws → downstream done callback still called
- All existing tests pass: `cd super_turtle/claude-telegram-bot && bun test`

# Roadmap (Completed)
- (none yet)

# Roadmap (Upcoming)
- Fix deferred done teardown on stale-session retry

# Backlog
- [x] Read `src/drivers/codex-driver.ts` runMessage method, focus on deferred done + finally block
- [x] Read stale-session detection in `src/codex-session.ts` around line 1532-1548
- [x] Implement fix: wrap lines 80-88 in try/finally so deferred done always delivered
- [x] Add test: stale session emits `done`, then throws, and the downstream `done` callback still fires
- [x] Re-check the reported dashboard logs 404 in the current tree; `bun test src/dashboard.test.ts` passes, and the route-specific logs test returns 200 for an existing `subturtle.log`
- [x] Re-isolate `commands.subturtle` and `callback.subturtle` from leaked `mock.module("../config")` state by loading fresh handler modules per test
- [ ] Finish isolating `src/handlers/commands.subturtle.test.ts` and `src/handlers/callback.subturtle.test.ts` from shared live-board state collisions during full-suite runs <- current
- [ ] After the subturtle handler suites are stable in the full suite, re-run `cd super_turtle/claude-telegram-bot && bun test` and confirm whether `/api/subturtles/:name/logs` still has any order-dependent failure
- [ ] Investigate the remaining unrelated full-suite failures after subturtle isolation: `src/session.ask-user.test.ts`, `src/handlers/codex.flow.test.ts`, and `src/handlers/voice.typing.test.ts`
- [x] Commit with descriptive message

Note: `bun test src/dashboard.test.ts` still passes in isolation, so the earlier `/api/subturtles/:name/logs` 404 is not currently reproducible by itself. After re-isolating the subturtle handler imports, a full `bun test` run dropped the prior `streaming.test.ts` failures, but it still reports 11 failures, led by shared-state issues in `src/handlers/commands.subturtle.test.ts` / `src/handlers/callback.subturtle.test.ts`, plus unrelated failures in `src/session.ask-user.test.ts`, `src/handlers/codex.flow.test.ts`, and `src/handlers/voice.typing.test.ts`.
