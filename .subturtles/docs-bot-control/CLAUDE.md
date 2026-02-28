# Current Task
Backlog complete. Append loop stop marker and stop.

## End Goal with Specs
The `bot_control` MCP tool is the most important part of the system — it controls sessions, models, drivers, and restarts. The docs should fully explain every action, parameters, and behavior.

**Problems to fix:**
1. `docs/bot/mcp-tools.mdx` has only 5 bullet points for `bot_control` — needs full action reference
2. `send_turtle` section title says "Spawn SubTurtles" but it actually sends Emoji Kitchen turtle stickers — fix this
3. `bot_control` actions are not individually documented: `usage`, `switch_model`, `switch_driver`, `new_session`, `list_sessions`, `resume_session`, `restart`
4. No documentation of the IPC mechanism (file-based via /tmp)
5. Missing: what each action returns, what params it takes

**Source of truth (read these to get accurate info):**
- `super_turtle/claude-telegram-bot/bot_control_mcp/server.ts` — the MCP server implementation with all actions
- `super_turtle/claude-telegram-bot/src/handlers/streaming.ts` — `checkPendingBotControlRequests()` for IPC handling
- `super_turtle/claude-telegram-bot/send_turtle_mcp/server.ts` — actual send_turtle implementation
- `super_turtle/claude-telegram-bot/ask_user_mcp/server.ts` — ask_user implementation

**Acceptance criteria:**
- Every `bot_control` action has: description, parameters (if any), example usage, what it returns
- `send_turtle` section correctly describes emoji sticker sending (not SubTurtle spawning)
- `ask_user` section is accurate
- Documentation reads well for a user who has never seen the system
- No made-up info — everything must match the source code

## Backlog
- [x] Read bot_control_mcp/server.ts to understand all actions and params
- [x] Read send_turtle_mcp/server.ts and ask_user_mcp/server.ts for accuracy
- [x] Read current docs/bot/mcp-tools.mdx to understand existing structure
- [x] Rewrite bot_control section with full action reference table and descriptions
- [x] Fix send_turtle section (rename from "Spawn SubTurtles" to correct description)
- [x] Review ask_user section for accuracy
- [x] Also check docs/bot/commands.mdx references bot_control, update if needed
- [x] Commit changes
