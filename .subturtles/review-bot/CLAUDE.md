# Code Review: Telegram Bot Core

## Current Task
Read and review cron system files: `cron.ts`, `cron-supervision-queue.ts`, and `silent-notifications.ts`.

## End Goal with Specs
Produce a structured code review report committed to `docs/reviews/review-bot.md`. The report should cover:
- **Critical issues** (bugs, race conditions, data loss risks)
- **Error handling gaps** (unhandled promises, missing try/catch, swallowed errors)
- **Dead code** (unused exports, unreachable branches, commented-out code)
- **Consistency issues** (naming, patterns, style drift between files)
- **Improvement suggestions** (refactoring opportunities, simplifications)

Each finding should include: file path, line range, severity (critical/medium/low), description, and suggested fix.

## Scope
All TypeScript source files under `super_turtle/claude-telegram-bot/src/`:
- `src/index.ts`, `src/bot.ts`, `src/session.ts`, `src/codex-session.ts`
- `src/cron.ts`, `src/cron-supervision-queue.ts`, `src/silent-notifications.ts`, `src/dashboard.ts`
- `src/handlers/` — all handler files (text, commands, streaming, driver-routing, audio, photo, video, voice, document, media-group, callback)
- `src/drivers/` — registry, types, claude-driver, codex-driver
- MCP servers: `ask_user_mcp/`, `send_turtle_mcp/`, `bot_control_mcp/`

## Backlog
- [x] Read and review core files: index.ts, bot.ts, session.ts, codex-session.ts
- [ ] Read and review cron system: cron.ts, cron-supervision-queue.ts, silent-notifications.ts <- current
- [ ] Read and review all handlers in src/handlers/
- [ ] Read and review driver layer: drivers/registry.ts, types.ts, claude-driver.ts, codex-driver.ts
- [ ] Read and review MCP servers (ask_user, send_turtle, bot_control)
- [ ] Write structured review report to docs/reviews/review-bot.md
- [ ] Commit the review report

## Notes
- This is a READ-ONLY review. Do NOT modify any source files.
- Only create/write the review report file.
- Focus on actionable findings, not style nitpicks.
