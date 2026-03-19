# Review Findings

## Commit `7dbdb994` - `Fix subturtle board unpin after completion`

### Test Gaps

- `super_turtle/claude-telegram-bot/src/subturtle-board-service.test.ts:9`: the added test only checks that `"worker.cleanup_verified"` and `"worker.completed"` are in the allowlist. It still does not exercise `startSubturtleBoardService()` consuming `events.jsonl` and triggering a live-board refresh/unpin when those events arrive, which is the watcher path this commit is trying to fix. A regression in `readNewEvents()` or the debounce/reconcile flow would still pass this suite.

## Commit `ed35687e` - `Simplify Telegram subturtle board UX`

### Medium

- `super_turtle/claude-telegram-bot/src/handlers/commands.ts:2373` and `super_turtle/claude-telegram-bot/src/handlers/commands.ts:2839`: the refactor moved the running-picker header into `buildSubturtleOverviewLines()`, but `buildSubturtleMenuMessage()` still appends the same `📚 Running picker: page X/Y` line again. As soon as there are enough running workers to paginate, every `/sub` menu repeats that heading twice. The new tests only assert that `"page 2/2"` is present, so this regression slips through.

### Medium

- `super_turtle/claude-telegram-bot/src/handlers/commands.ts:2674`, `super_turtle/claude-telegram-bot/src/handlers/commands.ts:2813`, `super_turtle/claude-telegram-bot/src/subturtle-board-service.ts:30`, and `super_turtle/claude-telegram-bot/src/index.ts:708`: live-board records are persisted per `chat_id`, and `/sub` now creates them for whatever chat invoked the command, but both background refresh paths only ever reconcile `ALLOWED_USERS[0]`. That means a board opened from any other authorized chat context, such as a group chat where the allowed user invokes `/sub`, will never receive the event-driven or cron-driven refreshes this commit introduces and will go stale until someone manually presses a button. The added tests only cover boards keyed to the primary test chat, so this mismatch is untested.

## Commit `bd2a881f` - `Refactor Codex pending output coordination`

### High

- `super_turtle/claude-telegram-bot/src/drivers/codex-driver.ts:4`: this commit starts importing `../message-kinds`, but that module is not present anywhere in the `bd2a881f` tree (`git ls-tree -r --name-only bd2a881f super_turtle/claude-telegram-bot/src` only lists `codex-driver.ts`, `codex-driver.test.ts`, and `codex-pending-outputs.ts` under `src/drivers`, and `git show bd2a881f:super_turtle/claude-telegram-bot/src/message-kinds.ts` fails). In a clean checkout of the reviewed commit, `codex-driver.ts` therefore has an unresolved import and the bot cannot build or run until some later, separate change adds that file. There is also no commit-local test coverage that imports the driver from a clean tree, so this breakage slips through.
