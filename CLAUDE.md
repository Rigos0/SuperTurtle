# Super Turtle Onboarding Agent Runbook

This file is ONLY for first-run onboarding behavior in this repository.
When the user clones this repo and opens Claude Code or Codex, follow these steps exactly.

## Rules

1. Be concrete and step-by-step. Do not give vague summaries.
2. Do not ask users to manually edit `.env` or config files.
3. Execute local setup commands yourself (the agent runs with high permissions).
4. Ask the user only for external actions (Telegram/BotFather/userinfobot) and secrets.
5. If the `ask_user` tool is available, use it for onboarding choices to make setup seamless.

## Onboarding Trigger

Run this flow when either is true:

- This is the user's first setup in this clone.
- The user asks to set up Super Turtle.

## Exact Onboarding Sequence

### 0. Verify prerequisites

Before anything else, confirm the user has Telegram installed:

- **Telegram must be installed** on their phone or desktop before the bot can work.
  - Download: https://telegram.org/
- Confirm they have an active Telegram account.

Do not proceed past this step until the user confirms Telegram is installed.

### 1. Open with platform reality

Always tell the user:

- macOS is currently the only fully supported platform.
- Linux is untested alpha.
- On Mac laptops, enable: `System Settings -> Battery -> Options -> Prevent automatic sleeping when the display is off` (on power adapter).
- Keep the laptop lid open while the bot runs.

If host OS is not macOS, explicitly warn that runtime behavior may be unstable.

### 2. Guide BotFather token creation (handholding)

Tell the user exactly:

1. Open Telegram and message `@BotFather`
2. Send `/newbot`
3. BotFather will ask **"What name should I give the bot?"** — this is the **display name**,
   can be anything (e.g., "My Super Turtle"). It does not need to be unique.
4. BotFather will then ask **"Now let's choose a username for your bot."**
   - The username **must end in `bot`** (e.g., `MySuperTurtleBot` or `my_super_turtle_bot`)
   - It must be **globally unique** across all Telegram bots
   - If BotFather says "Sorry, this username is already taken" — just try a different one
     (add your name, numbers, or any variation)
5. Copy the bot token BotFather gives you (looks like: `123456789:ABCDefGhijKLmNoPqrsTUVwxyz`)
6. Paste it back here

Validate token format before continuing (`^\d+:[A-Za-z0-9_-]+$`).
If invalid, explain and ask again.

### 3. Guide Telegram user ID discovery

Tell the user exactly:

1. Open Telegram and message `@userinfobot`
2. Copy numeric user ID
3. Paste it back here

Validate as digits only.

### 4. Ask about voice transcription

If `ask_user` is available, ask with buttons/options:

- `Yes, enable voice transcription`
- `No, skip for now`

If user chooses yes, collect `OPENAI_API_KEY`.
If no, continue without it.

### 4b. Ask about Codex integration

If `ask_user` is available, ask with buttons/options:

- `Yes, enable Codex integration`
- `No, keep Claude-only`

Record this choice and pass it to setup via `--enable-codex true|false`.

### 5. Run setup command yourself

Always run:

```bash
./super_turtle/setup --driver claude --enable-codex <true|false> --telegram-token "<token>" --telegram-user "<id>"
```

If OpenAI key was provided, run:

```bash
./super_turtle/setup --driver claude --enable-codex <true|false> --telegram-token "<token>" --telegram-user "<id>" --openai-api-key "<key>"
```

After running setup, verify it succeeded:
- Check that `super_turtle/claude-telegram-bot/.env` exists and contains `TELEGRAM_BOT_TOKEN`
- If the file does not exist, re-run the setup command — do NOT attempt to create `.env` manually
- The setup script creates `.env` from `.env.example` automatically; never bypass this by writing
  `.env` by hand or via heredoc

### 6. Summarize what was configured

After setup succeeds, state explicitly:

- Bot env file written: `super_turtle/claude-telegram-bot/.env`
- Bot dependencies installed via `bun install`
- Docs dependencies installed (`npm install`, or skipped if npm missing)
- Default driver preference written to `/tmp/claude-telegram-prefs.json`

### 7. Hand off bot start to user (DO NOT run this yourself)

**CRITICAL: Never run `bun run start` as an agent command.**

`bun run start` calls `live.sh`, which calls `tmux attach`. This requires an actual interactive
terminal session. Running it from a background process, a non-interactive shell, or as an agent
tool call will always fail with "open terminal failed: not a terminal" or "[exited]".

Tell the user to run this themselves in their own terminal:

```bash
cd super_turtle/claude-telegram-bot
bun run start
```

Explain to the user:
- This opens a tmux session called `superturtle-bot`
- The bot runs inside tmux and survives terminal disconnects
- If they see a tmux window with the bot output, it is running correctly
- To re-attach later: `tmux attach -t superturtle-bot`
- To stop: `tmux kill-session -t superturtle-bot`

Wait for the user to confirm the bot started before proceeding to Step 8.

### 8. Telegram verification

Tell user:

1. Open Telegram
2. Find their bot
3. Send `/start` (or any message)

Confirm bot is responding.
If not, diagnose and retry before declaring setup done.

### 9. Final onboarding handoff

After verification, send:

- Setup is complete
- They can now request build tasks in plain language

The first Telegram interaction handoff message is defined in:

- `super_turtle/meta/META_SHARED.md`

Keep that behavior prompt-driven (do not add custom runtime first-message hooks).
