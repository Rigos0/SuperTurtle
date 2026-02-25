## Current Task
Add the silent flag detection: modify `handleText` in `src/handlers/text.ts` to accept an optional `silent` parameter, or create a parallel `handleSilentText` function. The key change: use `createSilentStatusCallback` instead of `createStatusCallback` when silent=true.

## End Goal with Specs
The bot can process cron-triggered Claude sessions silently — no output to Telegram unless Claude's response contains a notification marker. This enables background supervision without chat spam.

**How it works:**
1. Cron jobs in `cron-jobs.json` can have `"silent": true`
2. When the bot fires a silent cron job, it creates a capturing status callback (not the Telegram-sending one)
3. Claude processes the prompt normally (runs tools, checks status, etc.)
4. After Claude finishes, the bot inspects the captured response text
5. If the response contains notification markers (🎉, ⚠️, ❌, 🚀, 🔔), send ONLY that text to Telegram
6. If the response is just "still running, all good" type content, discard it silently

**Acceptance criteria:**
- Silent cron jobs don't produce any Telegram messages when SubTurtle is just progressing normally
- Silent cron jobs DO produce a Telegram message when there's completion, error, stuck, or milestone news
- Non-silent cron jobs (and regular user messages) work exactly as before — no regression
- The bot still shows "typing..." indicator during silent processing (so the user knows something happened if they're watching)

## Backlog
- [x] Read and understand the current message flow: `src/index.ts` (cron timer, lines 112-186), `src/handlers/text.ts` (handleText), `src/handlers/streaming.ts` (createStatusCallback), `src/session.ts` (sendMessageStreaming)
- [x] Add `silent?: boolean` field support to cron job schema — update `getDueJobs()` and related functions in `src/handlers/commands.ts` or wherever cron utils live
- [x] Create `createSilentStatusCallback()` in `src/handlers/streaming.ts` — same signature as `createStatusCallback` but captures text to a buffer instead of sending to Telegram. Must still track segment text so we can inspect it after completion.
- [x] Modify the cron timer in `src/index.ts` (around line 161) — when firing a silent job, pass the silent callback to `handleText` or directly call session processing with the silent callback. After processing completes, check if captured response contains notification markers (🎉⚠️❌🚀🔔). If yes, send captured text to Telegram. If no, discard silently.
- [ ] Add the silent flag detection: modify `handleText` in `src/handlers/text.ts` to accept an optional `silent` parameter, or create a parallel `handleSilentText` function. The key change: use `createSilentStatusCallback` instead of `createStatusCallback` when silent=true. <- current
- [ ] Test: verify non-silent messages still work (no regression). Verify a silent cron job with "still progressing" response produces no Telegram output. Verify a silent cron job with "🎉 SubTurtle finished" produces a Telegram message.
- [ ] Commit all changes with clear message

## Notes
- **Key files:**
  - `super_turtle/claude-telegram-bot/src/index.ts` — cron timer loop (line 112-186)
  - `super_turtle/claude-telegram-bot/src/handlers/text.ts` — message handler
  - `super_turtle/claude-telegram-bot/src/handlers/streaming.ts` — status callback that sends to Telegram
  - `super_turtle/claude-telegram-bot/src/session.ts` — Claude SDK session management
- The notification markers to detect: 🎉 (finished), ⚠️ (stuck), ❌ (error), 🚀 (started), 🔔 (alert)
- Do NOT break existing non-silent message flow — this must be backward compatible
- The `handleText` function currently takes a grammY Context object. For silent mode, the context's `reply()` method should either be a no-op or a buffer capture.
