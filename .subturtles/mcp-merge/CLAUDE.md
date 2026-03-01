## Current Task
Update `mcp-config.ts`: remove `ask-user` and `pino-logs` entries. Only `send-turtle` and `bot-control` remain.

## End Goal with Specs
- `bot-control` MCP server exposes ALL tools from `bot_control`, `pino_logs`, and `ask_user` in a single server process
- `send-turtle` stays as its own separate server (unchanged)
- `mcp-config.ts` exports only 2 servers: `send-turtle` and `bot-control`
- All existing tool names/schemas stay IDENTICAL so Claude and Codex prompts don't break:
  - `bot_control` (action param: usage, switch_model, switch_driver, new_session, list_sessions, resume_session, restart)
  - `pino_logs` (params: level, levels, limit, module)
  - `ask_user` (params: question, options)
- The bot-side polling in `src/handlers/streaming.ts` continues to work (file-based IPC via `/tmp/` JSON files)
- All tests pass after the merge (`bun test` in `super_turtle/claude-telegram-bot/`)
- Old `ask_user_mcp/` and `pino_logs_mcp/` directories are deleted after everything works

## Backlog
- [x] Read the 3 source server files to understand their full tool definitions and imports: `bot_control_mcp/server.ts`, `ask_user_mcp/server.ts`, `pino_logs_mcp/server.ts`
- [x] Add `ask_user` tool to `bot_control_mcp/server.ts`: copy the ListTools entry and CallTool handler from `ask_user_mcp/server.ts`. Keep the `/tmp/ask-user-{uuid}.json` file pattern and the exact response text.
- [x] Add `pino_logs` tool to `bot_control_mcp/server.ts`: copy the ListTools entry and CallTool handler from `pino_logs_mcp/server.ts`. Keep the `/tmp/pino-logs-{uuid}.json` file pattern.
- [ ] Update `mcp-config.ts`: remove `ask-user` and `pino-logs` entries. Only `send-turtle` and `bot-control` remain. <- current
- [ ] Update `src/codex-session.ts`: in `hasExistingMcpConfig()`, update the `ourServers` array to only check for `send-turtle` and `bot-control`.
- [ ] Update `src/drivers/codex-driver.ts`: the `mcpCompletionCallback` currently checks `item.server` to route tool completions. After merge, `ask_user` and `pino_logs` tool calls will come from server `bot-control`. Change routing to use `normalizedTool` (which is already computed from `item.tool`) instead of `item.server`.
- [ ] Update `src/drivers/claude-driver.ts`: check if it references old server names and update if needed.
- [ ] Search codebase for any remaining references to `"ask-user"` or `"pino-logs"` as MCP server names (grep for them) and update.
- [ ] Update `src/mcp-transport.test.ts`: the `MCP_SERVERS` array lists all 4 servers for stdout purity tests. Remove `ask-user` and `pino-logs` entries (they no longer exist as separate servers).
- [ ] Run `bun test` in `super_turtle/claude-telegram-bot/` — fix ALL failures before proceeding.
- [ ] Delete `ask_user_mcp/` directory: `rm -rf super_turtle/claude-telegram-bot/ask_user_mcp/`
- [ ] Delete `pino_logs_mcp/` directory: `rm -rf super_turtle/claude-telegram-bot/pino_logs_mcp/`
- [ ] Run `bun test` again to confirm nothing broke from the deletions.
- [ ] Commit everything with message: `refactor(mcp): consolidate ask-user and pino-logs into bot-control server`

## Notes
- All files are under: `super_turtle/claude-telegram-bot/`
- The servers use file-based IPC: they write JSON to `/tmp/{tool}-{uuid}.json`, the bot polls and handles them in `src/handlers/streaming.ts`
- Tool names in the MCP protocol MUST stay the same (`ask_user`, `pino_logs`, `bot_control`) — only the server name changes
- The `mcpCompletionCallback` in codex-driver.ts currently checks `item.server` to decide which handler to run. After the merge, tools `ask_user` and `pino_logs` will report `server: "bot-control"`. The callback ALREADY computes `normalizedTool = tool.replace(/-/g, "_")` and checks it — so just make sure the routing uses `normalizedTool`, not `server`.
- The `IS_MCP_SERVER` detection in `src/logger.ts` uses `Bun.main?.includes("_mcp/")` — `bot_control_mcp/server.ts` matches this, so no logger change needed.
- IMPORTANT: Do NOT modify `send_turtle_mcp/` — it stays as-is.
- IMPORTANT: Run tests BEFORE deleting old directories, to catch reference issues while the old files still exist.
