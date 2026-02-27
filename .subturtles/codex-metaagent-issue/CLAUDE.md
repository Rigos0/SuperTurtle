## Current Task
All codex-metaagent-issue backlog items are complete; loop is stopping.

## End Goal with Specs
Find why Codex meta agent says it will do something then stops until user prompts, and implement a fix or document root cause.

## Backlog
- [x] Identify Codex meta-agent flow and scheduling triggers
- [x] Reproduce/trace stop behavior in code
- [x] Implement fix if small; otherwise document and propose next step
- [x] Update state and stop

## Notes
Look in `super_turtle/claude-telegram-bot` and meta agent loop; check cron/silent check-in behavior and driver differences.

Trace result: `handleText` could leak `session._isProcessing` when the driver fails and the fallback `ctx.reply(...)` in the catch path also throws (Telegram/API failure). That leaves `isAnyDriverRunning()` stuck `true`, which blocks cron check-ins and makes the meta-agent appear idle until a later user turn resets state.
Fix implemented: moved `handleText` cleanup into `finally` to always clear processing/typing + deferred queue drain, and added regression coverage in `src/handlers/text.cleanup.test.ts`.

## Loop Control
STOP
