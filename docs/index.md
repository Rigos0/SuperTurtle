# Super Turtle Documentation

Super Turtle is an autonomous coding system you control from Telegram. This setup is for **clone-and-run usage of this repository** on your own machine.

## Overview

- You chat with one Meta Agent in Telegram.
- The Meta Agent can code directly or spawn SubTurtles for parallel work.
- SubTurtles execute autonomous loops (`yolo-codex` by default) and report milestones.
- The system runs locally and uses your own subscriptions.

## Setup

### 1) Clone and install

```bash
git clone <your-fork-or-repo-url>
cd agentic
cd super_turtle/claude-telegram-bot
bun install
```

### 2) Subscription requirements

- Required: an active **Claude Code** subscription and local `claude` auth.
- Alternative/optional for Codex flows: active Codex access (CLOTH) for the OpenAI account used by local `codex`.
- Optional: `OPENAI_API_KEY` for voice transcription support.

### 3) Create the Telegram bot

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

### 4) Get your Telegram chat/user ID

- Message [@userinfobot](https://t.me/userinfobot), or
- Start your bot and use `/start` to display your ID.

Use this value in `TELEGRAM_ALLOWED_USERS`.

### 5) Configure environment

Create `super_turtle/claude-telegram-bot/.env`:

```bash
TELEGRAM_BOT_TOKEN=1234567890:ABC-DEF...
TELEGRAM_ALLOWED_USERS=123456789

CLAUDE_WORKING_DIR=/absolute/path/to/agentic
OPENAI_API_KEY=sk-... # optional, only for voice transcription

CODEX_ENABLED=true # optional, for Codex usage in /usage and Codex flows
```

## Run

### Start the Telegram bot

```bash
cd super_turtle/claude-telegram-bot
bun run start
```

### Start the Meta Agent directly (CLI)

```bash
cd /absolute/path/to/agentic
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
