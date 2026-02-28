## Current Task
Fix `docs/bot/drivers.mdx` by reading `codex-session.ts` and `config.ts` for real model names/defaults, and remove speculative driver/model claims.

## End Goal with Specs
Every page in `docs/bot/` must match the actual implementation in `super_turtle/claude-telegram-bot/src/`. No speculative info, no wrong aliases, no missing commands.

## Backlog
- [x] Fix docs/bot/commands.mdx: change /sub aliases from "subs, subtitles" to "subs, subturtle, subturtles, turtle, turtles". Add /debug command. Verify /cron alias exists in source. Remove any wrong aliases. Cross-check every command against handlers in commands.ts
- [ ] Fix docs/bot/drivers.mdx: read codex-session.ts and config.ts to get actual model names. Replace speculative model lists with real ones. Update any "Claude 4.0" references. <- current
- [ ] Review docs/bot/overview.mdx: verify features list against current handlers. Remove "Demo GIF coming soon" if present. Ensure voice/photo/document handling descriptions match current code.
- [ ] Review docs/bot/mcp-tools.mdx: verify MCP tool descriptions match actual mcp-config.ts
- [ ] Review docs/bot/personal-assistant.mdx and docs/bot/running-as-service.mdx for accuracy
- [ ] Commit changes

## Notes
Key source files to cross-reference:
- super_turtle/claude-telegram-bot/src/handlers/commands.ts (all command handlers)
- super_turtle/claude-telegram-bot/src/codex-session.ts (Codex models and session)
- super_turtle/claude-telegram-bot/src/config.ts (env vars and defaults)
- super_turtle/claude-telegram-bot/src/handlers/callback.ts (inline button callbacks)
- super_turtle/claude-telegram-bot/mcp-config.ts (MCP tool definitions)

IMPORTANT: You are on the `dev` branch. All commits go to dev.
