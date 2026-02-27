# Super Turtle

<p align="center">
  <img src="assets/readme-stickers/hero-double-turtle.png" width="160" alt="Super Turtle" />
</p>

Super Turtle is an autonomous coding system you talk to on Telegram.
You say what to build; it coordinates workers and ships results.
Code from anywhere with your voice.

Full docs: [docs/index.md](docs/index.md)

<p align="center">
  <img src="assets/readme-stickers/skills-idea-turtle.png" width="108" alt="Philosophy turtle sticker" />
</p>

## Why Super Turtle

1. SuperTurtle uses your Claude Code or Codex subscription.*
2. Mobile and voice control first: run everything from Telegram by text or voice.
3. Autonomous execution: breaks work into tasks, runs sub-agents, can open/test webpages, and iterates until done.
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
