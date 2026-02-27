## Current Task
Finalize state handoff and stop in the next loop after confirming parity changes landed cleanly.

## End Goal with Specs
Meta agent runs with the same network access and sandbox permissions as SubTurtles. Preview links and web research succeed from meta context. Changes are documented and configurable.

## Backlog
- [x] Locate meta-agent runtime config and where sandbox/network permissions are set
- [x] Compare with SubTurtle runtime config and identify differences
- [x] Implement parity changes (config or launcher) for meta agent
- [x] Add minimal verification steps and docs update
- [ ] Update state and stop <- current

## Notes
Meta Codex runtime now has explicit, env-configurable parity defaults in `super_turtle/claude-telegram-bot/src/config.ts`:
- `META_CODEX_SANDBOX_MODE` (default `danger-full-access`)
- `META_CODEX_APPROVAL_POLICY` (default `never`)
- `META_CODEX_NETWORK_ACCESS` (default `true`)
