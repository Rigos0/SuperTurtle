## Current task
Trace driver-switch and new-session behavior in callback/commands/streaming handlers and session managers; the `/resume` ordering and persistence regressions now have focused fixes and regression coverage.

## End goal with specs
Produce a root-cause analysis with exact file/function references and a minimal, correct fix plan for both issues.

## Backlog
- [x] Inspect /resume session list build path in super_turtle/claude-telegram-bot/src/handlers/commands.ts
- [ ] Trace driver-switch and new-session behavior in callback/commands/streaming handlers and session managers <- current
- [ ] Reproduce logic-level failure path: Claude session active -> switch to Codex -> /resume visibility
- [ ] Identify exact sorting bug and exact persistence/save bug with code references
- [ ] Propose smallest safe fix and tests to prevent regression

## Notes
Focus on:
- super_turtle/claude-telegram-bot/src/handlers/commands.ts (handleResume)
- super_turtle/claude-telegram-bot/src/handlers/callback.ts (switch callbacks)
- super_turtle/claude-telegram-bot/src/handlers/commands.ts (handleSwitch)
- super_turtle/claude-telegram-bot/src/session.ts (Claude session save semantics)
- super_turtle/claude-telegram-bot/src/codex-session.ts (Codex session list semantics)

2026-03-07:
- `/resume` now keeps the 5-per-driver cap but globally sorts the merged Claude/Codex options by `saved_at`.
- Regression coverage now exercises mixed-driver ordering, inactive-driver visibility, and session persistence across `kill()` for both Claude and Codex.
