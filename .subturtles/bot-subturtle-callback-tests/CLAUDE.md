## Current Task
Commit callback SubTurtle/pinologs test coverage changes.

## End Goal with Specs
Tests cover:
- callback `subturtle_stop:<name>` triggers ctl stop and replies with result
- callback `subturtle_logs:<name>` fetches logs and replies in chunks
- pinologs callback covers info/warn/error routing and invalid level guard

## Backlog
- [x] Review `super_turtle/claude-telegram-bot/src/handlers/callback.ts` subturtle/pinologs blocks
- [x] Add tests in `super_turtle/claude-telegram-bot/src/handlers/callback.subturtle.test.ts` (new)
- [x] Mock `Bun.spawnSync` and log reads for deterministic outputs
- [x] Run targeted bun tests for new coverage
- [ ] Commit <- current

## Notes
Target files:
- super_turtle/claude-telegram-bot/src/handlers/callback.ts
