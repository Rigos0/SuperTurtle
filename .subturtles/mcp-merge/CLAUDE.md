## Current Task
Merge `ask_user` tool handler into `bot_control_mcp/server.ts` (add ListTools + CallTool entries).

## End Goal with Specs
- `bot-control` MCP server exposes all tools from `bot_control`, `pino_logs`, and `ask_user` in a single server process
- `send-turtle` stays as its own separate server (unchanged)
- `mcp-config.ts` exports only 2 servers: `send-turtle` and `bot-control`
- All existing tool names/schemas stay identical so Claude and Codex prompts don't break:
  - `bot_control` (action param: usage, switch_model, switch_driver, new_session, list_sessions, resume_session, restart)
  - `pino_logs` (params: level, levels, limit, module)
  - `ask_user` (params: question, options)
- The bot-side polling in `src/handlers/streaming.ts` continues to work (file-based IPC via `/tmp/` JSON files)
- All tests pass after the merge
- Old `ask_user_mcp/` and `pino_logs_mcp/` directories are deleted

## Backlog
- [x] Read all 3 server files to understand tool definitions: `bot_control_mcp/server.ts`, `ask_user_mcp/server.ts`, `pino_logs_mcp/server.ts`
- [ ] Merge `ask_user` tool handler into `bot_control_mcp/server.ts` (add ListTools + CallTool entries) <- current
- [ ] Merge `pino_logs` tool handler into `bot_control_mcp/server.ts` (add ListTools + CallTool entries)
- [ ] Update `mcp-config.ts` to remove `ask-user` and `pino-logs` entries (keep only `send-turtle` and `bot-control`)
- [ ] Update `src/codex-session.ts` if it references removed server names (e.g. in `hasExistingMcpConfig`)
- [ ] Update `src/drivers/codex-driver.ts` — the `mcpCompletionCallback` references server names; update them
- [ ] Update `src/drivers/claude-driver.ts` if it references the old server names
- [ ] Search for any other references to `ask-user` or `pino-logs` as server names across the codebase and update
- [ ] Delete `ask_user_mcp/` and `pino_logs_mcp/` directories
- [ ] Run tests: `bun test` in `super_turtle/claude-telegram-bot/`
- [ ] Fix any test failures
- [ ] Commit with clear message

## Notes
- Files are at: `super_turtle/claude-telegram-bot/`
- The servers use file-based IPC: they write JSON to `/tmp/{tool}-{uuid}.json`, the bot polls and handles
- Tool names in the MCP protocol must stay the same (`ask_user`, `pino_logs`, `bot_control`) — only the server name changes
- The `mcpCompletionCallback` in codex-driver.ts checks `item.server` — after merge, ask_user and pino_logs will report server as `bot-control` instead of `ask-user`/`pino-logs`. Update the callback to check `item.tool` (normalized) instead of `item.server`.
- The `IS_MCP_SERVER` detection in `src/logger.ts` uses `Bun.main?.includes("_mcp/")` — `bot_control_mcp/server.ts` already matches this, so no logger change needed.
