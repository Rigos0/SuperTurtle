<p align="center">
  <img src="assets/readme-stickers/hero-double-turtle.png" width="160" alt="superturtle" />
</p>

<h3 align="center">superturtle</h3>
<p align="center">Coding agent on your phone.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/superturtle"><img src="https://img.shields.io/npm/v/superturtle?style=flat-square&label=npm" alt="npm" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT License" /></a>
  <a href="https://www.superturtle.dev/docs"><img src="https://img.shields.io/badge/docs-superturtle.dev-blue?style=flat-square" alt="Docs" /></a>
</p>

---

SuperTurtle is an autonomous coding agent you control from Telegram. Send a voice message or text from your phone, and SuperTurtle gets to work on your machine using [Codex](https://openai.com/index/introducing-codex/) and [Claude Code](https://claude.ai/code). Whether you're on the couch, out for a walk, or on a different machine entirely, SuperTurtle keeps the work moving. For bigger tasks it spins up parallel workers called SubTurtles and supervises them to completion. You get milestone updates as things land, not a wall of logs.

## Install

```bash
npm install -g superturtle
superturtle init
superturtle start
```

For normal local use, `superturtle start` is the command that makes the bot run continuously. Use `superturtle stop` to stop it.

For agents and CI, init runs non-interactively with flags:

```bash
superturtle init --token <BOT_TOKEN> --user <TELEGRAM_USER_ID> --openai-key <KEY>
```

### Prerequisites

- [Bun](https://bun.sh) ≥ 1.0
- [tmux](https://github.com/tmux/tmux) — `brew install tmux`
- [Codex](https://openai.com/index/introducing-codex/) CLI and [Claude Code](https://claude.ai/code) CLI — both recommended; Codex is currently the stronger default

<p align="center">
  <img src="assets/readme-stickers/setup-save-turtle.png" width="108" alt="Setup" />
</p>

## Why superturtle

1. **Codex + Claude Code in one runtime** — one Telegram-native workflow across both.
2. **Phone-first remote coding** — text or voice from Telegram.
3. **Parallel SubTurtles** — long-running work split into autonomous workers.
4. **Spec-driven loops** — enforced `CLAUDE.md` backlog structure with auto-stop to avoid drift.
5. **Progress, not log spam** — milestone updates instead of a wall of output.

## Architecture

- **Meta Agent** — the bot itself. Plans, delegates, supervises.
- **SubTurtles** — autonomous workers running in ralph loops (yolo, slow, yolo-codex, yolo-codex-spark).
- **Conductor state** — durable worker lifecycle/event state in `.superturtle/state/` with wakeup/inbox delivery.
- **MCP servers** — stickers, bot-control, ask-user (inline buttons).
- **Drivers** — Codex and Claude Code, combined in one runtime.

<p align="center">
  <img src="assets/readme-stickers/architecture-gear-turtle.png" width="108" alt="Architecture" />
</p>

## SuperTurtle vs OpenClaw

OpenClaw is broader across channels. SuperTurtle is intentionally narrower: Telegram-first, built around the headless coding CLI pattern, with a roadmap toward native sandboxing and native remote session mobility.

| Feature | SuperTurtle | OpenClaw |
|---------|-------------|----------|
| Telegram control | ✅ | ✅ |
| More chat apps: WhatsApp, iMessage, Discord | ❌ | ✅ |
| Self-hosted | ✅ | ✅ |
| Runs coding agents on your own machine | ✅ | ✅ |
| Custom skills, connectors, and MCPs | ✅ | ✅ |
| Persistent remote VM in one command | 🔜 | ❌ |
| Plugin / channel ecosystem | ❌ | ✅ |

## Headless CLI Pattern

SuperTurtle uses the headless CLI pattern for everything.

Under the hood, that looks like:

```bash
claude -p "fix the failing test" --output-format stream-json
codex exec --full-auto "fix the failing test"
```

## SubTurtles

SubTurtles are autonomous worker agents that run in isolated loops. The Meta Agent spawns them for bounded tasks, while the conductor owns durable worker lifecycle state and recovery. Each SubTurtle gets its own working directory under `.subturtles/` with a task file, `CLAUDE.md`, and logs, while canonical orchestration state lives under `.superturtle/state/`.

SubTurtles are spec-driven through an enforced `CLAUDE.md` backlog structure, and they auto-stop when the work is done to avoid drift.

Loop types:

- **yolo** — single Claude Code call per iteration. Fast, autonomous ralph loop.
- **slow** — plan, groom, execute, review. Four agent calls per iteration. More careful, better for complex or risky work.
- **yolo-codex** — same as yolo but runs Codex instead of Claude. The default for straightforward coding tasks.
- **yolo-codex-spark** — same as yolo-codex but with Codex Spark for faster iterations.

`yolo-codex` is the closest SubTurtle loop to the ralph loop pattern:

```python
while not finished:
    codex.execute()
```

`slow` is the more structured loop type:

```python
while not finished:
    plan = claude.plan()
    claude.groom(plan)
    codex.execute(plan)
    claude.review(plan)
```

## What it looks like

<p align="center">
  <img src="assets/readme-screenshots/chat-example.jpg" width="360" alt="SuperTurtle Telegram chat example" />
  &nbsp;&nbsp;
  <img src="assets/readme-screenshots/chat-example-2.jpg" width="360" alt="SuperTurtle committing code and sending a GitHub screenshot" />
</p>

## Dashboard

SuperTurtle includes a local-only dashboard for operational visibility. It is enabled by default when you run `superturtle start`. On startup, the bot prints the exact local dashboard URL (including the active port).

Open the dashboard using the startup URL the bot prints. For normal local use, you do not need any extra dashboard settings. If you want to disable the dashboard entirely, set `DASHBOARD_ENABLED=false`.

The dashboard shows active sessions, SubTurtle lanes, cron/current jobs, deferred queue pressure, and conductor views (`workers`, `wakeups`, `inbox`) in one place.

<p align="center">
  <img src="assets/readme-screenshots/dashboard-overview.png" width="1200" alt="SuperTurtle dashboard showing sessions, SubTurtle lanes, queue, and current jobs" />
</p>

## Platform support

| Platform | Status |
|----------|--------|
| macOS    | Fully supported |
| Linux    | Supported |
| Windows  | Supported via WSL |

**macOS note:** Enable `System Settings → Battery → Options → Prevent automatic sleeping when the display is off` when on power adapter.

## TOS compliance

Super Turtle runs the local coding CLIs as child processes in their headless or non-interactive modes. In practice that means commands such as `claude -p --output-format stream-json` and `codex exec`.

**What Super Turtle does:**
- Spawns the local `codex` and `claude` CLIs with standard headless or non-interactive entrypoints
- Uses your existing CLI authentication (your logged-in session)
- Reads structured output or events from the CLIs

**What Super Turtle does NOT do:**
- Extract or reuse OAuth tokens from your keychain for model inference
- Proxy your subscription credentials to other users or services
- Use provider APIs as the default path instead of the installed CLI
- Circumvent product rate limiting or usage caps

The `/usage` bot command reads local CLI usage/auth state only for usage reporting. For Claude Code, it can call Anthropic's own usage-reporting endpoint (`api.anthropic.com/api/oauth/usage`) — the same endpoint Claude Code's built-in `/usage` displays. It is read-only and never used for model inference.

See the [full TOS compliance page](https://www.superturtle.dev/docs/config/tos-compliance) for details.

## Security

Super Turtle runs these coding CLIs in automation-oriented modes. Every file read, file write, and shell command happens without a confirmation prompt. This is by design — confirming each action from your phone would make the tool unusable.

You should run Super Turtle in a sandboxed or dedicated environment (VM, container, separate user account) — it has full access to read, write, and execute within configured paths. Multiple defense layers (user allowlist, rate limiting, path validation, command blocking, audit logging) reduce risk, but the permission model is inherently open. Read the [full security model](https://www.superturtle.dev/docs/config/security) for threat model, incident response, and deployment checklist.

## Documentation

- **Docs site:** [superturtle.dev/docs](https://www.superturtle.dev/docs)
- **Quickstart:** [superturtle.dev/docs/quickstart](https://www.superturtle.dev/docs/quickstart)

## Development

```bash
git clone https://github.com/Rigos0/superturtle.git
cd superturtle
npx superturtle init          # installs deps, creates .superturtle/.env, prompts for tokens
node super_turtle/bin/superturtle.js start
# stop later:
node super_turtle/bin/superturtle.js stop
```

If you have the npm package installed globally, use the explicit `node super_turtle/bin/superturtle.js ...` form while developing this repo so you run the source version, not the global install.

For `launchd`, `systemd`, and E2B supervisors, use `node super_turtle/bin/superturtle.js service run`.

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=Rigos0/superturtle&type=Date)](https://star-history.com/#Rigos0/superturtle&Date)
