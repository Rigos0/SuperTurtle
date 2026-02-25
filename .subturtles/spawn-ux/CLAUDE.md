# Current Task

Design `ctl spawn` CLI interface (flags, stdin, output).

# End Goal with Specs

Write a UX design document at `.subturtles/spawn-ux/SPAWN-UX-DESIGN.md` that proposes how to simplify the SubTurtle spawning experience. **No code — just design.**

## Context: Current Pain Points

Today, when the meta agent (Super Turtle) needs to spawn a SubTurtle, it does 5+ manual steps:
1. `mkdir -p .subturtles/<name>/`
2. Write `.subturtles/<name>/CLAUDE.md` with task state (end goal, backlog, specs)
3. `ln -sf CLAUDE.md .subturtles/<name>/AGENTS.md`
4. `./super_turtle/subturtle/ctl start <name> --type <type> --timeout <duration>`
5. Read `cron-jobs.json`, append a new recurring check-in job, write it back
6. Confirm to the user

This is verbose, error-prone, and slow. We want to collapse this into fewer steps.

## Key Design Constraints

1. **The meta agent (Claude on Telegram) is the caller** — it decides when to spawn, writes the CLAUDE.md, and manages lifecycle. The UX improvement is about making its job easier, not about exposing SubTurtles directly to the user.

2. **User should pick the SubTurtle type** — when the meta agent decides to delegate, it should present Telegram inline buttons (via `ask_user` MCP tool) so the user can choose: `yolo` / `yolo-codex` / `slow`. The meta agent can suggest a default but the user gets final say.

3. **Cron must be automatic** — spawning a SubTurtle should automatically schedule supervision. No separate step.

4. **The `ctl` script is the entry point** — any simplification should enhance `ctl`, not bypass it.

## What to Design

Write `SPAWN-UX-DESIGN.md` covering:

### 1. Proposed Flow
Step-by-step: what happens from "user says build X" to "SubTurtle is running with cron scheduled". Show the before (current) and after (proposed) flows side by side.

### 2. `ctl spawn` Command
Design a new `ctl spawn <name>` subcommand (or enhance `ctl start`) that:
- Accepts CLAUDE.md content via stdin or a file path
- Creates the workspace dir + symlink automatically
- Starts the SubTurtle
- Automatically registers a cron check-in job (writes to `cron-jobs.json`)
- Returns a confirmation summary (name, type, timeout, cron interval)

Specify the CLI interface: flags, defaults, stdin behavior, output format.

### 3. Telegram Button Flow
Design the interaction pattern for type selection:
- When should the meta agent show buttons? (Always? Only when ambiguous?)
- What button labels and descriptions?
- What happens after the user taps a button?
- Should there be a "Quick spawn" that skips the button step for obvious cases?

### 4. Cron Auto-Registration
Design how `ctl spawn` writes the cron job:
- What prompt template to use (parameterized by SubTurtle name)
- Default interval (5min) with override flag
- How to handle cleanup when SubTurtle stops (auto-remove cron entry in `ctl stop`?)

### 5. Meta Agent Behavior Changes
Describe how META_SHARED.md instructions would change:
- What the meta agent does differently in the new flow
- When it shows buttons vs auto-picks
- How the "Starting new work" section in META_SHARED.md should read

## Research First

Before designing, read these files to understand the current system:
- `super_turtle/meta/META_SHARED.md` — current meta agent instructions (spawning flow, cron scheduling)
- `super_turtle/subturtle/ctl` — current CLI interface
- `super_turtle/claude-telegram-bot/cron-jobs.json` — cron job format
- `super_turtle/claude-telegram-bot/src/mcp/ask-user-server.ts` or similar — how ask_user buttons work

# Backlog

- [x] Read META_SHARED.md, ctl script, cron-jobs.json, and ask-user MCP to understand current system
- [x] Design the proposed spawn flow (before/after comparison)
- [ ] Design `ctl spawn` CLI interface (flags, stdin, output) <- current
- [ ] Design Telegram button interaction pattern for type selection
- [ ] Design cron auto-registration and cleanup
- [ ] Design meta agent behavior changes for META_SHARED.md
- [ ] Write complete design to .subturtles/spawn-ux/SPAWN-UX-DESIGN.md
