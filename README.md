# Super Turtle

<p align="center">
  <img src="assets/readme-stickers/hero-double-turtle.png" width="160" alt="Super Turtle" />
</p>

Super Turtle is an autonomous coding system you talk to on Telegram. You describe what you want built — by typing or **voice** — and it decomposes the work, runs autonomous workers, supervises progress, and ships results.

**Super Turtle is built using Super Turtle.** The system develops itself: spawning SubTurtles to implement its own features, supervising its own improvements, and committing its own code.

Full docs: [docs/index.md](docs/index.md)

<p align="center">
  <img src="assets/readme-stickers/skills-idea-turtle.png" width="108" alt="Philosophy turtle sticker" />
</p>

## Philosophy

**Core experience: say what → get results.** The user should not think about infrastructure, loop orchestration, or process management.

Super Turtle runs a **player-coach model**:
- The **Meta Agent** is your conversational interface and project coach. It can code directly for quick, self-contained tasks, and delegates bigger work.
- **SubTurtles** are autonomous background workers for iterative coding, testing, and committing.

The system is designed to be:
- **Voice-first**: talk to it naturally on Telegram using voice messages. It handles transcription quirks and infers intent from context.
- **Milestone-driven**: updates only when there is meaningful news.
- **Usage-aware**: monitors your Claude Code and Codex quota in real time, defaults to the cheapest effective execution (`yolo-codex`), and escalates only when needed.
- **Runs on your machine**: operates locally on your hardware, using your existing subscriptions. Cloud deployment is on the roadmap.
- **Self-improving**: Super Turtle builds and maintains itself — dogfooding is a core design principle.

<p align="center">
  <img src="assets/readme-stickers/architecture-gear-turtle.png" width="108" alt="Architecture turtle sticker" />
</p>

## Architecture

```
┌────────────────────────────────────────┐
│         Human (Telegram / CLI)         │
└──────────────────┬─────────────────────┘
                   │
┌──────────────────▼─────────────────────┐
│        Meta Agent (Super Turtle)       │
│  • Conversational interface             │
│  • Player-coach: codes + delegates      │
│  • Decomposes work and tracks roadmap   │
│  • Spawns SubTurtles with skills        │
│  • Supervises via cron check-ins        │
│  • Reports milestones/errors/completion │
└─────────────┬───────────────┬──────────┘
              │               │
      direct edits      autonomous workers
                              │
                  ┌───────────▼───────────┐
                  │      SubTurtles       │
                  │  slow | yolo          │
                  │  yolo-codex (default) │
                  │  yolo-codex-spark     │
                  │  + on-demand skills   │
                  └───────────┬───────────┘
                              │
                 commits/logs/state files
```

### Two layers

1. **Meta Agent (`super_turtle/meta/META_SHARED.md`)**
- Handles conversation, status, direction, and coordination.
- Uses direct coding for quick fixes and scoped tasks.
- Delegates larger or iterative tasks to SubTurtles.

2. **SubTurtles (`.subturtles/<name>/`)**
- Isolated autonomous workers with their own `CLAUDE.md`, `AGENTS.md` symlink, PID, and logs.
- Loop by reading state -> implementing -> verifying -> committing.
- Support four loop types:
  - `slow`: Plan -> Groom -> Execute -> Review (4 calls/iteration)
  - `yolo`: single Claude call/iteration
  - `yolo-codex`: single Codex call/iteration (default)
  - `yolo-codex-spark`: single Codex Spark call/iteration

### Skills, supervision, and previews

- **Skills**: loaded on demand per SubTurtle (`--skill frontend --skill testing`) so expertise stays scoped to the task.
- **Cron supervision**: `ctl spawn` auto-registers recurring check-ins (default `10m`) to monitor milestones, stalls, and failures.
- **Tunnel previews**: frontend workers can publish Cloudflare tunnel links; the Meta Agent surfaces the URL when ready.

<p align="center">
  <img src="assets/readme-stickers/setup-save-turtle.png" width="108" alt="Setup turtle sticker" />
</p>

## Setup (AI-guided, clone-and-open)

Super Turtle setup is designed to run through **Claude Code or Codex**. You should not need manual config editing.

