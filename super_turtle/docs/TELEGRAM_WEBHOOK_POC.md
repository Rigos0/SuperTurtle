# Telegram Webhook POC

This is the smallest transport proof for `teleport-v2.0`.

What it proves:

- the existing Telegram bot runtime can boot in long-polling mode or webhook mode
- webhook mode can register a Telegram webhook URL at startup
- the same bot handlers can process updates through a Bun HTTP endpoint instead of `getUpdates`
- local polling remains the default path, so the laptop/local safety model does not change

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
- `POST` to the webhook path requires `x-telegram-bot-api-secret-token` when configured

## Why this is enough for the next step

If `/teleport` later launches a remote runtime with these env vars, the bot no longer depends on long polling there. The remaining work is orchestration: start the remote runtime, expose ingress, flip Telegram to the remote webhook, and preserve session ownership semantics.
