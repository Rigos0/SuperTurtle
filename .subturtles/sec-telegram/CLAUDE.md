## Current Task
Fix small/low-risk issues safely.

## End Goal with Specs
A documented security review covering Telegram integration risks, concrete findings with severity, and fixes for low-risk issues. No regression.

## Backlog
- [x] Map Telegram ingress/egress and auth boundaries in code
- [x] Identify security risks (token handling, update validation, injection, file ops)
- [ ] Fix small/low-risk issues safely <- current
- [ ] Document findings and any fixes
- [ ] Update state and stop

## Notes
Focus on `super_turtle/claude-telegram-bot` and MCP servers. Prefer minimal fixes; document anything larger.
Boundary map added at `super_turtle/claude-telegram-bot/docs/security-telegram-boundary-map.md`.
Risk findings added at `super_turtle/claude-telegram-bot/docs/security-risk-findings.md`.
