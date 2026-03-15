# E2B Webhook Wake POC

This is the operator runbook for the paused-sandbox wake test.

Goal:

- run the Telegram bot inside one E2B sandbox in webhook mode
- point Telegram directly at that sandbox URL
- pause the sandbox
- send a Telegram message
- verify the same sandbox wakes and receives the webhook request

## Prerequisites

- local project initialized with `superturtle init`
- `E2B_API_KEY` exported locally
- Telegram bot token already present in `.superturtle/.env`
- Bun installed locally so the helper can run from this repo

## Install local dependency

From the repo root:

```bash
cd super_turtle
bun install
```

The helper uses the `@e2b/code-interpreter` JavaScript SDK locally. The remote sandbox installs Bun and the bot dependencies on first launch.

## Launch the sandboxed bot

From the repo root:

```bash
E2B_API_KEY=... node super_turtle/bin/e2b-webhook-poc.js launch
```

What this does:

- creates or reuses one E2B sandbox with `onTimeout=pause` and `autoResume=true`
- uploads the current repo working tree, excluding local runtime state
- starts the existing Telegram bot in webhook mode inside the sandbox
- waits for `GET /healthz`
- saves local state to `.superturtle/teleport-state.json`

The bot registers its own webhook on startup. The local `set-webhook` command is only for manual repair.

Important:

- this helper does not install or authenticate Claude Code inside the sandbox
- the remote runtime still needs the normal bot prerequisites if you want full message handling, not just transport/wake verification

## Pause and wake

Pause the sandbox:

```bash
E2B_API_KEY=... node super_turtle/bin/e2b-webhook-poc.js pause
```

Then send a Telegram message to the bot.

Expected result:

- the same sandbox resumes
- Telegram reaches the webhook
- if the remote runtime is fully provisioned, the bot handles the message normally

## Inspect state

Check current sandbox status, health, and Telegram webhook info:

```bash
E2B_API_KEY=... node super_turtle/bin/e2b-webhook-poc.js status
```

Tail the remote bot log:

```bash
E2B_API_KEY=... node super_turtle/bin/e2b-webhook-poc.js logs --lines 100
```

Manually resume the sandbox:

```bash
E2B_API_KEY=... node super_turtle/bin/e2b-webhook-poc.js resume
```

## Cleanup

Delete the Telegram webhook:

```bash
E2B_API_KEY=... node super_turtle/bin/e2b-webhook-poc.js delete-webhook
```

Manually set the Telegram webhook to the saved sandbox URL if needed:

```bash
E2B_API_KEY=... node super_turtle/bin/e2b-webhook-poc.js set-webhook
```

The helper intentionally does not kill the sandbox automatically. This keeps the same sandbox ID available for repeated pause/resume tests.
