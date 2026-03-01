## Current Task
Add `eventLog` import and `user.message.text` business event log in `src/handlers/text.ts`.

## End Goal with Specs
The bot's structured logs (at `/tmp/claude-telegram-bot.log.jsonl`) should tell the **story** of what's happening — not just technical plumbing. Every significant user-facing or system event should emit a structured Pino log line using the `eventLog` child logger (already created in `src/logger.ts`, module: "events").

**Events to add (use `eventLog.info()` with structured data):**

1. **user.message.text** — user sent a text message. Log in `src/handlers/text.ts` after auth check. Include: `{ event: "user.message.text", userId, username, chatId, messageLength: message.length }`
2. **user.message.voice** — user sent a voice message. Log in `src/handlers/voice.ts` after auth check. Include: `{ event: "user.message.voice", userId, username, chatId, durationSec: voice.duration }`
3. **user.message.photo** — user sent a photo. Log in `src/handlers/photo.ts` after auth check (for single photos, it's already partially there — ensure consistent format). Include: `{ event: "user.message.photo", userId, username, chatId }`
4. **agent.response.start** — agent started processing a message. Log in `src/handlers/driver-routing.ts` at the top of `runMessageWithDriver()`, before the retry loop. Include: `{ event: "agent.response.start", driverId: driver.id, userId: input.userId, username: input.username }`
5. **agent.response.complete** — agent finished successfully. Log in `src/handlers/driver-routing.ts` after successful `driver.runMessage()` return. Include: `{ event: "agent.response.complete", driverId: driver.id, userId: input.userId, responseLength: result.length, durationMs }`
6. **agent.response.error** — agent failed. Log in `src/handlers/driver-routing.ts` when throwing after retries exhausted. Include: `{ event: "agent.response.error", driverId: driver.id, userId: input.userId, error: String(error).slice(0, 200) }`
7. **cron.job.fired** — cron job triggered. Log in `src/index.ts` in the cron timer loop, right after remove/advance. Include: `{ event: "cron.job.fired", cronJobId: job.id, jobType: job.type, silent: !!job.silent, prompt: job.prompt.slice(0, 100) }`
8. **cron.job.scheduled** — new cron job created. Log in `src/cron.ts` in `addJob()` after pushing to cache. Include: `{ event: "cron.job.scheduled", cronJobId: job.id, jobType: type, silent: !!silent, intervalMs: interval_ms }`
9. **cron.job.deleted** — cron job removed. Log in `src/cron.ts` in `removeJob()` after splice. Include: `{ event: "cron.job.deleted", cronJobId: id }`
10. **subturtle.checkin** — SubTurtle check-in snapshot prepared. Log in `src/index.ts` in `prepareSubturtleSnapshot()` after enqueue. Include: `{ event: "subturtle.checkin", subturtleName, snapshotSeq }`

**Important notes:**
- Import `eventLog` from `../logger` (or `./logger` depending on file depth).
- Do NOT remove or change any existing log lines.
- Keep each log line surgical — one `eventLog.info(...)` call per event.
- The `eventLog` child logger is already created in `src/logger.ts`.
- After making changes, run `cd super_turtle/claude-telegram-bot && npx tsc --noEmit` to verify no TypeScript errors.
- Commit when done with message: "feat: add high-level business event logs (user messages, agent responses, cron, subturtles)"

## Backlog
- [x] Read existing logging in all target files to understand current state
- [ ] Add eventLog import + user.message.text log to text.ts <- current
- [ ] Add eventLog import + user.message.voice log to voice.ts
- [ ] Add eventLog import + user.message.photo log to photo.ts
- [ ] Add eventLog import + agent.response.start/complete/error logs to driver-routing.ts
- [ ] Add eventLog import + cron.job.fired log to index.ts cron timer
- [ ] Add eventLog import + cron.job.scheduled and cron.job.deleted logs to cron.ts
- [ ] Add eventLog + subturtle.checkin log to prepareSubturtleSnapshot in index.ts
- [ ] Run TypeScript check, fix any errors
- [ ] Commit
