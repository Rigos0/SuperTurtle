# Telegram Bot Code Review

## Coverage (Pass 1)
Reviewed core files:
- `super_turtle/claude-telegram-bot/src/index.ts`
- `super_turtle/claude-telegram-bot/src/bot.ts`
- `super_turtle/claude-telegram-bot/src/session.ts`
- `super_turtle/claude-telegram-bot/src/codex-session.ts`

No critical issues identified in this pass.

## Findings

### 1) Overlapping cron ticks can run concurrently
- **File**: `super_turtle/claude-telegram-bot/src/index.ts`
- **Line range**: `409-639` (notably `412`)
- **Severity**: medium
- **Description**: `startCronTimer()` uses `setInterval(async () => { ... }, 10000)` with no re-entrancy guard. If one tick takes longer than 10s (slow driver turn, network delay, or long snapshot drain), the next tick starts before the previous finishes. That can cause concurrent cron processing, duplicated work, and queue races.
- **Suggested fix**: Replace `setInterval` with a self-scheduling loop (`while` + `await`) or add an `isCronTickRunning` guard to skip overlapping runs.

### 2) Session persistence writes are fire-and-forget
- **Files**:
  - `super_turtle/claude-telegram-bot/src/session.ts`
  - `super_turtle/claude-telegram-bot/src/codex-session.ts`
- **Line ranges**:
  - `session.ts:124`, `session.ts:727`
  - `codex-session.ts:39`, `codex-session.ts:1059`
- **Severity**: medium
- **Description**: `Bun.write(...)` is called without `await` in sync-looking methods wrapped in `try/catch`. This means write failures are not reliably caught by the current `catch` blocks, and process shutdown can race with pending writes (risking lost preferences/session history).
- **Suggested fix**: Make these methods async and `await Bun.write(...)`, or switch to synchronous fs writes (`writeFileSync`) where immediate durability is required.

### 3) Chat routing uses mutable process-global state
- **Files**:
  - `super_turtle/claude-telegram-bot/src/session.ts`
  - `super_turtle/claude-telegram-bot/src/drivers/codex-driver.ts`
- **Line ranges**:
  - `session.ts:303`
  - `codex-driver.ts:22`
- **Severity**: low
- **Description**: Both drivers set `process.env.TELEGRAM_CHAT_ID` per request. This is shared mutable global state; concurrent turns (or future multi-chat evolution) can overwrite it mid-run and route MCP side effects to the wrong chat.
- **Suggested fix**: Pass `chatId` explicitly through tool/MCP request payloads or scoped context files, and avoid per-request mutation of `process.env`.

## Next Review Scope
- `src/cron.ts`
- `src/cron-supervision-queue.ts`
- `src/silent-notifications.ts`
