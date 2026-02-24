# Current task

All core features implemented and documented. Cron system is production-ready.

# End goal with specs

A cron/scheduling system for the Telegram bot that lets the meta agent schedule future messages. When a job fires, it injects the prompt as a user message into the existing bot pipeline (same session, full context).

## Architecture

**NO MCP server.** The meta agent writes directly to `cron-jobs.json` using normal file tools. The bot's timer loop picks up due jobs automatically.

3 pieces total, all inside `super_turtle/claude-telegram-bot/`:

### 1. Job store (`src/cron.ts`) — DONE
Persistent JSON file at `super_turtle/claude-telegram-bot/cron-jobs.json`

### 2. Timer loop (in `src/index.ts`) — DONE
10s interval, checks due jobs, injects via `session.sendMessageStreaming()`

### 3. `/cron` Telegram command — DONE
- Add `handleCron` to `src/handlers/commands.ts` ✓
- Register in `src/index.ts`: `bot.command("cron", handleCron)` ✓
- Export from `src/handlers/index.ts` ✓
- Reads job store via `getJobs()` from `src/cron.ts`, formats nicely ✓
- Inline keyboard with cancel buttons: `callback_data: "cron_cancel:<job_id>"` ✓
- Handle cancel callback in `src/handlers/callback.ts` — look for `cron_cancel:` prefix, call `removeJob(id)` ✓

## Key files to modify

- `super_turtle/claude-telegram-bot/src/handlers/commands.ts` — add `handleCron`
- `super_turtle/claude-telegram-bot/src/handlers/index.ts` — export `handleCron`
- `super_turtle/claude-telegram-bot/src/handlers/callback.ts` — add `cron_cancel:` handler
- `super_turtle/claude-telegram-bot/src/index.ts` — register `bot.command("cron", handleCron)`

READ THESE FILES FIRST before making changes. Follow existing patterns exactly.

## After /cron command

Update `super_turtle/meta/META_SHARED.md` to add cron scheduling instructions. Add a section explaining:
- To schedule a job: read `super_turtle/claude-telegram-bot/cron-jobs.json`, add an entry, write it back
- Schema: `{ id, prompt, chat_id, type, interval_ms, fire_at, created_at }`
- `id`: 6 random hex chars
- `fire_at`: `Date.now() + delay_minutes * 60000`
- `chat_id`: from `TELEGRAM_CHAT_ID` env var
- For recurring: `type: "recurring"`, set `interval_ms`
- For one-shot: `type: "one-shot"`, `interval_ms: null`

Also add `/cron` to the command list in `handleStart` in commands.ts.

## Important constraints

- TypeScript, Bun, grammY framework
- Follow existing code style exactly
- Test: `cd super_turtle/claude-telegram-bot && bun build src/index.ts --outdir /tmp/test-build`
- Each backlog item = one commit

# Roadmap (Completed)

- Job store (`src/cron.ts`)
- Timer loop in `src/index.ts`

# Backlog

- [x] Add `/cron` command (handleCron in commands.ts, export in handlers/index.ts, cron_cancel in callback.ts, register in index.ts)
- [x] Update META_SHARED.md with cron scheduling instructions for the meta agent
- [x] Add `/cron` to the command list shown by `/start` handler
- [x] Verify TypeScript compiles cleanly, fix any issues
