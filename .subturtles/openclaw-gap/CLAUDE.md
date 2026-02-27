# OpenClaw Gap Audit + Reliability Implementation

## Current Task
All backlog items completed; stopping loop after commit.

## End Goal with Specs
Ship concrete reliability upgrades in `super_turtle/claude-telegram-bot` based on verified OpenClaw patterns, with tests and docs updates. Focus on reducing duplicate side effects (especially repeated spawn workflows) and hardening session/update handling.

Acceptance criteria:
- A short evidence-based comparison note is added under `docs/` using primary OpenClaw sources (official docs + GitHub repo references).
- Telegram update dedupe is implemented or strengthened (message/callback duplicate suppression with bounded memory/TTL).
- Side-effecting spawn orchestration is idempotent at the bot layer (replays don't re-run successful spawns).
- Existing behavior for normal commands remains intact.
- Regression tests cover duplicate update handling and idempotent spawn behavior.

## Roadmap (Completed)
- Existing stall handling improvements were added recently.
- Existing retry gating avoids crash replay after tool execution.

## Roadmap (Upcoming)
- Research OpenClaw source-of-truth docs and extract reliability patterns.
- Implement dedupe and idempotency improvements in bot handlers.
- Add tests and update docs.

## Backlog
- [x] Research first: verify OpenClaw patterns from primary sources (Telegram channel docs, session model, dedupe/update handling) and summarize what it does better than us
- [x] Map each identified gap to exact files/functions in our bot and choose minimal safe implementation
- [x] Implement duplicate Telegram update suppression in our bot pipeline (messages + callback queries)
- [x] Implement idempotent spawn orchestration guard so repeated handling cannot duplicate side effects
- [x] Add/extend tests for duplicate updates and spawn idempotency
- [x] Update docs with concise "OpenClaw parity improvements" note and what remains
- [x] Commit with clear message and include state-file progress updates

## Notes
Primary code paths likely involved:
- `super_turtle/claude-telegram-bot/src/index.ts`
- `super_turtle/claude-telegram-bot/src/handlers/commands.ts`
- `super_turtle/claude-telegram-bot/src/handlers/text.ts`
- `super_turtle/claude-telegram-bot/src/handlers/callback.ts`
- related tests under `src/handlers/*.test.ts`

Use primary sources only for research (OpenClaw official docs + OpenClaw GitHub repository).

## Loop Control
STOP
