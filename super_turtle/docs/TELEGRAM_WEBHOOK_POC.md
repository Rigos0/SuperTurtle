# Telegram Webhook POC

This is the smallest transport proof for `teleport-v2.0`.

What it proves:

- the existing Telegram bot runtime can boot in long-polling mode or webhook mode
- webhook mode can register a Telegram webhook URL at startup
- the same bot handlers can process updates through a Bun HTTP endpoint instead of `getUpdates`
- local polling remains the default path, so the laptop/local safety model does not change

Teleport uses the same webhook transport, but not the same ownership flow:

- generic webhook mode may self-register the Telegram webhook at startup
- teleport handoff should keep webhook registration under the local orchestrator so ownership flips only after remote readiness succeeds

What it does not do yet:

- no `/teleport` cutover flow
- no E2B provisioning
- no webhook cleanup / ownership handoff orchestration
- no public ingress setup

## Env knobs

Default local behavior is unchanged:

```bash
TELEGRAM_TRANSPORT=polling
```

Webhook mode:

```bash
TELEGRAM_TRANSPORT=webhook
TELEGRAM_WEBHOOK_URL=https://example.test/telegram/webhook
TELEGRAM_WEBHOOK_SECRET=replace-me
PORT=3000
```

Notes:

- `TELEGRAM_WEBHOOK_URL` defines the public Telegram callback URL and path
- `PORT` is the local listener port inside the runtime
- `GET /healthz` returns `200 ok`
- `GET /readyz` returns readiness for ownership handoff checks
- `POST` to the webhook path requires `x-telegram-bot-api-secret-token` when configured

Teleport handoff mode uses the same listener with external webhook ownership:

```bash
TELEGRAM_TRANSPORT=webhook
TELEGRAM_WEBHOOK_URL=https://example.test/telegram/webhook
TELEGRAM_WEBHOOK_SECRET=replace-me
TELEGRAM_WEBHOOK_REGISTER=false
TELEGRAM_WEBHOOK_READY_PATH=/readyz
PORT=3000
```

In that mode the runtime proves webhook readiness, but the local `/teleport` or `/home` orchestration owns webhook registration and deletion.

## Why this is enough for the next step

If `/teleport` later launches a remote runtime with these env vars, the bot no longer depends on long polling there. The remaining work is orchestration: start the remote runtime, expose ingress, wait for readiness, flip Telegram to the remote webhook, and preserve session ownership semantics without changing the foreground progress UX contract.
