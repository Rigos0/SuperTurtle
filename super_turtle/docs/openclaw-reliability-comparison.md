# OpenClaw Reliability Comparison (Telegram + Session Handling)

Date: 2026-02-27  
OpenClaw snapshot reviewed: `openclaw/openclaw@35e40f1139c2e1b6f31e832d2ffcf5f16468af70`

## Scope

Research-only pass to verify OpenClaw patterns from primary sources and summarize reliability/session-handling gaps in `super_turtle/claude-telegram-bot`.

## Primary Sources

- OpenClaw Telegram docs: https://docs.openclaw.ai/channels/telegram
- OpenClaw session model docs: https://docs.openclaw.ai/concepts/session
- OpenClaw repository: https://github.com/openclaw/openclaw
- Code snapshot:
  - `src/telegram/bot-updates.ts`
  - `src/telegram/bot.ts`
  - `src/telegram/monitor.ts`
  - `src/telegram/update-offset-store.ts`
  - `src/telegram/bot/helpers.ts`
  - `src/telegram/bot-message-context.ts`
  - `src/telegram/bot-native-command-menu.ts`

## Verified OpenClaw Patterns

### 1) Explicit Telegram update dedupe (bounded TTL + size)

OpenClaw builds a dedupe key from `update_id`, callback id, or fallback `chat_id:message_id`, then checks it in a bounded cache (`ttlMs=5m`, `maxSize=2000`):

- https://github.com/openclaw/openclaw/blob/35e40f1139c2e1b6f31e832d2ffcf5f16468af70/src/telegram/bot-updates.ts#L35
- https://github.com/openclaw/openclaw/blob/35e40f1139c2e1b6f31e832d2ffcf5f16468af70/src/telegram/bot-updates.ts#L61
- https://github.com/openclaw/openclaw/blob/35e40f1139c2e1b6f31e832d2ffcf5f16468af70/src/telegram/bot.ts#L188

### 2) Crash-safe long-poll replay protection via persisted update watermark

OpenClaw persists update offset state per account, writes atomically, and protects against token/bot mismatches:

- https://github.com/openclaw/openclaw/blob/35e40f1139c2e1b6f31e832d2ffcf5f16468af70/src/telegram/monitor.ts#L140
- https://github.com/openclaw/openclaw/blob/35e40f1139c2e1b6f31e832d2ffcf5f16468af70/src/telegram/update-offset-store.ts#L74
- https://github.com/openclaw/openclaw/blob/35e40f1139c2e1b6f31e832d2ffcf5f16468af70/src/telegram/update-offset-store.ts#L100

It also persists a *safe* watermark that does not pass in-flight queued updates:

- https://github.com/openclaw/openclaw/blob/35e40f1139c2e1b6f31e832d2ffcf5f16468af70/src/telegram/bot.ts#L155

### 3) Thread-aware session isolation and sequencing

OpenClaw isolates forum topics and DM threads in keys, and sequentializes by `chat + topic/thread`:

- https://github.com/openclaw/openclaw/blob/35e40f1139c2e1b6f31e832d2ffcf5f16468af70/src/telegram/bot/helpers.ts#L159
- https://github.com/openclaw/openclaw/blob/35e40f1139c2e1b6f31e832d2ffcf5f16468af70/src/telegram/bot-message-context.ts#L176
- https://github.com/openclaw/openclaw/blob/35e40f1139c2e1b6f31e832d2ffcf5f16468af70/src/telegram/bot.ts#L66
- https://github.com/openclaw/openclaw/blob/35e40f1139c2e1b6f31e832d2ffcf5f16468af70/src/telegram/bot.ts#L220

Docs match this behavior:

- Telegram runtime behavior docs state forum topic isolation via `:topic:<threadId>` and per-chat/per-thread sequencing.
- Session docs describe canonical session-key mapping for channel/group/thread scopes.

### 4) Defensive command menu sync

OpenClaw performs ordered `deleteMyCommands -> setMyCommands` and retries with reduced payload on `BOT_COMMANDS_TOO_MUCH`:

- https://github.com/openclaw/openclaw/blob/35e40f1139c2e1b6f31e832d2ffcf5f16468af70/src/telegram/bot-native-command-menu.ts#L102

This is not the top gap for us, but it is a notable operational hardening pattern.

## What OpenClaw Currently Does Better Than Our Bot

### A) Update-level idempotency and replay safety

Our bot currently has no explicit `update_id`/callback dedupe or persisted Telegram update watermark in `super_turtle/claude-telegram-bot/src` (no `update_id`/`lastUpdateId` handling in source).

### B) Session isolation granularity

Our bot uses a shared global session object:

- `super_turtle/claude-telegram-bot/src/session.ts` (`export const session = new ClaudeSession();`)

And text handling routes through that shared singleton:

- `super_turtle/claude-telegram-bot/src/handlers/text.ts` (imports shared `session`)

So it lacks OpenClaw-style topic/thread-scoped session keys.

### C) Queueing scope for Telegram events

Our bot sequentializes non-command traffic by chat id only and bypasses callback queries:

- `super_turtle/claude-telegram-bot/src/index.ts` (`sequentialize(...)`, callback bypass, chat-only key)

This is simpler but weaker than OpenClaw's chat+topic/thread keying plus dedupe/watermark replay protection.

## Implementation-Relevant Gaps (for next step)

1. Add bounded Telegram update dedupe in our middleware path (message + callback query).
2. Add persisted update watermark handling for long-poll restart/replay safety.
3. Add bot-layer idempotency guard for spawn side effects (separate from driver-level retry logic).
4. Consider thread-aware session keying if we need topic-isolated conversation state.
