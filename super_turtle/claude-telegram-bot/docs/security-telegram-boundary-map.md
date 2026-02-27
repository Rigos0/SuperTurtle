# Telegram Security Boundary Map

This document maps ingress, egress, and authorization boundaries for the Telegram bot runtime and bundled MCP servers.

## Scope

- Bot runtime: `src/index.ts`, handlers, driver/session glue, and security checks
- MCP servers: `ask_user_mcp`, `send_turtle_mcp`, `bot_control_mcp`
- Focus: data/control flow boundaries, not vulnerability scoring

## Ingress Map

1. Telegram long-poll updates enter via grammY runner:
- `src/index.ts:865` starts `run(bot, ...)`
- `src/index.ts:825` clears pending updates on startup (`deleteWebhook({ drop_pending_updates: true })`)
- Update handlers are registered at:
- `src/index.ts:516` through `src/index.ts:526` (`/new`, `/status`, `/usage`, `/context`, `/model`, `/switch`, `/resume`, `/sub`, `/subturtle`, `/restart`, `/cron`)
- `src/index.ts:531` through `src/index.ts:547` (`message:*` types)
- `src/index.ts:551` (`callback_query:data`)

2. Pre-handler middleware boundaries:
- `src/index.ts:470` duplicate-update dropper
- `src/index.ts:487` sequentialization for non-command traffic

3. Cron-triggered synthetic ingress (internal actor):
- Due jobs from `getDueJobs()` at `src/index.ts:575`
- Synthetic Telegram-like contexts are built in `createCronContext` at `src/index.ts:635`
- Cron actor identity is synthesized from `ALLOWED_USERS[0]` (`src/index.ts:404`, `src/index.ts:596`)

4. MCP tool ingress (stdio + file IPC):
- `ask_user_mcp/server.ts:95` writes `/tmp/ask-user-*.json`
- `send_turtle_mcp/server.ts:179` writes `/tmp/send-turtle-*.json`
- `bot_control_mcp/server.ts:152` writes `/tmp/bot-control-*.json`
- Bot polls these files in:
- `src/handlers/streaming.ts:69` (`ask-user`)
- `src/handlers/streaming.ts:113` (`send-turtle`)
- `src/handlers/streaming.ts:168` (`bot-control`)
- Claude driver path sets chat scope and triggers these checks in:
- `src/session.ts:303`, `src/session.ts:525`, `src/session.ts:546`, `src/session.ts:565`
- Codex driver path mirrors this in:
- `src/drivers/codex-driver.ts:22`, `src/drivers/codex-driver.ts:36`, `src/drivers/codex-driver.ts:58`, `src/drivers/codex-driver.ts:77`

## Authorization Boundaries

1. Root allowlist source:
- `src/config.ts:37` parses `TELEGRAM_ALLOWED_USERS`
- `src/config.ts:292` hard-fails startup if no allowed users configured

2. Auth predicate:
- `src/security.ts:160` (`isAuthorized(userId, allowedUsers)`)

3. User-path enforcement points:
- Commands enforce allowlist, e.g. `src/handlers/commands.ts:189`
- Text/messages enforce allowlist, e.g. `src/handlers/text.ts:76`
- Callback queries enforce allowlist before handling payloads, `src/handlers/callback.ts:36`
- Media handlers enforce allowlist similarly:
- `src/handlers/voice.ts:41`
- `src/handlers/photo.ts:124`
- `src/handlers/document.ts:428`
- `src/handlers/audio.ts:163`
- `src/handlers/video.ts:60`

4. Rate-limit boundary:
- Global limiter implementation: `src/security.ts:76`
- Enforced in user handlers, e.g. `src/handlers/text.ts:97`, `src/handlers/voice.ts:55`, `src/handlers/media-group.ts:121`

5. Internal bypass boundary:
- Cron jobs do not pass through Telegram user auth checks; they execute as trusted internal traffic with `ALLOWED_USERS[0]` identity (`src/index.ts:596` onward)

## Egress Map

1. Outbound Telegram messages:
- Direct bot API sends throughout runtime, e.g. `src/index.ts:413`, `src/index.ts:617`, `src/index.ts:721`
- Handler replies and callback edits in handlers (text/commands/callback/media)

2. External network egress:
- `src/handlers/streaming.ts:137` fetches remote turtle image URLs before relay to Telegram

3. Local filesystem egress/state:
- MCP request files written to `/tmp/*` by MCP servers (paths above)
- Bot writes session/restart and operational state files:
- Session history at `SESSION_FILE` (see `src/config.ts:275`, write in `src/session.ts` session save path)
- Restart state at `RESTART_FILE` (`src/config.ts:276`, used in `src/handlers/streaming.ts:389`)

4. Model/tool execution boundary:
- Claude session runs with bypass permissions at `src/session.ts:336` and `src/session.ts:337`
- Allowed file roots are constrained via `additionalDirectories: ALLOWED_PATHS` at `src/session.ts:341`
- Runtime safety gates for tool calls:
- Command pattern checks in `src/security.ts:120` and invoked at `src/session.ts:470`
- File path checks in `src/security.ts:80` and invoked at `src/session.ts:488`

## Trust Boundary Summary

1. Telegram network -> grammY update stream (untrusted input)
2. Handler auth/rate checks -> driver execution (trusted-user boundary)
3. Driver -> Claude/Codex + MCP stdio (high-privilege execution boundary)
4. MCP stdio -> `/tmp` request files -> bot polling loop (local IPC boundary)
5. Bot -> Telegram API and external fetches (outbound boundary)

## Notes For Next Security Pass

- Internal cron traffic is privileged and bypasses normal user auth paths by design.
- MCP file IPC trusts local filesystem integrity under `/tmp`; chat scoping is enforced by `chat_id` checks in streaming handlers.
- Claude execution mode is intentionally high-privilege; command/path gates are compensating controls and should be tested as primary hardening points.
