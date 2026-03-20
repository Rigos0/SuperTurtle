# Current task
Align final success/artifact delivery with the spec; `streaming.ts` still renders raw previews instead of `Done`, and media flows send silent artifacts before re-notifying via text promotion.

# End goal with specs
Finish the Telegram foreground progress UX end-to-end so the shipped code matches the current implementation spec in `super_turtle/docs/TELEGRAM_PROGRESS_UX_SPEC.md`.

Primary spec:
- `super_turtle/docs/TELEGRAM_PROGRESS_UX_SPEC.md`

Primary implementation files:
- `super_turtle/claude-telegram-bot/src/handlers/streaming.ts`
- `super_turtle/claude-telegram-bot/src/handlers/text.ts`
- `super_turtle/claude-telegram-bot/src/handlers/stop.ts`
- `super_turtle/claude-telegram-bot/src/handlers/callback.ts`
- `super_turtle/claude-telegram-bot/src/handlers/streaming.test.ts`
- add new focused tests if needed

What is already done:
- one silent retained progress message exists for foreground streaming
- final text/image/sticker output still uses a separate terminal result message
- base tests for retained progress flow already landed

What still likely remains:
- canonical rendered progress states instead of raw ad hoc text
- retained progress snapshots with bounded history
- `Back` / `Next` inline navigation after completion
- fuller stop/failure handling so the retained progress message stays consistent with the spec
- attention-required handling that preserves the progress message as context

Constraints:
- continue from the current repo state; do not revert shipped commits
- ignore the unrelated deleted archived worker state at `.superturtle/subturtles/spec-finisher/CLAUDE.md`
- keep scope tightly aligned to the progress UX spec; do not refactor unrelated bot systems
- update tests alongside behavior changes

Acceptance criteria:
- the code path for foreground text runs matches the required run shape in the spec
- retained progress snapshots and post-run navigation exist if the current codebase can support them cleanly
- stop/failure/final-artifact behavior is consistent with the spec
- relevant tests pass
- changes are committed in focused commits with this state file updated after each iteration

# Roadmap (Completed)
- Previous work landed the implementation spec and the first retained-progress streaming slice

# Roadmap (Upcoming)
- Identify the remaining gaps between the spec and the current implementation
- Implement the highest-value missing retained-progress features
- Extend tests to cover the missing behaviors
- Verify the relevant test suite and commit progress until the backlog is complete

# Backlog
- [x] Compare `super_turtle/docs/TELEGRAM_PROGRESS_UX_SPEC.md` against `super_turtle/claude-telegram-bot/src/handlers/streaming.ts`, `text.ts`, `stop.ts`, and `callback.ts` to list the concrete missing behaviors
- [x] Implement canonical progress-state rendering and any required retained-progress metadata in `super_turtle/claude-telegram-bot/src/handlers/streaming.ts`
- [x] Implement retained snapshot history and `Back` / `Next` navigation for the retained progress message; `callback.ts` currently has no progress-viewer callbacks and `StreamingState` stores no snapshot history
- [x] Implement or align stop/failure/attention-required behavior so the retained progress message remains correct across those flows; `stop.ts` still sends a separate stop reply, and `text.ts` error handling still tears the progress message down
- [ ] Align final success/artifact delivery with the spec; `streaming.ts` still renders raw previews instead of `Done`, and media flows send silent artifacts before re-notifying via text promotion <- current
- [ ] Update or add focused tests for the newly implemented behaviors
- [ ] Run the relevant test files and fix regressions
- [ ] Commit the changes with a clear message

Audit findings:
- `streaming.ts` creates and retains a silent progress message, but it renders raw thinking/tool/text content instead of canonical `Starting` / `Thinking` / `Using tools` / `Writing answer` / `Still working` / terminal states with a summary and footer.
- Heartbeat timing is off-spec today: it switches after 15s of quiet time and can refresh every 5s, while the spec requires entering `Still working` after 20s and refreshing at most every 30s.
- No bounded progress snapshots are stored, so there is no way to retain state transitions, tool start/completion, or answer-preview history for a post-run viewer.
- `callback.ts` has no handler for progress history navigation, so the required `Back` / `Next` controls and page indicator do not exist.
- Normal stop and failure flows do not preserve the retained message in spec shape: `stop.ts` sends a separate stop reply instead of `Stopping` / `Stopped` edits, and `text.ts` error handling deletes the progress message rather than retaining `Failed`.
- Final artifact handling is still off-spec: image/sticker flows are sent silently as side effects and then promoted through a text resend path instead of making the artifact itself the notified terminal result beneath a retained `Done` progress message.
