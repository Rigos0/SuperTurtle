# OpenClaw Gap -> Bot Implementation Map

Date: 2026-02-27
Context: follow-up to `docs/openclaw-reliability-comparison.md`.

## Goal
Map each identified OpenClaw reliability/message-handling gap to exact code touchpoints in `super_turtle/claude-telegram-bot` and define the minimal safe implementation plan.

## Gap 1: Telegram update dedupe (messages + callback queries)

### Current touchpoints
- `super_turtle/claude-telegram-bot/src/index.ts`
  - Global middleware chain where all updates enter (`bot.use(...)` with `sequentialize(...)`).
  - Handler registration (`bot.on("message:..." ...)`, `bot.on("callback_query:data", ...)`).
- `super_turtle/claude-telegram-bot/src/handlers/text.ts`
  - `handleText(...)` is the primary message side-effect entrypoint.
- `super_turtle/claude-telegram-bot/src/handlers/callback.ts`
  - `handleCallback(...)` executes callback actions and can trigger driver runs.

### Minimal safe plan
1. Add a new middleware module (for example `src/telegram-update-dedupe.ts`) with bounded in-memory dedupe:
   - `ttlMs = 5 * 60 * 1000`
   - `maxSize = 2000`
2. Build a stable update key in this order:
   - `ctx.update.update_id`
   - callback query id
   - fallback `chatId:messageId` when available
3. Register dedupe middleware in `index.ts` before `sequentialize(...)` so duplicates are dropped before any handler side effects.
4. For duplicate callback updates, answer callback quickly (best-effort) before returning.

### Tests to add
- `src/telegram-update-dedupe.test.ts` for keying + TTL/max-size behavior.
- `src/handlers/callback.*.test.ts` case that duplicate callback update is ignored.
- `src/handlers/text.*.test.ts` case that duplicate message update does not call driver twice.

## Gap 2: Bot-layer idempotency guard for spawn-orchestrating runs

### Current touchpoints
- `super_turtle/claude-telegram-bot/src/handlers/text.ts`
  - `handleText(...)` -> `driver.runMessage(...)` call in retry loop.
- `super_turtle/claude-telegram-bot/src/handlers/callback.ts`
  - ask-user path -> `runMessageWithActiveDriver(...)`.
- `super_turtle/claude-telegram-bot/src/handlers/driver-routing.ts`
  - `runMessageWithActiveDriver(...)` / `runMessageWithDriver(...)` execution boundary.

### Minimal safe plan
1. Add a small idempotency registry (for example `src/update-idempotency.ts`) keyed by dedupe key + route type (`message` vs `callback`).
2. Store the dedupe key on context state in dedupe middleware and consume it in `handleText`/`handleCallback`.
3. Wrap driver execution in an in-flight gate:
   - first call runs and records promise
   - replay with same key awaits same promise (or returns no-op)
4. Keep TTL-bounded cache of recently completed keys to suppress immediate replays even after completion.

### Tests to add
- `src/handlers/text.*.test.ts`: duplicate invocation with same update key triggers one driver run.
- `src/handlers/callback.*.test.ts`: duplicate ask-user callback triggers one driver run.

## Gap 3: Persisted Telegram update watermark for restart replay safety

### Current touchpoints
- `super_turtle/claude-telegram-bot/src/index.ts`
  - Startup currently calls `deleteWebhook({ drop_pending_updates: true })`.
  - Runner starts with `run(bot, ...)` and no persisted `update_id` watermark.

### Minimal safe plan
1. Keep current `drop_pending_updates: true` behavior in this tranche (already reduces offline replay risk).
2. Defer persisted watermark implementation until after dedupe/idempotency lands and is verified.
3. When implemented, add a tiny atomic file store (for example `src/update-watermark.ts`) and only advance watermark after successful dispatch to avoid skipping in-flight updates.

### Reason to defer
Implementing persisted watermark safely with current runner flow needs careful ack semantics. It is higher risk than dedupe/idempotency and not required for the next commit-sized reliability step.

## Gap 4: Thread/topic-aware session isolation

### Current touchpoints
- `super_turtle/claude-telegram-bot/src/session.ts`
  - Global singleton `session` shared across chats/topics.
- `super_turtle/claude-telegram-bot/src/handlers/text.ts`
  - Directly uses shared `session`.
- `super_turtle/claude-telegram-bot/src/handlers/callback.ts`
  - Directly uses shared `session`/`codexSession` for callback flows.

### Minimal safe plan
1. Defer for this reliability tranche.
2. Later introduce a `SessionRegistry` keyed by `chat_id[:message_thread_id]` and route handlers through per-thread sessions.

### Reason to defer
This is a broad behavior change that touches most handler and session call sites. It should be isolated from the immediate duplicate-side-effect fixes.

## Implementation order (next backlog-aligned steps)
1. Telegram update dedupe middleware.
2. Bot-layer idempotency guard around driver execution paths.
3. Tests for duplicate updates and idempotent execution.
4. Docs update summarizing parity gains and deferred gaps.
