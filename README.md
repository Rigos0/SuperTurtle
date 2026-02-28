# Super Turtle

<p align="center">
  <img src="assets/readme-stickers/hero-double-turtle.png" width="160" alt="Super Turtle" />
</p>

Code from anywhere with your voice.

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

\* Uses official Claude Code/Codex CLI authentication flows in headless mode. This wrapper approach is compliant with provider terms.

<p align="center">
  <img src="assets/readme-stickers/setup-save-turtle.png" width="108" alt="Setup turtle sticker" />
</p>

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/Rigos0/superturtle.git
cd superturtle
```

### 2. Open Claude Code or Codex

```bash
claude --dangerously-skip-permissions
# or
codex --full-auto
```

### 3. Prompt

```
Set up Super Turtle for me.
```

The agent will walk you through everything — it'll ask for your Telegram bot token, user ID, and optionally an OpenAI API key for voice transcription. Then it installs dependencies, writes config, and tells you how to start the bot.

<p align="center">
  <img src="assets/readme-stickers/architecture-gear-turtle.png" width="108" alt="Architecture turtle sticker" />
</p>

## Architecture

- **Human** -> Telegram/CLI
- **Meta Agent** -> plans, delegates, supervises
- **SubTurtles** -> autonomous worker agents that code, test, and iterate
- **State + logs** -> `CLAUDE.md`, `.subturtles/<name>/`, git commits

Full docs: [superturtle.mintlify.app](https://superturtle.mintlify.app)

<p align="center">
  <img src="assets/readme-stickers/run-fire-turtle.png" width="108" alt="Run turtle sticker" />
</p>

## Run

Once setup is complete, start the Telegram bot:

```bash
cd super_turtle/claude-telegram-bot
bun run start
```

Then open Telegram, find your bot, and start chatting. Tell it to build something.
