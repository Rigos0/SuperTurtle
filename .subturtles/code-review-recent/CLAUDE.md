## Current Task
Update state and stop.

## End Goal with Specs
Provide a review doc with top risks and implement small fixes. Call out larger issues without changing behavior unexpectedly.

## Backlog
- [x] Identify recent commits and areas touched
- [x] Review for bugs, security issues, regressions
- [x] Fix small issues; document larger ones
- [ ] Update state and stop <- current

## Notes
Fixed `ctl stop` phantom run-state logging for unknown names; left voice stop/deferred-queue behavior documented as a larger follow-up risk.
