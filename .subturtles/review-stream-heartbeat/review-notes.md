# Streaming Heartbeat Review Notes

## Findings

### High — Heartbeat timer can leak after stop/error paths and emit ghost "Still working" messages
- **Where:** `super_turtle/claude-telegram-bot/src/handlers/streaming.ts:732-770`, `super_turtle/claude-telegram-bot/src/handlers/text.ts:208-231`, `super_turtle/claude-telegram-bot/src/handlers/stop.ts:98-132`
- **What happens:** `createStatusCallback()` starts `setInterval` heartbeat, but timer shutdown only happens on `statusType === "done"`. On code paths where driver run throws before `done` callback (notably Codex cancellation/error and retry/error handling in `handleText`, plus explicit `/stop` cleanup), code calls `cleanupToolMessages()` but never stops the interval.
- **Impact:** orphaned intervals keep running against stale `StreamingState`, can post new heartbeat messages after a run is stopped, and can accumulate across retries (memory/timer leak + confusing Telegram UX).
- **Concrete fix:** centralize lifecycle cleanup so all teardown paths call a shared helper that does `stopHeartbeat(state)` + `clearHeartbeatMessage(...)` + `cleanupToolMessages(...)` + `deleteThinkingPlaceholder(...)`; invoke it from `done`, `handleText` catch/retry cleanup, and `handleStop`.

### Medium — Missing regression tests for heartbeat teardown outside happy-path `done`
- **Where:** `super_turtle/claude-telegram-bot/src/handlers/streaming.test.ts`
- **What happens:** current tests cover delete-error suppression in `cleanupToolMessages`, but there is no test validating timer cleanup when processing ends via stop/cancellation/retry error path.
- **Impact:** the leak/race above is easy to reintroduce because only normal completion is currently exercised.
- **Concrete fix:** add tests with fake timers that assert heartbeat interval is cleared when teardown is triggered from non-`done` paths (`handleStop` and `handleText` catch/retry cleanup).

## Residual Risks / Test Gaps
- No integration-style test verifies heartbeat + stop behavior against real Telegram API failure modes (`message to edit/delete not found`, stop during active heartbeat edit).
