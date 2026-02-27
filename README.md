# Super Turtle

<p align="center">
  <img src="assets/readme-stickers/hero-double-turtle.png" width="160" alt="Super Turtle" />
</p>

Super Turtle is an autonomous coding system you talk to on Telegram.
You say what to build; it coordinates workers and ships results.

Full docs: [docs/index.md](docs/index.md)

<p align="center">
  <img src="assets/readme-stickers/skills-idea-turtle.png" width="108" alt="Philosophy turtle sticker" />
</p>

## Philosophy

**Core experience: say what -> get results.**

- **Meta Agent**: your main chat interface. It can code directly or delegate.
- **SubTurtles**: autonomous workers that implement, test, and commit.
- **Voice-first + milestone-first**: minimal noise, only meaningful updates.

<p align="center">
  <img src="assets/readme-stickers/setup-save-turtle.png" width="108" alt="Setup turtle sticker" />
</p>

## Setup

Install one CLI (once):

```bash
# Claude Code
npm install -g @anthropic-ai/claude-code

# Codex
npm install -g @openai/codex
```

### 1) Clone the repo

```bash
git clone <your-fork-or-repo-url>
cd <repo-directory>
```

You can also ask Claude/Codex to clone it for you, then make sure you are in the repo root.

### 2) Open CLI in this repo directory and run setup

```bash
# from repo root
claude
# or
codex
```

Then say:

```text
Set up Super Turtle on this machine.
```

Required values to provide:
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ALLOWED_USERS`
- Optional `OPENAI_API_KEY`

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
