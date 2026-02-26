## Current Task
All backlog items complete. Loop stopped.

## End Goal with Specs
- Codex meta agent can call bot-control without timing out.
- ask_user buttons appear and remain until a user taps one (no disappearing messages).
- Works in Telegram via codex driver path.

## Backlog
- [x] Inspect Codex driver flow and MCP handling (files below)
- [x] Reproduce/trace: pending MCP request files in /tmp and Telegram output
- [x] Fix logic so bot-control requests are processed for Codex driver
- [x] Fix ask_user button message lifecycle so it is not deleted/overwritten
- [x] Add/adjust tests if feasible (formatting/test or unit tests for MCP handling)
- [x] Manual verification notes in CLAUDE.md

## Notes
User symptom: In Telegram, buttons appear briefly then disappear. Codex meta agent cannot use bot-control MCP (timeouts). Claude Code path works.

Progress (2026-02-26): Codex driver now runs a concurrent MCP request pump during `sendMessage` so `/tmp/bot-control-*.json` requests are handled before MCP poll timeout. This removes the tool-call deadlock where requests were previously only processed after the turn completed.
Progress (2026-02-26): Added Codex flow integration coverage to assert pending `bot-control` MCP requests are completed during a Codex turn, alongside existing ask_user/streaming checks.
Manual verification (2026-02-26):
- Ran `bun test src/handlers/codex.flow.test.ts` in `super_turtle/claude-telegram-bot` (pass): verifies Codex switch/message/streaming/MCP/model-switch/stop/resume path.
- Ran `bun test src/handlers/commands.usage.test.ts` in `super_turtle/claude-telegram-bot` (pass): verifies `/usage` formatting/status behavior in Codex-enabled and Codex-disabled flows.

## Files
super_turtle/claude-telegram-bot/src/drivers/codex-driver.ts
super_turtle/claude-telegram-bot/src/session.ts
super_turtle/claude-telegram-bot/src/handlers/streaming.ts
super_turtle/claude-telegram-bot/src/handlers/text.ts
super_turtle/claude-telegram-bot/ask_user_mcp/server.ts
super_turtle/claude-telegram-bot/bot_control_mcp/server.ts

## Loop Control
STOP
