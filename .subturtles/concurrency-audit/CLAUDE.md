## Current Task
Write the consolidated audit report to `super_turtle/docs/concurrency-audit.md` by gathering findings from prior commits into one document with clear sections and actionable recommendations.

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
- [x] Audit `handlers/streaming.ts`: `StreamingState` — is it safe if multiple status callbacks fire concurrently? Check `toolMessages` array mutations.
- [x] Audit `handlers/stop.ts`: `stopAllRunningWork()` — does it cleanly handle the case where a stop races with a new message arriving?
- [x] Audit `handlers/voice.ts` and `handlers/callback.ts`: Do they properly check `isAnyDriverRunning()` before starting work?
- [ ] Write the consolidated audit report to `super_turtle/docs/concurrency-audit.md` — gather all findings from previous commits (see git log) into one document with sections: Shared State Map, Findings (each with severity, file, line, description, recommended fix), and Summary <- current
- [ ] Commit the audit report

## Notes
Previous iterations already committed individual audit findings. Check `git log --oneline -10` for commits like "docs: map shared mutable state", "Audit deferred queue concurrency", etc. The final report should consolidate ALL of those findings into one clean document.

Code-module auditing is complete; remaining work is report consolidation and final audit-report commit.

This is a READ-ONLY audit — do NOT modify any source files except to create the report. All findings go into the report document.

IMPORTANT: You are on the `dev` branch. Commit to dev.
