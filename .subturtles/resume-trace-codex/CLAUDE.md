## Current task
Identify exact sorting bug and exact persistence/save bug with code references.

## End goal with specs
Produce a root-cause analysis with exact file/function references and a minimal, correct fix plan for both issues.

## Backlog
- [x] Inspect /resume session list build path in super_turtle/claude-telegram-bot/src/handlers/commands.ts
- [x] Trace driver-switch and new-session behavior in callback/commands/streaming handlers and session managers
- [x] Reproduce logic-level failure path: Claude session active -> switch to Codex -> /resume visibility
- [ ] Identify exact sorting bug and exact persistence/save bug with code references <- current
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
- Trace coverage in `super_turtle/claude-telegram-bot/src/handlers/switch-new-session.trace.test.ts` now pins the control flow:
  - `handleSwitch()` in `src/handlers/commands.ts`, callback `switch:*` in `src/handlers/callback.ts`, and bot-control `switch_driver` in `src/handlers/streaming.ts` all go through `resetAllDriverSessions({ stopRunning: true })`; Codex switch paths then call `codexSession.startNewThread()` before flipping `session.activeDriver`.
  - `/new` in `src/handlers/commands.ts` resets both drivers, but bot-control `new_session` in `src/handlers/streaming.ts` only calls `sessionObj.stop()` and `sessionObj.kill()` for the invoking driver, leaving the other driver's linked session untouched.
- `super_turtle/claude-telegram-bot/src/handlers/switch-resume-visibility.trace.test.ts` now reproduces the exact command path: active Claude session -> `/switch codex` -> `/resume`; it confirms the prior Claude session is persisted to disk, the new Codex thread becomes the hidden current session, and `/resume` exposes `resume_current` plus the saved Claude session.
