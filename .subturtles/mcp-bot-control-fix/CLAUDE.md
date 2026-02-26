## Current Task
Fix ask_user button message lifecycle so it is not deleted/overwritten.

## End Goal with Specs
- Codex meta agent can call bot-control without timing out.
- ask_user buttons appear and remain until a user taps one (no disappearing messages).
- Works in Telegram via codex driver path.

## Backlog
- [x] Inspect Codex driver flow and MCP handling (files below)
- [x] Reproduce/trace: pending MCP request files in /tmp and Telegram output
- [x] Fix logic so bot-control requests are processed for Codex driver
- [ ] Fix ask_user button message lifecycle so it is not deleted/overwritten <- current
- [ ] Add/adjust tests if feasible (formatting/test or unit tests for MCP handling)
- [ ] Manual verification notes in CLAUDE.md

## Notes
User symptom: In Telegram, buttons appear briefly then disappear. Codex meta agent cannot use bot-control MCP (timeouts). Claude Code path works.

Progress (2026-02-26): Codex driver now runs a concurrent MCP request pump during `sendMessage` so `/tmp/bot-control-*.json` requests are handled before MCP poll timeout. This removes the tool-call deadlock where requests were previously only processed after the turn completed.

## Files
super_turtle/claude-telegram-bot/src/drivers/codex-driver.ts
super_turtle/claude-telegram-bot/src/session.ts
super_turtle/claude-telegram-bot/src/handlers/streaming.ts
super_turtle/claude-telegram-bot/src/handlers/text.ts
super_turtle/claude-telegram-bot/ask_user_mcp/server.ts
super_turtle/claude-telegram-bot/bot_control_mcp/server.ts
