# Code Review: Super Turtle

**Date**: 2026-03-08
**Scope**: Repository-wide review of the Super Turtle codebase
**Status**: In progress

---

## Review map

This first pass was limited to codebase discovery and review scoping. The main surfaces identified for deeper review are:

| Surface | Key files and directories | Notes |
| --- | --- | --- |
| Bot runtime | `super_turtle/claude-telegram-bot/src/index.ts`, `src/bot.ts`, `src/session.ts`, `src/codex-session.ts`, `src/config.ts`, `src/security.ts`, `src/handlers/`, `src/drivers/` | Bun + TypeScript runtime, Telegram entrypoints, driver selection, session lifecycle, security gates, and most live user flows |
| Conductor state | `super_turtle/claude-telegram-bot/src/conductor-*.ts`, `src/conductor-inbox.ts`, `src/conductor-maintenance.ts`, `src/conductor-supervisor.ts`, `src/conductor-snapshot.ts` | Durable worker state, wakeups, inbox handling, maintenance, and reconciliation logic |
| Dashboard and operator views | `super_turtle/claude-telegram-bot/src/dashboard.ts`, `super_turtle/dashboard/server.ts`, `super_turtle/claude-telegram-bot/src/dashboard-types.ts` | Two dashboard surfaces exist: the main bot dashboard module and a standalone Bun server |
| SubTurtle orchestration | `super_turtle/subturtle/ctl`, `super_turtle/subturtle/__main__.py`, `super_turtle/subturtle/subturtle_loop/agents.py`, `super_turtle/subturtle/tests/` | Python orchestration CLI, loop runner, worker lifecycle helpers, and shell/integration coverage |
| MCP tools | `super_turtle/claude-telegram-bot/bot_control_mcp/server.ts`, `super_turtle/claude-telegram-bot/send_turtle_mcp/server.ts` | Local MCP servers used by the bot runtime |
| Packaging and install surface | `README.md`, `super_turtle/package.json`, `super_turtle/README.md`, `super_turtle/bin/`, `super_turtle/setup` | Useful for cross-checking runtime assumptions against install and operator workflows |

## Repository snapshot

- The top-level product package lives under `super_turtle/`.
- The Telegram bot runtime is concentrated in `super_turtle/claude-telegram-bot/src/` with tests colocated beside implementation files.
- The standalone dashboard server currently lives outside the bot runtime in `super_turtle/dashboard/server.ts`.
- SubTurtle orchestration is a Python package plus executable scripts in `super_turtle/subturtle/`.
- Review-specific prior docs already exist under `super_turtle/docs/reviews/`, but the requested deliverable for this pass is being written to `docs/reviews/`.

## Planned review order

1. Review bot runtime handlers, session management, configuration, and driver routing.
2. Review conductor durability, wakeup delivery, maintenance, and inbox reconciliation.
3. Review SubTurtle orchestration, CLI behavior, loop control, and watchdog paths.
4. Review MCP tools and supporting utilities.
5. Consolidate prioritized findings with file paths and line numbers.

## Findings

No findings recorded in this commit. This pass established review scope, major code surfaces, and the file set for the next review iterations.
