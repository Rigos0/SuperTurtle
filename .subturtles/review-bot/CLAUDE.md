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
- [x] Read and review MCP servers (ask_user, send_turtle, bot_control)
- [x] Finalize review report and commit

## Review Completed

All five phases of the comprehensive code review have been completed. The final report documents:
- 45 total findings across all components
- 2 critical issues (race conditions in file persistence)
- 19 medium issues (error handling, type safety, validation, timing)
- 24 low issues (edge cases, efficiency, conventions)

Key findings: Race conditions in session/job persistence, security gaps in /tmp file access, widespread error handling gaps, and timing assumptions throughout the codebase.

Full details in `docs/reviews/review-bot.md`.

## Notes
- This is a READ-ONLY review. Do NOT modify any source files.
- Only create/write the review report file.
- Focus on actionable findings, not style nitpicks.

## Loop Control
STOP
