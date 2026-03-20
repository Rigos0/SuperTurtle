# Current task

Isolate `super_turtle/claude-telegram-bot/src/handlers/commands.subturtle.test.ts` with a temporary working/data dir so board tests cannot touch the real `.superturtle/state/telegram/subturtle-boards/<chat>.json` files in the repo.

# End goal with specs

- Remove or rewrite the unsafe test behavior that can touch the real `.superturtle/state/telegram/subturtle-boards/<chat>.json` file during local test runs.
- Make live SubTurtle board reconciliation idempotent and dedupe-safe even if the tracked board record is missing, stale, or was deleted externally.
- Preserve the existing user-facing `/sub` and callback board behavior unless a change is required to prevent duplicates.
- Add or update tests that cover the record-loss / stale-record path and prove we do not end up with two pinned board messages.
- Land the implementation and tests in the repo with a clean worker backlog and commit progress normally.

# Roadmap (Completed)

- Confirmed that `commands.subturtle.test.ts` can target the real board tracking file through `TELEGRAM_ALLOWED_USERS`.
- Confirmed that `syncLiveSubturtleBoard()` currently recreates a board when the record is missing instead of recovering or deduplicating.

# Roadmap (Upcoming)

- Audit the exact board lifecycle and choose a robust idempotent recovery strategy.
- Isolate test state from live Telegram board state so local tests cannot mutate real tracking records.
- Implement board dedupe / recovery logic and add regression coverage.
- Verify the updated behavior with the relevant test slice.

# Backlog

- [x] Audit the live board lifecycle in `src/handlers/commands.ts`, `src/subturtle-board-service.ts`, and related callbacks to define the concrete recovery/dedupe strategy
- [ ] Rewrite or remove the unsafe board-record test behavior in `src/handlers/commands.subturtle.test.ts` using a temp working/data dir fixture so tests never touch the live tracking file <- current
- [ ] Implement idempotent live-board reconciliation by reusing the callback target message when present and otherwise recovering the currently pinned SubTurtle board before creating a new one
- [ ] Add regression tests for record deletion / stale record / recreate paths and pinned-message dedupe behavior, including pinned-board recovery when the record is missing
- [ ] Run the relevant bot test slice and fix any failures caused by the changes
- [ ] Update this state file to reflect progress and stop only when the backlog is complete
