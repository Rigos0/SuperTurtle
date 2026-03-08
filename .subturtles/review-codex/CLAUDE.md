# Current task
Review bot runtime (handlers, session, config, drivers) in `super_turtle/claude-telegram-bot/src/`.

# End goal with specs
Produce a thorough code review saved to `docs/reviews/codex-review-2026-03-08.md`. Focus on bugs, logic errors, race conditions, dead code, error handling gaps, security concerns, and anything suspicious. Be specific with file paths and line numbers. Prioritize findings by severity (critical > medium > low). Be opinionated — if something smells bad, say so. This is a READ-ONLY review task: don't fix things, just report them.

# Roadmap (Completed)
- (none yet)

# Roadmap (Upcoming)
- Code review of entire Super Turtle codebase
- Written review document with prioritized findings

# Backlog
- [x] Explore the codebase structure and key files
- [ ] Review bot runtime (handlers, session, config, drivers) in super_turtle/claude-telegram-bot/src/ <- current
- [ ] Review conductor system (state, wakeups, inbox, events) in super_turtle/claude-telegram-bot/src/conductor/
- [ ] Review SubTurtle orchestration (ctl, loops, watchdog) in super_turtle/subturtle/
- [ ] Review MCP tools and utilities
- [ ] Write findings to docs/reviews/codex-review-2026-03-08.md
- [ ] Commit the review
