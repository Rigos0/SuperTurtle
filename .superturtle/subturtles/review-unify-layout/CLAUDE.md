# Current task
Inspect the local deletion of `.subturtles/teleport-provider-registry/CLAUDE.md` for migration/regression risk.

# End goal with specs
- Review `git diff main...HEAD` plus local unstaged changes without modifying product code unless a review artifact is needed.
- Prioritize correctness bugs, regressions, missing test coverage, security risks, and operational risks in the runtime-layout, cloud CLI, teleport/webhook, and Telegram transport changes.
- Inspect the largest/highest-risk areas first: `super_turtle/bin/*.js`, `super_turtle/claude-telegram-bot/src/index.ts`, `super_turtle/claude-telegram-bot/src/telegram-transport.ts`, `super_turtle/claude-telegram-bot/src/teleport.ts`, `super_turtle/claude-telegram-bot/src/config.ts`, and related tests.
- Produce a review note under `super_turtle/docs/reviews/` summarizing findings with file references and severity, or explicitly state that no material findings were found.
- Leave the branch otherwise untouched and keep this state file updated as the review progresses.

# Roadmap (Completed)
- Review target identified: current branch `unify-superturtle-layout` compared to local `main`.
- Initial risk scan completed from diffstat; large new cloud/runtime files and runtime layout migration changes are in scope.

# Roadmap (Upcoming)
- Inspect branch diff and cluster changes by risk area.
- Review high-risk runtime and transport code paths for correctness and regressions.
- Check whether tests meaningfully cover the new behavior and identify gaps.
- Write the final review artifact in `super_turtle/docs/reviews/`.

# Backlog
- [x] Read `git diff --stat main...HEAD` and map the highest-risk files first
- [x] Review `super_turtle/bin/cloud.js`, `super_turtle/bin/cloud-control-plane-contract.js`, `super_turtle/bin/e2b-webhook-poc-lib.js`, and `super_turtle/bin/runtime-ownership-agent.js`
- [x] Review `super_turtle/claude-telegram-bot/src/index.ts`, `super_turtle/claude-telegram-bot/src/telegram-transport.ts`, `super_turtle/claude-telegram-bot/src/teleport.ts`, and `super_turtle/claude-telegram-bot/src/config.ts`
- [x] Review the touched tests to confirm coverage for new behavior and identify missing cases
- [ ] Inspect the local deletion of `.subturtles/teleport-provider-registry/CLAUDE.md` for migration/regression risk <- current
- [ ] Write `super_turtle/docs/reviews/review-unify-layout-2026-03-16.md` with prioritized findings and clear file references
