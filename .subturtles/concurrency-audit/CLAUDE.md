## Current Task
Audit `handlers/streaming.ts`: `StreamingState` — is it safe if multiple status callbacks fire concurrently? Check `toolMessages` array mutations.

## End Goal with Specs
Produce a concurrency audit report at `super_turtle/docs/concurrency-audit.md` that documents:
1. Every shared mutable state variable and its access patterns
2. Any race conditions or TOCTOU bugs found (beyond the already-fixed `isQueryRunning` race in session.ts and codex-session.ts)
3. Any missing guards or unsafe concurrent access scenarios
4. Recommended fixes (with specific code locations)

The report should be concrete — file paths, line numbers, code snippets, and clear explanations of each issue.

## Backlog
- [x] Map all shared mutable state: `session.ts` (isQueryRunning, stopRequested, isActive, etc.), `codex-session.ts` (same), `deferred-queue.ts` (queues Map, drainingChats Set), `session.ts` module-level session singleton
- [x] Audit `deferred-queue.ts`: Can `drainDeferredQueue` race with `handleText`? What if two cron jobs fire simultaneously and both call `drainDeferredQueue`? Is the `drainingChats` guard sufficient?
- [x] Audit `handlers/text.ts`: The retry loop resets `state` and `statusCallback` — can a stall recovery overlap with a new incoming message? What about `session.lastMessage` being overwritten?
- [x] Audit `handlers/driver-routing.ts`: `isAnyDriverRunning()` checks both drivers — but is there a window where one driver's `isRunning` getter lags? What about `preemptBackgroundRunForUserPriority`?
- [x] Audit cron job execution in `src/index.ts`: How does the cron loop interact with active message processing? Can cron-triggered messages race with user messages?
- [ ] Audit `handlers/streaming.ts`: `StreamingState` — is it safe if multiple status callbacks fire concurrently? Check `toolMessages` array mutations. <- current
- [ ] Audit `handlers/stop.ts`: `stopAllRunningWork()` — does it cleanly handle the case where a stop races with a new message arriving?
- [ ] Audit `handlers/voice.ts` and `handlers/callback.ts`: Do they properly check `isAnyDriverRunning()` before starting work?
- [ ] Write the audit report to `super_turtle/docs/concurrency-audit.md` with findings and recommendations
- [ ] Commit the audit report

## Notes
Key context: We just fixed a TOCTOU race in both `session.ts` and `codex-session.ts` where `isQueryRunning` was set too late, allowing concurrent callers to both pass the `isAnyDriverRunning()` guard. The fix moved `isQueryRunning = true` to the top of the method. This audit is looking for ANY remaining similar patterns.

Key files to audit:
- `super_turtle/claude-telegram-bot/src/session.ts` — Claude Code session (singleton)
- `super_turtle/claude-telegram-bot/src/codex-session.ts` — Codex session (singleton)
- `super_turtle/claude-telegram-bot/src/deferred-queue.ts` — Message queueing when driver is busy
- `super_turtle/claude-telegram-bot/src/handlers/text.ts` — Main message handler with retry loop
- `super_turtle/claude-telegram-bot/src/handlers/driver-routing.ts` — Driver selection and preemption
- `super_turtle/claude-telegram-bot/src/handlers/streaming.ts` — Streaming state management
- `super_turtle/claude-telegram-bot/src/handlers/stop.ts` — Stop/abort logic
- `super_turtle/claude-telegram-bot/src/handlers/voice.ts` — Voice message handling
- `super_turtle/claude-telegram-bot/src/handlers/callback.ts` — Inline button callbacks
- `super_turtle/claude-telegram-bot/src/index.ts` — Bot setup, cron loop, middleware

This is a READ-ONLY audit — do NOT modify any source files except to create the report. All findings go into the report document.

IMPORTANT: You are on the `dev` branch. Commit to dev.
