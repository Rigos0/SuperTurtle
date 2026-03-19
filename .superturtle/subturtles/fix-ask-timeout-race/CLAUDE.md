# Current task
Fix the stop-handler session API regressions in `src/handlers/stop.test.ts`.

# End goal with specs
When `runPendingCheck("ask_user", ...)` times out via the `Promise.race` timeout branch, but the actual `ask_user` check resolves `true` shortly after, `handleToolCompletion()` must still return `true` (breakOnHandled) so Codex stops streaming. Currently the timeout wins the race and returns `false`, causing Codex to keep streaming after the prompt was already sent to the user.

Fix: In `handleToolCompletion()`, after `runPendingCheck` returns `false` due to timeout, add a short grace window (~200-500ms) specifically for `ask_user` checks (where `breakOnHandled: true`). If the underlying check resolves `true` within that grace period, treat it as handled.

Acceptance criteria:
- When ask_user delivery completes within a small grace window after timeout, handleToolCompletion returns true
- Existing fast-path behavior (check resolves before timeout) is unchanged
- Add a test covering the race scenario
- All existing tests pass: `cd super_turtle/claude-telegram-bot && bun test`

# Roadmap (Completed)
- (none yet)

# Roadmap (Upcoming)
- Fix the ask_user timeout race condition

# Backlog
- [x] Read `src/drivers/codex-pending-outputs.ts` fully (especially `runPendingCheck` and `handleToolCompletion`)
- [x] Implement grace window for ask_user timeout in handleToolCompletion when breakOnHandled is true
- [x] Add test: ask_user resolves true just after timeout → handleToolCompletion returns true
- [x] Add test: non-ask_user tool timeout still returns false (no grace window)
- [x] Triage unrelated full-suite failures surfaced by `cd super_turtle/claude-telegram-bot && bun test` and separate them from this timeout-race change
- [x] Fix streaming/media regressions in `src/handlers/streaming.test.ts` that currently break pending delivery and silent notification expectations
- [x] Fix SubTurtle board/dashboard regressions in `src/dashboard.test.ts`, `src/handlers/commands.subturtle.test.ts`, and `src/handlers/callback.subturtle.test.ts`
- [ ] Fix stop-handler session API regressions in `src/handlers/stop.test.ts` <- current
- [ ] Fix voice typing cleanup timeout in `src/handlers/voice.typing.test.ts`
- [ ] Re-run `cd super_turtle/claude-telegram-bot && bun test` and confirm the full suite is green
- [x] Commit with descriptive message
