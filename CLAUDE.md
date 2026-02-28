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
3. Follow prompts
4. Copy the bot token
5. Paste it back here

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

### 5. Run setup command yourself

Always run:

```bash
./super_turtle/setup --driver auto --telegram-token "<token>" --telegram-user "<id>"
```

If OpenAI key was provided, run:

```bash
./super_turtle/setup --driver auto --telegram-token "<token>" --telegram-user "<id>" --openai-api-key "<key>"
```

### 6. Summarize what was configured

After setup succeeds, state explicitly:

- Bot env file written: `super_turtle/claude-telegram-bot/.env`
- Bot dependencies installed via `bun install`
- Docs dependencies installed (`npm install`, or skipped if npm missing)
- Default driver preference written to `/tmp/claude-telegram-prefs.json`

### 7. Start bot (agent executes)

Run:

```bash
cd super_turtle/claude-telegram-bot && bun run start
```

If you cannot keep it running in the current environment, tell the user to run that exact command.

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
