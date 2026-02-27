# Super Turtle

<p align="center">
  <img src="assets/readme-stickers/hero-double-turtle.png" width="160" alt="Super Turtle" />
</p>

Code from anywhere with your voice.

Full docs: [docs/index.md](docs/index.md)

<p align="center">
  <img src="assets/readme-stickers/skills-idea-turtle.png" width="108" alt="Philosophy turtle sticker" />
</p>

## Why Super Turtle

1. Uses your Claude Code or Codex subscription.* No extra API-token workflow for core use.
2. Mobile and voice control first. Run everything from Telegram by text or voice.
3. Designed for long-running, large jobs. Breaks work into tasks, runs sub-agents, can open/test webpages, and iterates until done.
4. Runs on your machine (cloud deployment coming up).
5. It tracks remaining usage and load-balances between Claude Code and Codex.
6. Autonomous supervision: scheduled cron check-ins monitor progress in the background and send important updates.

* Uses official Claude Code/Codex CLI authentication flows in headless mode. This wrapper approach is compliant with provider terms.

<p align="center">
  <img src="assets/readme-stickers/setup-save-turtle.png" width="108" alt="Setup turtle sticker" />
</p>

## Setup

### 1) Clone the repo

```bash
git clone https://github.com/Rigos0/superturtle.git
cd superturtle
```

You can ask Claude/Codex to clone it for you, then ensure you are in the repo root.

### 2) Open Claude Code or Codex in the repo root

```bash
# from repo root
claude
# or
codex
```

### 3) Say the setup prompt

```text
Set up Super Turtle on this machine.
```

Required values to provide:
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ALLOWED_USERS`
- Optional `OPENAI_API_KEY`

## E2B Remote (beta)

Use E2B when you want Super Turtle to run outside your local machine.

### Required setup

1. Install E2B CLI and authenticate (`e2b auth login`) or export `E2B_API_KEY`.
2. Ensure `super_turtle/claude-telegram-bot/.env` exists with:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_ALLOWED_USERS`
   - Optional `OPENAI_API_KEY`
3. Run remote lifecycle commands from repo root:

```bash
bash super_turtle/e2b/remote.sh up
bash super_turtle/e2b/remote.sh status
bash super_turtle/e2b/remote.sh pause
bash super_turtle/e2b/remote.sh resume
bash super_turtle/e2b/remote.sh stop
```

### E2B env vars

- Required: `E2B_API_KEY` (unless you already ran `e2b auth login`)
- Optional: `E2B_TEMPLATE` (default: `base`)
- Optional: `E2B_REMOTE_PROJECT_DIR` (default: `/home/user/agentic`)
- Optional: `E2B_REMOTE_LOG_PATH` (default: `/tmp/superturtle-remote.log`)
- Optional: `E2B_STATE_FILE` (default: `super_turtle/e2b/.state.json`)
- Optional: `E2B_SKIP_AUTH_CHECK=1` (for CI/fake CLI smoke tests)

### Template notes

- `up` defaults to `base` unless `--template` or `E2B_TEMPLATE` is set.
- The selected template is persisted in `super_turtle/e2b/.state.json` and reused on future `up`.
- E2B first-party templates (`codex`, `claude`) are supported if your workflow needs those CLIs preinstalled.

### Current caveats

- Repo sync pushes tracked files plus `super_turtle/claude-telegram-bot/.env`; extra untracked files are not synced.
- `pause`/`resume` affect sandbox lifecycle only; after resume, run `bash super_turtle/e2b/remote.sh reconcile-cron` to defer overdue cron jobs safely.
- `up` requires `bun` in the sandbox (script attempts install via `curl` fallback, then fails fast if unavailable).
- `status` uses local state if remote E2B access is unavailable.

<p align="center">
  <img src="assets/readme-stickers/architecture-gear-turtle.png" width="108" alt="Architecture turtle sticker" />
</p>

## Architecture

- **Human** -> Telegram/CLI
- **Meta Agent** -> plans, delegates, supervises
- **SubTurtles** -> `slow`, `yolo`, `yolo-codex`, `yolo-codex-spark`
- **State + logs** -> `CLAUDE.md`, `.subturtles/<name>/`, git commits

<p align="center">
  <img src="assets/readme-stickers/run-fire-turtle.png" width="108" alt="Run turtle sticker" />
</p>

## Run

### Start Meta Agent

```bash
./super_turtle/meta/claude-meta
```

### Key SubTurtle commands

```bash
./super_turtle/subturtle/ctl spawn <name> --type yolo-codex --timeout 1h --state-file <path|->
./super_turtle/subturtle/ctl list
./super_turtle/subturtle/ctl status <name>
./super_turtle/subturtle/ctl logs <name>
./super_turtle/subturtle/ctl stop <name>
```

### Docs (optional)

```bash
cd docs
npm install
npm run docs:dev
```

<p align="center">
  <img src="assets/readme-stickers/monitoring-alarm-turtle.png" width="108" alt="Monitoring turtle sticker" />
</p>

## Bot Monitoring

```bash
cd super_turtle/claude-telegram-bot
bun run start

# optional
# tmux attach -t superturtle-bot
# tmux has-session -t superturtle-bot && echo "running" || echo "stopped"
# tmux kill-session -t superturtle-bot
```
