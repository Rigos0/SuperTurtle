# OpenClaw Parity Improvements (Implemented + Remaining)

Date: 2026-02-27  
Reference snapshot: `openclaw/openclaw@35e40f1139c2e1b6f31e832d2ffcf5f16468af70`

This note summarizes what has already landed in `super_turtle/claude-telegram-bot` from the OpenClaw reliability gap audit, and what still remains.

## Implemented in our bot

1. Telegram duplicate-update suppression now runs before handlers in `src/index.ts`, using bounded TTL/memory cache logic in `src/update-dedupe.ts`.
2. Duplicate callback updates are acknowledged best-effort and dropped before side effects.
3. Spawn-orchestration replay hardening is in place: stalled runs that already showed spawn orchestration are not auto-retried (`src/handlers/text.ts`, `src/handlers/streaming.ts`).
4. Regression coverage was added for dedupe and replay behavior (`src/update-dedupe.test.ts`, `src/handlers/text.retry.test.ts`).

## Remaining parity gaps

1. Persisted Telegram update watermark/offset store for restart replay safety (OpenClaw-style crash-safe long-poll progress).
2. Thread/topic-aware session isolation and sequencing (OpenClaw keys by chat+thread; we still use a shared session singleton and chat-level sequencing).
3. Optional operational hardening: OpenClaw-style native command menu resync fallback for command-limit edge cases.

## Primary OpenClaw sources

- https://docs.openclaw.ai/channels/telegram
- https://docs.openclaw.ai/concepts/session
- https://github.com/openclaw/openclaw/tree/35e40f1139c2e1b6f31e832d2ffcf5f16468af70/src/telegram
