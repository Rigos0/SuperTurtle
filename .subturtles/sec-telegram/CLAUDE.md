## Current Task
Document findings and any fixes.

## End Goal with Specs
A documented security review covering Telegram integration risks, concrete findings with severity, and fixes for low-risk issues. No regression.

## Backlog
- [x] Map Telegram ingress/egress and auth boundaries in code
- [x] Identify security risks (token handling, update validation, injection, file ops)
- [x] Fix small/low-risk issues safely
- [ ] Document findings and any fixes <- current
- [ ] Update state and stop

## Notes
Focus on `super_turtle/claude-telegram-bot` and MCP servers. Prefer minimal fixes; document anything larger.
Boundary map added at `super_turtle/claude-telegram-bot/docs/security-telegram-boundary-map.md`.
Risk findings added at `super_turtle/claude-telegram-bot/docs/security-risk-findings.md`.
Implemented ST-SEC-007 mitigation in callback handling: strict identifier validation for ask-user request IDs and SubTurtle names, with coverage in `src/handlers/callback.security.test.ts`.
