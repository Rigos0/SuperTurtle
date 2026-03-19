# Current task

Write final findings and stop once the review is complete.

# End goal with specs

Produce a code review for today's March 19, 2026 work, focused on streaming coordination and Codex pending-output internals:

- `27cf3247` `Fix Codex stall on pending output flush`
- `bd2a881f` `Refactor Codex pending output coordination`
- `4e4dad7b` `Clean tracked subturtle state and add message kind helpers`

Primary files to inspect:

- `super_turtle/claude-telegram-bot/src/drivers/codex-driver.ts`
- `super_turtle/claude-telegram-bot/src/drivers/codex-pending-outputs.ts`
- `super_turtle/claude-telegram-bot/src/handlers/streaming.ts`
- `super_turtle/claude-telegram-bot/src/message-kinds.ts`
- related tests touched today

Acceptance criteria:

- Find correctness bugs, race conditions, stale-state issues, classification mistakes, or missing tests
- Prioritize findings by severity with concrete file references
- Run targeted tests if that materially improves confidence
- Do not make code changes unless a fix is tiny and clearly safe
- Stop when the review is complete and the state reflects completion

# Roadmap (Completed)

- Seeded worker scope and today's relevant commits for streaming/pending-output review.

# Roadmap (Upcoming)

- Inspect today's streaming/pending-output commits and summarize intended behavior.
- Review coordination logic, retries, and shutdown/flush behavior.
- Check helper classification and related tests for gaps.
- Run focused validation if needed.
- Record findings clearly, then stop.

# Backlog

- [x] Inspect today's streaming/pending-output commits and summarize the intended behavior. `27cf3247` adds timeout-guarded pending-output flushing plus deferred `done` forwarding so hung checks do not stall completion; `bd2a881f` extracts that pump/tool-completion/final-flush logic into `codex-pending-outputs.ts`; `4e4dad7b` adds outbound message-kind classifiers so streaming code can distinguish progress, final output, and side-effect messages.
- [x] Review `super_turtle/claude-telegram-bot/src/drivers/codex-pending-outputs.ts` for races, retries, and flush/shutdown edge cases. Found a high-severity `ask_user` timeout race: if `runPendingCheck()` times out but the underlying checker later succeeds, `handleToolCompletion()` still returns `false`, so Codex can continue streaming after the prompt was already sent.
- [x] Review `super_turtle/claude-telegram-bot/src/drivers/codex-driver.ts` and `super_turtle/claude-telegram-bot/src/handlers/streaming.ts` for integration regressions. Found two more issues: `codex-driver.ts` buffers `done`, so the stale-session retry path in `codex-session.ts` can throw after emitting `done` and skip streaming teardown before `driver-routing.ts` retries; deferred completion also leaves `send_image`/`send_turtle` side effects able to overwrite `lastNotifiableOutput`, so a late media flush can replace the final answer notification.
- [x] Review `super_turtle/claude-telegram-bot/src/message-kinds.ts` and its usage for classification gaps. No additional classification bugs beyond the earlier notification-overwrite regression: the helper covers the current `DriverStatusType` union and current Codex side-effect tools (including hyphenated aliases), but its usage is still observational because `streaming.ts` does not consult message kinds before side-effect handlers replace `lastNotifiableOutput`.
- [x] Review the related tests touched today for missing coverage or brittle assertions. `codex-driver.test.ts` covers the timeout/hang happy path but misses the stale-session retry path where `codexSession.sendMessage()` emits `done` and then throws, so the deferred-`done` teardown regression in `codex-driver.ts` would still ship unchecked; its `Promise.race(...900ms)` plus 10/25ms env timeouts also makes the stall assertion wall-clock-dependent. `message-kinds.test.ts` only checks the classifier lookup table, so it provides no integration coverage that `streaming.ts` actually uses those kinds to protect `lastNotifiableOutput` from late `send_image`/`send_turtle` side effects.
- [x] Run focused tests or checks if they materially improve confidence. Ran `bun test src/message-kinds.test.ts src/drivers/codex-driver.test.ts`.
- [ ] Write final findings and stop once the review is complete <- current
