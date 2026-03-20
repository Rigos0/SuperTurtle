# Current task
Update `super_turtle/claude-telegram-bot/src/handlers/streaming.test.ts` to cover retained progress updates and separate final answer delivery.

# End goal with specs
Finish the Telegram progress UX work end-to-end: specs, implementation, tests, and final commit(s).

Spec targets:
- `super_turtle/docs/TELEGRAM_PROGRESS_UX_SPEC.md`

Related files to align only if needed:
- `super_turtle/docs/TELEGRAM_WEBHOOK_POC.md`
- `super_turtle/docs/REPO_BOUND_TELEPORT_SPEC.md`
- `super_turtle/docs/E2B_WEBHOOK_WAKE_POC.md`
- `super_turtle/docs/E2B_BETA_RUNTIME_DX.md`

Implementation targets:
- `super_turtle/claude-telegram-bot/src/handlers/text.ts`
- `super_turtle/claude-telegram-bot/src/handlers/streaming.ts`
- `super_turtle/claude-telegram-bot/src/handlers/streaming.test.ts`

Acceptance criteria:
- the primary UX spec reads like an implementation-ready spec, not a loose draft
- inconsistent terminology or contradictory requirements across the touched spec files are resolved
- touched docs keep concise Markdown structure and explicit status/decision language
- foreground text runs use one retained progress message instead of separate thinking/tool/heartbeat progress bubbles in the normal path
- the final successful answer still arrives as a separate notifying message beneath the retained progress message
- relevant streaming tests pass
- the work lands through focused commits with the state file kept up to date

# Roadmap (Completed)
- Meta agent identified the main draft spec surface in `super_turtle/docs/`
- Meta agent merged the workstreams back into one SubTurtle so this worker now owns specs plus implementation

# Roadmap (Upcoming)
- Rewrite the UX spec into concrete implementation language
- Align any adjacent docs that must match the final UX/runtime contract
- Implement the retained foreground progress-message flow in the Telegram bot
- Update tests to lock the retained-progress and separate-final-answer behavior
- Re-read, verify, and commit the finished work

# Backlog
- [x] Read `super_turtle/docs/TELEGRAM_PROGRESS_UX_SPEC.md` closely and list the unresolved or draft-only sections
- [x] Cross-check `super_turtle/docs/TELEGRAM_WEBHOOK_POC.md` and `super_turtle/docs/REPO_BOUND_TELEPORT_SPEC.md` for terms or requirements that should match
- [x] Rewrite `super_turtle/docs/TELEGRAM_PROGRESS_UX_SPEC.md` into a concrete implementation-ready spec
- [x] Update any other spec files only where the UX/runtime contract must stay aligned
- [x] Re-read all touched spec docs and remove contradictions, vague wording, and stale status language
- [x] Implement a single retained progress-message path for foreground text runs in `super_turtle/claude-telegram-bot/src/handlers/streaming.ts`
- [ ] Update `super_turtle/claude-telegram-bot/src/handlers/streaming.test.ts` to cover retained progress updates and separate final answer delivery <- current
- [ ] Run the relevant streaming test file and fix regressions
- [ ] Commit the remaining implementation changes with a clear message
