# Current task
Compare Codex streaming path in `super_turtle/claude-telegram-bot/src/drivers/codex-driver.ts` and `super_turtle/claude-telegram-bot/src/codex-session.ts`.

# End goal with specs
Produce a code review of the new Telegram streaming UI with findings focused on bugs, behavioral mismatches, regressions, and missing tests. Compare the Claude and Codex paths for retained progress creation, pacing, snapshot history, final result promotion, and arrow navigation behavior. Do not implement product changes unless a bug fix is required to complete the review. Review should cite concrete files/functions and highlight whether Codex and Claude behave the same way or where they diverge.

# Roadmap (Completed)
- Scanned repo instructions and SubTurtle contract.
- Chosen worker scope: code review only, focused on Telegram streaming UI parity.

# Roadmap (Upcoming)
- Read the retained progress renderer and shared streaming state logic.
- Compare Claude session streaming flow against Codex driver/session flow.
- Check callback navigation behavior and history snapshot behavior for both paths.
- Review focused tests for parity gaps and missing coverage.
- Summarize findings with file references and severity ordering.

# Backlog
- [x] Inspect shared retained progress renderer in `super_turtle/claude-telegram-bot/src/handlers/streaming.ts`
- [x] Compare Claude streaming path in `super_turtle/claude-telegram-bot/src/session.ts`
- [ ] Compare Codex streaming path in `super_turtle/claude-telegram-bot/src/drivers/codex-driver.ts` and `super_turtle/claude-telegram-bot/src/codex-session.ts` <- current
- [ ] Check retained progress callback navigation behavior in `super_turtle/claude-telegram-bot/src/handlers/callback.ts`
- [ ] Review focused tests in `super_turtle/claude-telegram-bot/src/handlers/streaming.test.ts` and `super_turtle/claude-telegram-bot/src/handlers/callback.test.ts`
- [ ] Write code review findings with parity conclusions and concrete file/function references
