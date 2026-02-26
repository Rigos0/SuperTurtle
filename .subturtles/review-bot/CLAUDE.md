## Current Task
Check reviewed files for unused imports, dead code, and leftover console logs.

## End Goal with Specs
Review all recent bot/Telegram changes for code quality — dead code, unused imports, error handling gaps, test coverage issues, style inconsistencies. Fix anything found and commit clean.

Files to review:
- `super_turtle/claude-telegram-bot/src/handlers/voice.ts` — voice handler queue fix
- `super_turtle/claude-telegram-bot/src/handlers/streaming.ts` — stall timeout recovery
- `super_turtle/claude-telegram-bot/src/handlers/commands.ts` — commands cleanup (191 lines removed)
- `super_turtle/claude-telegram-bot/src/cron-supervision-queue.ts` — new cron queue module
- `super_turtle/claude-telegram-bot/src/cron-supervision-queue.test.ts` — tests for above
- `super_turtle/claude-telegram-bot/src/session.stall-timeout.test.ts` — stall timeout tests
- `super_turtle/claude-telegram-bot/src/formatting.ts` — formatting helpers
- `super_turtle/claude-telegram-bot/src/index.ts` — entry point changes
- `super_turtle/claude-telegram-bot/src/codex-session.ts` — codex session changes

## Backlog
- [x] Read all listed files thoroughly
- [ ] Check for unused imports, dead code, leftover console.logs <- current
- [ ] Verify test files cover edge cases and have no skipped/broken tests
- [ ] Check error handling in voice handler and streaming recovery
- [ ] Fix any style inconsistencies (naming, spacing, patterns)
- [ ] Ensure cron-supervision-queue is properly integrated (no orphan code)
- [ ] Commit all cleanup changes with descriptive message
- [ ] Write `## Loop Control\nSTOP` to CLAUDE.md
