# Current Task

Review OpenClaw's skills/ClawHub system vs our skills loader: compare architecture and identify any patterns we should adopt.

# End Goal with Specs

Produce a comprehensive research document at `docs/steipete-research.md` that:
1. Catalogs steipete's most relevant projects with what they do
2. Evaluates each for applicability to our system (SubTurtle orchestration, Telegram bot, autonomous coding agents)
3. Recommends concrete adoption actions (use the library, steal the pattern, port the idea, skip it)
4. Highlights architectural patterns from OpenClaw that could improve our system

# Context (Pre-Research)

## steipete's Key Projects (most relevant to us)

**OpenClaw** (232K stars) — Open-source autonomous AI agent, very similar concept to our system:
- Local-first Gateway WebSocket model as control plane
- Pi agent runtime with RPC mode, tool/block streaming
- Multi-agent routing with isolated workspaces per agent
- Agent-to-agent communication via `sessions_*` tools
- Three-tier skills system (bundled, managed, workspace)
- Multi-channel messaging (WhatsApp, Telegram, Slack, Discord, Signal, iMessage)
- Docker sandboxes for non-main sessions
- Model failover with auth profile rotation
- ClawHub skill registry for discovery/installation
- `/subagents spawn` command for deterministic subagent activation

**mcporter** (2.2K stars) — TypeScript MCP runtime & CLI:
- Auto-discovers MCP servers from Cursor/Claude/Codex configs
- CLI and code API for calling MCP tools
- OAuth handling with token caching
- Daemon mode for stateful servers
- CLI generation to package MCP servers as standalone tools
- Could replace our manual MCP tool integration

**agent-scripts** — Shared agent guardrail helpers:
- `committer` — disciplined git commit helper for agents
- `docs-list.ts` — docs walker with front-matter enforcement
- `browser-tools` — Chrome DevTools helper for AI agents
- AGENTS.MD pointer-style system (we already do this!)
- Zero repo-specific imports, designed to be portable

**Peekaboo** (2.4K stars) — macOS screenshot & GUI automation MCP server:
- AI agents can capture screenshots and do visual QA
- Could enable visual testing of our frontend work

**CodexBar** (6.8K stars) — macOS menubar for OpenAI/Claude usage stats:
- We already track usage programmatically — but interesting UX pattern

**VibeTunnel** — Browser-to-terminal, command agents from mobile:
- Similar to our cloudflared tunnel approach but more polished

**Poltergeist** — Universal hot reload / file watcher:
- Could improve our SubTurtle dev server management

**Oracle** (1.5K stars) — Invoke advanced LLMs with custom context:
- Similar concept to our driver abstraction

**go-cli / gog** (5K stars) — Google services in terminal:
- Gmail, Calendar, Drive, Contacts, Tasks — could be useful for agent integrations

**Brabble** — Wake-word voice daemon for macOS:
- Voice control for agents — future possibility

**CLI for iMessage** (767 stars) — iMessage from CLI:
- Another messaging channel for our bot

## Our System Architecture (for comparison)
- SubTurtle control (`ctl` command) — spawn, stop, monitor with timeouts
- State management — CLAUDE.md per agent, symlinked AGENTS.md
- Cron supervision — scheduled check-ins to monitor progress
- Loop types — slow, yolo, yolo-codex, yolo-codex-spark
- Skills system — agents can load Claude Code skills on demand
- Telegram bot as primary interface
- Cloudflared tunnels for frontend previews

# Backlog

- [x] Fetch steipete's GitHub repos page and catalog ALL repos (not just pinned)
- [x] Deep-dive OpenClaw architecture: subagent orchestration, workspace isolation, session model — compare to our SubTurtle system
- [x] Deep-dive mcporter: evaluate if we should use it for MCP tool management
- [x] Review agent-scripts repo: identify scripts we should adopt/port
- [x] Evaluate Poltergeist for our dev server / file watching needs
- [ ] Review OpenClaw's skills/ClawHub system vs our skills loader <- current
- [ ] Check VibeTunnel architecture vs our cloudflared approach
- [ ] Look at OpenClaw's Telegram integration specifically
- [ ] Write final research document to docs/steipete-research.md with recommendations
- [ ] Commit the research document
