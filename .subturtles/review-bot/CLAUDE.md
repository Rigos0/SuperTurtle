# Code Review: Telegram Bot Core

## Current Task
Review the Telegram bot codebase for code quality issues: bugs, race conditions, error handling gaps, dead code, inconsistencies, and potential improvements.

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
- [x] Read and review cron system: cron.ts, cron-supervision-queue.ts, silent-notifications.ts
- [x] Read and review all handlers in src/handlers/
- [x] Read and review driver layer: drivers/registry.ts, types.ts, claude-driver.ts, codex-driver.ts
- [ ] Read and review MCP servers (ask_user, send_turtle, bot_control) <- current
- [ ] Finalize review report and commit
- [ ] Stop when all backlog items complete

## Notes
- This is a READ-ONLY review. Do NOT modify any source files.
- Only create/write the review report file.
- Focus on actionable findings, not style nitpicks.
