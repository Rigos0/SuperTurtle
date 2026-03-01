## Current Task
Add command to list in `getCommandLines()` in `super_turtle/claude-telegram-bot/src/handlers/commands.ts`.

## End Goal with Specs
- /pinologs command exists and is listed in /status command list.
- When user runs /pinologs, bot replies with inline keyboard of exactly 3 buttons:
  - Info -> callback_data: pinologs:info
  - Warning -> callback_data: pinologs:warn
  - Errors -> callback_data: pinologs:error
- When a button is pressed, bot fetches Pino logs via MCP tool `pino_logs` with:
  - level = chosen level (info/warn/error)
  - limit = 50 (default)
- Bot replies with log lines (chunked for Telegram limit) or “No matching log entries.”
- Errors are handled cleanly with a user-facing message.

## Backlog
- [x] Add /pinologs command handler in `super_turtle/claude-telegram-bot/src/handlers/commands.ts`
- [x] Register /pinologs in `super_turtle/claude-telegram-bot/src/index.ts`
- [x] Add callback handler for pinologs:* in `super_turtle/claude-telegram-bot/src/handlers/callback.ts`
- [ ] Add command to list in `getCommandLines()` in `super_turtle/claude-telegram-bot/src/handlers/commands.ts` <- current
- [ ] Add tests: command list includes /pinologs + callback parses + handler shows keyboard
- [ ] Commit

## Notes
- Use InlineKeyboard from grammy for buttons.
- Reuse existing chunkText() helper from commands.ts for splitting long logs.
- MCP tool is available as `mcp__pino-logs__pino_logs` in Claude/Codex context; for bot-side callback, call the MCP tool via session API if needed, otherwise read from /tmp/claude-telegram-bot.log.jsonl via shared helper.
- Prefer server-side log read by calling checkPendingPinoLogsRequests flow (write request file in /tmp and wait for response) if MCP tool is not directly invokable from handler.
