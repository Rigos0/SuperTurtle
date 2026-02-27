## Current Task
Completed: tunnel/preview security review documented and low-risk helper hardening shipped.

## End Goal with Specs
Documented review of tunnel flow (start-tunnel.sh, cloudflared usage, preview links), identify risks, and apply low-risk fixes.

## Backlog
- [x] Review tunnel helper, process lifecycle, URL exposure, logging
- [x] Identify risks (public exposure, token leakage, path traversal, process control)
- [x] Fix small issues (sanity checks, safer defaults)
- [x] Document findings
- [x] Update state and stop

## Notes
Focus on `super_turtle/subturtle/start-tunnel.sh` and any bot references.

## Loop Control
STOP
