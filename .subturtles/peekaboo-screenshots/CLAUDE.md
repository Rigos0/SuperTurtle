## Current Task
Update SubTurtle frontend guidance to use Peekaboo.

## End Goal with Specs
Peekaboo is the default screenshot tool for frontend verification. Provide a simple CLI wrapper and docs. Remove or deprecate the Playwright wrapper. Provide example usage for SubTurtles.

## Backlog
- [x] Inspect current Playwright screenshot script and docs additions
- [x] Implement Peekaboo-based screenshot script (simple wrapper)
- [ ] Update SubTurtle frontend guidance to use Peekaboo <- current
- [x] Remove or clearly deprecate Playwright wrapper
- [ ] Update docs and stop

## Notes
Prefer a single entrypoint script like `super_turtle/subturtle/browser-screenshot.sh` but use `peekaboo` CLI under the hood.
Wrapper now uses `peekaboo app launch` + `peekaboo image` and keeps old Playwright flags as deprecated no-ops for transition safety.
