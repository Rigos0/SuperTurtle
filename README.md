# Super Turtle

Code from anywhere with your voice.

<p align="center">
  <img src="assets/readme-stickers/hero-double-turtle.png" width="160" alt="Super Turtle" />
</p>


## What It Is

Super Turtle is an autonomous coding system controlled from Telegram:

- You talk to one Meta Agent.
- It decomposes work, spawns SubTurtles, supervises progress, and reports milestones.
- You focus on outcomes, not orchestration.

Core UX: **say what -> get results**.

## Why Use It

1. Uses your Claude Code or Codex subscription (no extra core API-token workflow).
2. Mobile + voice first via Telegram.
3. Designed for long-running, multi-step coding work.
4. Parallel SubTurtle execution with milestone-focused updates.
5. Usage-aware routing between Claude and Codex.

\* Uses official Claude Code/Codex CLI auth flows.

<p align="center">
  <img src="assets/readme-stickers/setup-save-turtle.png" width="108" alt="Setup turtle sticker" />
</p>

## Quick Start

### 1) Clone

```bash
git clone https://github.com/Rigos0/superturtle.git
cd superturtle
```

### 2) Open an agent session

```bash
claude --dangerously-skip-permissions
# or
codex --full-auto
```

### 3) Prompt

```text
Set up Super Turtle for me.
```

## What the onboarding agent does

The onboarding agent is expected to fully handhold setup:

1. Guides you through BotFather token creation (`@BotFather`, `/newbot`).
2. Guides you to get your Telegram user ID (`@userinfobot`).
3. Optionally collects `OPENAI_API_KEY` for voice transcription.
4. Asks whether to enable Codex integration.
5. Runs setup for you:
   - `./super_turtle/setup --driver claude --enable-codex "<true|false>" --telegram-token "<token>" --telegram-user "<id>"`
   - Adds `--openai-api-key "<key>"` if provided.
6. Explains what was configured.
7. Starts the bot and verifies Telegram response.

You should not need manual `.env` editing during normal onboarding.

## Platform Status

- macOS: fully supported.
- Linux: untested alpha.
- Windows: not an officially supported setup target right now.

Mac laptop reliability notes:

- Enable `System Settings -> Battery -> Options -> Prevent automatic sleeping when the display is off` (on power adapter).
- Keep the lid open while the bot is running.

<p align="center">
  <img src="assets/readme-stickers/run-fire-turtle.png" width="108" alt="Run turtle sticker" />
</p>

## Run manually (if needed)

```bash
cd super_turtle/claude-telegram-bot
bun run start
```

Then message your bot in Telegram and ask it to build something.

## Architecture

- **Human** -> Telegram/CLI
- **Meta Agent** -> plans, delegates, supervises
- **SubTurtles** -> autonomous worker agents (parallel, looped execution)
- **State + logs** -> `CLAUDE.md`, `.subturtles/<name>/`, git history

## Documentation

- Docs site: [superturtle.mintlify.app](https://superturtle.mintlify.app)
- Start with: [Quickstart](docs/quickstart.mdx)

Full documentation: https://superturtle.mintlify.app
Platform support details: https://superturtle.mintlify.app/config/platform-support
