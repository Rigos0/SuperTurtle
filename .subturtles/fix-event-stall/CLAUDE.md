## Current Task
All backlog items complete for this SubTurtle. Waiting for next assignment.

## End Goal with Specs
When the Claude Agent SDK stops emitting events mid-turn (without closing the stream), the bot should detect the stall after a timeout, break out of the event loop, and flush whatever response text has been accumulated to the user. Currently, it hangs indefinitely until the user manually stops.

**Root cause:** `session.ts` line 394 — `for await (const event of queryInstance)` has no timeout. If the SDK generator stalls (no events, stream not closed), the loop waits forever. The typing indicator keeps firing, making it look like the bot is working. When the user hits "stop", `this.stopRequested` breaks the loop and the accumulated text gets flushed at line 626 — proving the text IS there, it just never gets sent.

**Fix approach:** Wrap the event consumption with a stall-detection timeout. After each event, reset a timer. If no event arrives within N seconds (e.g., 30s), assume the stream has stalled, log a warning, and break out of the loop. The existing post-loop code (lines 625-632) will then flush the accumulated response text to Telegram.

**Key file:** `super_turtle/claude-telegram-bot/src/session.ts`

**Concrete implementation:**
1. Before the `for await` loop (line 394), create a stall detection mechanism using `AbortController` or a simple timeout wrapper.
2. The approach: wrap the async iterator with a helper that races each `next()` call against a timeout. If the timeout wins, break the loop.
3. Something like:
```typescript
const STALL_TIMEOUT_MS = 30_000; // 30 seconds with no events = stalled

for await (const event of queryInstance) {
  // ... existing event handling ...
}
```
becomes:
```typescript
const STALL_TIMEOUT_MS = 30_000;
let stallTimer: ReturnType<typeof setTimeout> | null = null;
let stalled = false;

const resetStallTimer = () => {
  if (stallTimer) clearTimeout(stallTimer);
  stallTimer = setTimeout(() => {
    console.warn("Event stream stalled — no events for 30s, breaking out");
    stalled = true;
    // Abort the underlying SDK query to unblock the iterator
    this.abortController?.abort();
  }, STALL_TIMEOUT_MS);
};

resetStallTimer();

for await (const event of queryInstance) {
  resetStallTimer();

  if (this.stopRequested || stalled) {
    if (stalled) console.log("Breaking out of stalled event loop");
    break;
  }

  // ... rest of existing event handling unchanged ...
}

if (stallTimer) clearTimeout(stallTimer);
```
4. In the catch block (line 585-607), treat stall-abort the same as post-completion: if `stalled` is true and we have accumulated text, suppress the error and let the finally/post-loop code flush the response.
5. After the loop, add a log line if `stalled` is true so we can track how often this happens.

**Acceptance criteria:**
- When the SDK stream stalls for 30+ seconds, the bot breaks out and sends accumulated text to the user instead of hanging.
- Normal (non-stalled) responses are completely unaffected — the timer resets on every event so it never fires during active streaming.
- The typing indicator stops after the stall recovery.
- When `stopRequested` is used (user hits stop), behavior is unchanged.
- No regressions — test by sending a normal message and confirming the response arrives as before.

## Backlog
- [x] Read the full `sendMessageStreaming` method in `session.ts` to understand the exact event loop and error handling
- [x] Implement stall timeout: add timer that resets on each event, aborts after 30s of silence
- [x] Update the catch block to handle stall-abort gracefully (suppress error, flush text)
- [x] Add a log line when stall recovery fires so we can monitor frequency
- [x] Test: send a normal message, confirm response arrives normally (no false triggers)
- [x] Commit with clear message

Progress note: Added `src/session.stall-timeout.test.ts` and passed `bun test src/session.stall-timeout.test.ts`, verifying normal streaming does not false-trigger stall recovery. `bun run typecheck` still fails due unrelated pre-existing repository errors (`src/dashboard.ts` type mismatch and broader TS config/dependency issues).

## Notes
- File: `super_turtle/claude-telegram-bot/src/session.ts`
- The `for await` loop is at line 394
- Post-loop flush is at lines 625-632
- Error handling is at lines 585-607
- `this.abortController` is already set up before the loop — aborting it should unblock the iterator
- `this.stopRequested` check at line 396 is the existing manual-stop mechanism — stall detection is analogous
- 30 seconds is conservative — normal tool executions (even long Bash commands) emit events within seconds. A 30s gap means something is genuinely stuck.

## Loop Control
STOP
