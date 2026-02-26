# SubTurtle: codex-mcp-fix

## Current Task
Fix bug 2+3: Add MCP completion callback to codex-session.ts sendMessage, wire into codex-driver.ts for inline MCP detection and ask_user break.

## End Goal with Specs
When the Telegram bot runs on Codex as meta agent, MCP tool calls must produce visible results — inline buttons appear and stay, bot_control responses show up, stickers send. Currently: MCP tool status flashes then vanishes, buttons never render, bot_control responses silently fail.

**Acceptance criteria:**
- `bot_control` calls operate on the correct session (Codex session, not Claude session)
- `ask_user` buttons render and persist (not cleaned up by "done" callback)
- Text responses after MCP tool calls are visible
- No regressions in Claude mode
- Tests pass (`bun test` in `super_turtle/claude-telegram-bot/`)

## Root Cause Analysis (already investigated)

### Bug 1: Wrong session object passed to bot_control
**File:** `super_turtle/claude-telegram-bot/src/drivers/codex-driver.ts` lines 29 and 56
**Problem:** `checkPendingBotControlRequests(session, ...)` passes the **Claude** session import, not the Codex session. The bot_control handler calls methods like `sessionObj.model`, `sessionObj.kill()` etc on the wrong object.
**Fix:** The `checkPendingBotControlRequests` function expects a `ClaudeSession` type. We need to either:
  - Option A: Make bot_control session-agnostic (accept a simpler interface)
  - Option B: Pass the Claude session intentionally (bot_control manages bot-level concerns) — but then model switching won't affect Codex
  - Option C: Create an adapter that routes to the correct session based on active driver
**Recommended:** Option C — check which driver is active and route accordingly. For `usage` action, it works with either. For `switch_model`, `new_session`, `resume_session`, it needs to dispatch to the active driver's session.

### Bug 2: No inline MCP detection in Codex event loop
**File:** `super_turtle/claude-telegram-bot/src/codex-session.ts` lines 875-881
**Problem:** When a `mcp_tool_call` item completes, the code logs it and shows a tool status, but does NOT trigger inline MCP handlers. The background polling loop in codex-driver.ts *should* catch it, but it polls every 100ms and there's a race condition — by the time polling picks it up, the event loop may have already moved on.
**Fix:** Add inline MCP detection in the event loop (like Claude does at session.ts lines 481-534). When an `mcp_tool_call` for `ask-user` completes, set `askUserTriggered = true` and break the event loop.

### Bug 3: No event loop break for ask_user
**File:** `super_turtle/claude-telegram-bot/src/codex-session.ts`
**Problem:** Claude breaks its event loop when `askUserTriggered` is set (session.ts line 558-561). Codex has no equivalent — it keeps streaming after ask_user fires, potentially emitting more text that overwrites the button prompt.
**Fix:** Track `askUserTriggered` flag in sendMessage(), break the for-await loop when set.

### Bug 4: MCP detection needs ctx and chatId in sendMessage
**File:** `super_turtle/claude-telegram-bot/src/codex-session.ts`
**Problem:** `sendMessage()` doesn't receive `ctx` or `chatId` parameters, so it CAN'T do inline MCP detection even if we add the code. The background polling in codex-driver.ts has these params, but the session doesn't.
**Fix:** Either:
  - Pass ctx/chatId to sendMessage (changes signature)
  - OR keep all MCP detection in codex-driver.ts but make it event-driven instead of polling
**Recommended:** Add an optional callback parameter to sendMessage that fires on MCP tool completion. The driver provides the callback with ctx/chatId closure.

### Bug 5: Final flush too short
**File:** `super_turtle/claude-telegram-bot/src/drivers/codex-driver.ts` line 53
**Problem:** Only waits 100ms after turn completes. MCP server may still be writing response files.
**Fix:** Increase to 300ms and add retry logic (3 attempts like Claude does).

## Key Files
- `super_turtle/claude-telegram-bot/src/drivers/codex-driver.ts` — Codex driver with MCP polling loop
- `super_turtle/claude-telegram-bot/src/codex-session.ts` — Codex session, event loop processing
- `super_turtle/claude-telegram-bot/src/drivers/claude-driver.ts` — Claude driver (reference, don't break)
- `super_turtle/claude-telegram-bot/src/session.ts` — Claude session (reference for MCP inline detection)
- `super_turtle/claude-telegram-bot/src/handlers/streaming.ts` — checkPending*Requests functions, StatusCallback, StreamingState
- `super_turtle/claude-telegram-bot/src/handlers/text.ts` — top-level message handling
- `super_turtle/claude-telegram-bot/src/handlers/driver-routing.ts` — legacy driver routing

## Backlog
- [x] Fix bug 1: Route bot_control to correct session based on active driver
- [ ] Fix bug 2+3: Add MCP completion callback to codex-session.ts sendMessage, wire into codex-driver.ts for inline MCP detection and ask_user break <- current
- [ ] Fix bug 5: Increase final flush wait to 300ms with retry logic in codex-driver.ts
- [ ] Run `bun test` in super_turtle/claude-telegram-bot/ and fix any failures
- [ ] Verify build works (`bun run build` in bot directory)
- [ ] Commit with clear message

## Architecture Notes
- MCP tools work via file-based IPC: MCP server writes `/tmp/bot-control-*.json`, bot polls and executes
- Claude driver detects MCP calls inline during `tool_use` events and immediately checks for pending files
- Codex driver runs a background polling loop (100ms interval) that checks for pending files continuously
- The `done` statusCallback event deletes all tool messages EXCEPT ask_user prompts (which have inline keyboards)
- `checkPendingBotControlRequests` takes a `ClaudeSession` typed first arg — this is the root cause of bug 1
