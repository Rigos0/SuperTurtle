# Super Turtle Documentation

Super Turtle is an autonomous coding system you control from Telegram. Setup is **AI-guided**: clone the repo, open Claude Code or Codex at root, and let it walk you through install.

## Overview

- You chat with one Meta Agent in Telegram.
- The Meta Agent can code directly or spawn SubTurtles for parallel work.
- SubTurtles execute autonomous loops (`yolo-codex` by default) and report milestones.
- The system runs locally and uses your own subscriptions.

## Setup

### 1) Clone and open in Claude Code or Codex

```bash
git clone <your-fork-or-repo-url>
cd <repo-directory>
```

Then open Claude Code or Codex in this root and ask:

```text
Set up Super Turtle on this machine.
```

The root `CLAUDE.md`/`AGENTS.md` instructions guide the setup wizard and run install/config commands for you.

### 2) Create the Telegram bot

1. Open [@BotFather](https://t.me/BotFather).
2. Run `/newbot` and follow prompts.
3. Save the token (used as `TELEGRAM_BOT_TOKEN`).
4. Set bot commands with `/setcommands`:

```text
start - Show status and user ID
new - Start a fresh session
resume - Pick from recent sessions to resume
context - Show context usage
stop - Interrupt current query
status - Check what Claude is doing
restart - Restart the bot
```

### 3) Get your Telegram chat/user ID

- Message [@userinfobot](https://t.me/userinfobot), or
- Start your bot and use `/start` to display your ID.

Use this value in `TELEGRAM_ALLOWED_USERS`.

### 4) Bootstrap command used by the setup wizard

```bash
./super_turtle/setup --driver auto \
  --telegram-token "<botfather_token>" \
  --telegram-user "<your_telegram_user_id>"
```

The setup command auto-detects Codex/Claude, installs dependencies, writes `super_turtle/claude-telegram-bot/.env`, and sets the bot's default driver.

Optional:
- `--openai-api-key <key>` for voice transcription
- `--driver codex` or `--driver claude` to force a driver
- `--non-interactive` for scripted setup

## Run

### Start the Telegram bot

```bash
cd super_turtle/claude-telegram-bot
bun run start
```

### Start the Meta Agent directly (CLI)

```bash
cd /absolute/path/to/<repo-directory>
./super_turtle/meta/claude-meta
```

### Use SubTurtles manually

```bash
./super_turtle/subturtle/ctl spawn my-task --type yolo-codex
./super_turtle/subturtle/ctl status my-task
./super_turtle/subturtle/ctl logs my-task
```

### Run docs locally

```bash
cd docs
npm install
npm run docs:dev
```
