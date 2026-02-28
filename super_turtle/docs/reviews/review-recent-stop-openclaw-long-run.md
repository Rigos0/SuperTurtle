# Code Review: Stop Intents, OpenClaw Gap, Long-Run Tracking

Date: 2026-02-27
Scope commits: `9db5311`, `1ed668c`, `dd7ba1c`, `dd5671d`, `68e26ed`, `c0d7bac`, `252e1ab`, `404a34b`, `41f6d06`

## Findings

1. Medium: Voice stop intent can immediately restart work from deferred queue
- Files: `super_turtle/claude-telegram-bot/src/handlers/voice.ts:112`, `super_turtle/claude-telegram-bot/src/handlers/voice.ts:176`, `super_turtle/claude-telegram-bot/src/deferred-queue.ts:62`
- Problem: when a voice transcript is a stop intent, the handler calls `stopAllRunningWork()` and returns, but `finally` still runs `drainDeferredQueue(ctx, chatId)`. If queued voice messages exist, stop can be followed by automatic execution of queued work.
- Risk: user asks to stop all work, but queued work resumes right away, causing surprising side effects.
- Suggested fix: track `didStopIntent` in `handleVoice` and skip draining queue for that path, or clear queue for that chat before returning.

2. Resolved: `ctl stop` wrote phantom run-state events for non-existent runs
- File: `super_turtle/subturtle/ctl:743`
- Problem: in the `! is_running` branch, `append_run_event "$name" "stop" "not_running"` executes before `do_archive "$name"`. For typo/non-existent names, `do_archive` exits with error, but the ledger already contains a synthetic stop event.
- Risk: `super_turtle/state/runs.jsonl` gets polluted with fake run names, degrading handoff summaries and operator trust in run-state data.
- Fix applied: `append_run_event ... not_running` now runs only when `.subturtles/<name>/` exists, so unknown names no longer write ledger entries.

## Validation Run

Executed targeted tests after review:
- `bun test src/handlers/stop.test.ts src/utils.stop-intent.test.ts src/update-dedupe.test.ts src/handlers/text.retry.test.ts`
- Result: 24 passed, 0 failed.

## Notes

- Update-dedupe and spawn-retry idempotency changes look correct for their intended behavior in the reviewed paths.
- No critical security issue found in this scope.
