## Current Task
Read super_turtle/claude-telegram-bot/SECURITY.md for content.

## End Goal with Specs
Create 9 documentation pages covering the Telegram bot and configuration. Pages go in `docs/bot/` and `docs/config/` as `.mdx` files. Use Mintlify MDX syntax (supports `<Steps>`, `<Card>`, `<CardGroup>`, `<Tip>`, `<Warning>`, `<Note>`, `<Info>`, `<Accordion>`, `<Tabs>`, `<Tab>`).

**Style guidance:**
- Developer-focused, concise, lots of code blocks
- Reference super_turtle/claude-telegram-bot/README.md and SECURITY.md for accuracy
- Use tables for command references, env var lists

**Bot pages (docs/bot/):**

1. `overview.mdx` — What the bot does, features list (text, voice, photos, docs, video, streaming, buttons), demo GIF reference, quick start link
2. `commands.mdx` — Full command reference table (/new, /status, /model, /switch, /usage, /context, /resume, /sub, /cron, /restart, /looplogs, /stop). Include what each returns.
3. `drivers.mdx` — Claude Code vs Codex driver system. How /switch works. Model selection. Reasoning effort levels. When to use which.
4. `mcp-tools.mdx` — Built-in MCP servers (ask_user for interactive buttons, bot_control for session management, send_turtle for notifications). How to add custom MCP servers. mcp-config.ts setup.
5. `personal-assistant.mdx` — How to use as a personal assistant (custom CLAUDE.md, working directory, MCP tools for Things/Notion/etc). Pull from docs/personal-assistant-guide.md if it exists.
6. `running-as-service.mdx` — macOS LaunchAgent setup, Linux systemd setup, dev mode with bun run dev. Shell aliases. Logging.

**Config pages (docs/config/):**

7. `environment-variables.mdx` — Full env var reference table. Group by: Required, Recommended, Codex, Security, Voice, Rate Limiting, Dashboard. Pull from .env.example.
8. `security.mdx` — Security model: user allowlist, path validation, command blocking, rate limiting, audit logging, intent classification. The "runs with all permissions bypassed" warning. Pull from SECURITY.md.
9. `platform-support.mdx` — macOS, Linux, Windows (via Git Bash) support status. What works where. The caffeinate/systemd-inhibit story. Keychain differences. Codex binary resolution.

## Backlog
- [x] Read super_turtle/claude-telegram-bot/README.md for content
- [ ] Read super_turtle/claude-telegram-bot/SECURITY.md <- current
- [ ] Read super_turtle/claude-telegram-bot/.env.example
- [ ] Write docs/bot/overview.mdx
- [ ] Write docs/bot/commands.mdx
- [ ] Write docs/bot/drivers.mdx
- [ ] Write docs/bot/mcp-tools.mdx
- [ ] Write docs/bot/personal-assistant.mdx
- [ ] Write docs/bot/running-as-service.mdx
- [ ] Write docs/config/environment-variables.mdx
- [ ] Write docs/config/security.mdx
- [ ] Write docs/config/platform-support.mdx
- [ ] Commit

## Notes
- Repo root: /Users/Richard.Mladek/Documents/projects/agentic
- Key source files: super_turtle/claude-telegram-bot/README.md, SECURITY.md, .env.example, src/config.ts, src/handlers/commands.ts
- docs.json navigation already points to these page slugs
- Use .mdx extension