### 1) Clone and open the repo root

```bash
git clone <your-fork-or-repo-url>
cd <repo-directory>
```

Then open Claude Code or Codex in that root folder and ask:

```text
Set up Super Turtle on this machine.
```

The root `CLAUDE.md`/`AGENTS.md` instructions are loaded automatically and the agent should walk you through setup, run install commands, and configure project files.

### 2) Manual info you must provide

You only need to bring:

- Telegram bot token from [@BotFather](https://t.me/BotFather) (`TELEGRAM_BOT_TOKEN`)
- Your Telegram user/chat ID (`TELEGRAM_ALLOWED_USERS`) from [@userinfobot](https://t.me/userinfobot) or your bot's `/start`
- Optional `OPENAI_API_KEY` for voice transcription

### 3) What the setup agent runs

The agent uses:

```bash
./super_turtle/setup --driver auto \
  --telegram-token "<botfather_token>" \
  --telegram-user "<your_telegram_user_id>" \
  [--openai-api-key "<optional_key>"]
```

This bootstrap:

- auto-selects Codex (if available) or Claude Code
- installs required dependencies
- generates/updates `super_turtle/claude-telegram-bot/.env`
- pins the default bot driver for consistent behavior

Optional flags:

- `--driver codex` or `--driver claude` to force a driver
- `--non-interactive` for CI scripts

### 4) Subscription requirements

- Use either local `codex` auth or local `claude` auth.
- Optional: `OPENAI_API_KEY` for voice transcription.

<p align="center">
  <img src="assets/readme-stickers/run-fire-turtle.png" width="108" alt="Run turtle sticker" />
</p>

## Run

### Start the Meta Agent (CLI)

```bash
./super_turtle/meta/claude-meta
```

### Talk through Telegram

Run the bot and message it; the Meta Agent becomes your chat interface to the repo.

### Run docs locally

```bash
cd docs
npm install
npm run docs:dev
```

### Manage SubTurtles

```bash
./super_turtle/subturtle/ctl spawn [name] [--type TYPE] [--timeout DURATION] [--state-file PATH|-] [--cron-interval DURATION] [--skill NAME ...]
./super_turtle/subturtle/ctl start [name] [--type TYPE] [--timeout DURATION] [--skill NAME ...]
./super_turtle/subturtle/ctl stop [name]
./super_turtle/subturtle/ctl status [name]
./super_turtle/subturtle/ctl logs [name]
./super_turtle/subturtle/ctl list [--archived]
./super_turtle/subturtle/ctl reschedule-cron <name> <interval>
```

Use `ctl spawn` for normal work. It creates the workspace, seeds state from `--state-file` (or stdin), starts the worker, and registers cron supervision.

### Capture Browser Screenshots (CLI)

For frontend visual verification, use:

```bash
# Local dev server (default output under .tmp/screenshots/)
bash super_turtle/subturtle/browser-screenshot.sh http://localhost:3000

# Explicit output + full page
bash super_turtle/subturtle/browser-screenshot.sh https://example.com .tmp/screenshots/example-full.png --full-page

# Mobile viewport + wait for a selector before capture
bash super_turtle/subturtle/browser-screenshot.sh http://localhost:3000 .tmp/screenshots/mobile.png --viewport 390,844 --wait-selector ".hero"
```

This wrapper uses Playwright CLI via `npx` and works without adding Playwright as a repo dependency.

### Project intake docs

- `docs/NEXT_PROJECT_INTAKE_TEMPLATE.md`
- `docs/NEXT_PROJECT_KICKOFF_RUNBOOK.md`

<p align="center">
  <img src="assets/readme-stickers/monitoring-alarm-turtle.png" width="108" alt="Monitoring turtle sticker" />
</p>

## Bot Monitoring

Use the live launcher workflow so there is one visible bot session and no duplicate starts.

```bash
cd super_turtle/claude-telegram-bot
bun run start

# Re-attach from any terminal
tmux attach -t superturtle-bot

# Check session health
tmux has-session -t superturtle-bot && echo "running" || echo "stopped"

# Stop completely
tmux kill-session -t superturtle-bot
```
