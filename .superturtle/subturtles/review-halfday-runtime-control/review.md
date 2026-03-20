# Runtime/Control Review Notes

## Findings

1. High: [`super_turtle/bin/superturtle.js`](/Users/Richard.Mladek/Documents/projects/agentic/super_turtle/bin/superturtle.js#L930) still assumes the spawned shell PID is also a killable process-group ID, but [`serviceRun()`](/Users/Richard.Mladek/Documents/projects/agentic/super_turtle/bin/superturtle.js#L1128) starts `bash -lc ...` without `detached: true`, so `process.kill(-child.pid, ...)` falls through with `ESRCH` and the fallback only signals the intermediate shell. In a local reproduction of the new `caffeinate -s ... | tee` command shape, the wrapped worker stayed alive after the shell PID was terminated. Because [`shutdown()`](/Users/Richard.Mladek/Documents/projects/agentic/super_turtle/bin/superturtle.js#L1004) immediately releases the hosted lease and clears `.superturtle/service.pid`, `superturtle stop`, lease-loss shutdown, and signal handling can all report a clean stop while the bot loop continues running untracked. The new keep-awake wrapper makes this more dangerous by adding another long-lived process below the tracked shell. [`super_turtle/tests/sleep-prevention.test.js`](/Users/Richard.Mladek/Documents/projects/agentic/super_turtle/tests/sleep-prevention.test.js#L5) only checks generated command strings, so this stop-path regression is currently untested.

## Scope

Window captured on 2026-03-20 11:46:02 +0100 on `dev`, covering commits since 2026-03-19 23:46:02 +0100.

Selection rule for the primary review lane:

- touched one or more of `super_turtle/bin/superturtle.js`, `super_turtle/claude-telegram-bot/src/drivers/`, `super_turtle/claude-telegram-bot/src/codex-session.ts`, `super_turtle/claude-telegram-bot/src/config.ts`, `super_turtle/claude-telegram-bot/src/session.ts`, `super_turtle/claude-telegram-bot/src/subturtle-board-service.ts`, `super_turtle/claude-telegram-bot/src/handlers/commands.ts`, `super_turtle/claude-telegram-bot/src/handlers/callback.ts`, or `super_turtle/claude-telegram-bot/src/handlers/stop.ts`
- or only changed tests that directly exercise those paths

## In-Scope Commits

1. `fdff68efa71dd4a72a696c819f4b088aa2c0832a` (2026-03-19 23:50:52 +0100) `Restore sleep prevention for SuperTurtle service runner`
   Touched files: `super_turtle/CHANGELOG.md`, `super_turtle/bin/superturtle.js`, `super_turtle/package.json`, `super_turtle/tests/sleep-prevention.test.js`
2. `9399ab8421c14344572f20c72405269cf3b2d3f3` (2026-03-19 23:59:03 +0100) `Fix subturtle board pin lifecycle`
   Touched files: `super_turtle/claude-telegram-bot/src/handlers/commands.subturtle.test.ts`, `super_turtle/claude-telegram-bot/src/handlers/commands.ts`
3. `db09902172b644050516fa7e6407aa818e3f1083` (2026-03-20 00:00:52 +0100) `Strengthen sleep prevention regression coverage`
   Touched files: `super_turtle/bin/superturtle.js`, `super_turtle/tests/sleep-prevention.test.js`
4. `7846e93a6aa2d41daa613c459f18996f561d1b3b` (2026-03-20 00:35:36 +0100) `Fix codex deferred done cleanup on stale session errors`
   Touched files: `.superturtle/subturtles/fix-stale-teardown/CLAUDE.md`, `super_turtle/claude-telegram-bot/src/drivers/codex-driver.test.ts`, `super_turtle/claude-telegram-bot/src/drivers/codex-driver.ts`
5. `987576e36beb7abae1090205e9086f4d6eb9de04` (2026-03-20 00:35:41 +0100) `Add ask_user timeout grace window`
   Touched files: `.superturtle/subturtles/fix-ask-timeout-race/CLAUDE.md`, `super_turtle/claude-telegram-bot/src/drivers/codex-pending-outputs.test.ts`, `super_turtle/claude-telegram-bot/src/drivers/codex-pending-outputs.ts`
6. `bd78702e39d04dffa17bb60091e894bb6131eda8` (2026-03-20 00:46:02 +0100) `Isolate subturtle handler tests from config mock leaks`
   Touched files: `.superturtle/subturtles/fix-ask-timeout-race/CLAUDE.md`, `.superturtle/subturtles/fix-stale-teardown/CLAUDE.md`, `super_turtle/claude-telegram-bot/src/handlers/callback.subturtle.test.ts`, `super_turtle/claude-telegram-bot/src/handlers/callback.ts`, `super_turtle/claude-telegram-bot/src/handlers/commands.subturtle.test.ts`, `super_turtle/claude-telegram-bot/src/handlers/commands.ts`
7. `1509c0da94f2ed3a4207a942632ae23fd03ad1fc` (2026-03-20 00:54:22 +0100) `Fix duplicate stop replies and clean stale subturtle state`
   Touched files: `.superturtle/subturtles/fix-ask-timeout-race/CLAUDE.md`, `.superturtle/subturtles/fix-notifiable-overwrite/CLAUDE.md`, `.superturtle/subturtles/fix-stale-teardown/CLAUDE.md`, `.superturtle/subturtles/review-today-codex/CLAUDE.md`, `super_turtle/claude-telegram-bot/src/codex-session.conductor-inbox.test.ts`, `super_turtle/claude-telegram-bot/src/handlers/stop.test.ts`, `super_turtle/claude-telegram-bot/src/handlers/stop.ts`
8. `d664d182ddfd70627910e66429f65807c4295297` (2026-03-20 01:16:25 +0100) `Stabilize Telegram bot CI tests`
   Touched files: `super_turtle/claude-telegram-bot/src/config.ts`, `super_turtle/claude-telegram-bot/src/drivers/codex-driver.test.ts`, `super_turtle/claude-telegram-bot/src/handlers/callback.subturtle.test.ts`, `super_turtle/claude-telegram-bot/src/handlers/commands.subturtle.test.ts`, `super_turtle/claude-telegram-bot/src/handlers/streaming.test.ts`, `super_turtle/claude-telegram-bot/src/handlers/voice.typing.test.ts`, `super_turtle/claude-telegram-bot/src/session.ask-user.test.ts`, `super_turtle/claude-telegram-bot/src/session.ts`, `super_turtle/claude-telegram-bot/src/subturtle-board-service.ts`
9. `6320317cff9314970c85d86adfe94e1f037d9365` (2026-03-20 09:11:10 +0100) `Add retained progress snapshot navigation`
   Touched files: `.superturtle/subturtles/progress-ux-full/CLAUDE.md`, `super_turtle/claude-telegram-bot/src/handlers/callback.test.ts`, `super_turtle/claude-telegram-bot/src/handlers/callback.ts`, `super_turtle/claude-telegram-bot/src/handlers/streaming.test.ts`, `super_turtle/claude-telegram-bot/src/handlers/streaming.ts`
10. `edde2789873bb044d42964dfe54d4b790d66229e` (2026-03-20 09:24:58 +0100) `Retain Telegram progress state on stop and failure`
    Touched files: `.superturtle/subturtles/progress-ux-full/CLAUDE.md`, `super_turtle/claude-telegram-bot/src/codex-session.ts`, `super_turtle/claude-telegram-bot/src/handlers/codex.flow.test.ts`, `super_turtle/claude-telegram-bot/src/handlers/stop.test.ts`, `super_turtle/claude-telegram-bot/src/handlers/stop.ts`, `super_turtle/claude-telegram-bot/src/handlers/streaming.ts`, `super_turtle/claude-telegram-bot/src/handlers/text.progress.test.ts`, `super_turtle/claude-telegram-bot/src/handlers/text.ts`, `super_turtle/claude-telegram-bot/src/session.ask-user.test.ts`, `super_turtle/claude-telegram-bot/src/session.ts`
11. `36cd90a5a207ab7537d874422a82330f9d84689b` (2026-03-20 10:35:22 +0100) `test retained progress callback navigation`
    Touched files: `.superturtle/subturtles/streaming-ui-review/CLAUDE.md`, `super_turtle/claude-telegram-bot/src/handlers/callback.test.ts`
12. `f2d472a569391c125378c09b1f4cc76dcfaee000` (2026-03-20 10:57:34 +0100) `Refresh live subturtle board lifecycle`
    Touched files: `super_turtle/claude-telegram-bot/src/handlers/commands.subturtle.test.ts`, `super_turtle/claude-telegram-bot/src/handlers/commands.ts`

## Deduped Review Targets

- `super_turtle/bin/superturtle.js`
- `super_turtle/tests/sleep-prevention.test.js`
- `super_turtle/claude-telegram-bot/src/codex-session.ts`
- `super_turtle/claude-telegram-bot/src/config.ts`
- `super_turtle/claude-telegram-bot/src/session.ts`
- `super_turtle/claude-telegram-bot/src/subturtle-board-service.ts`
- `super_turtle/claude-telegram-bot/src/drivers/codex-driver.ts`
- `super_turtle/claude-telegram-bot/src/drivers/codex-driver.test.ts`
- `super_turtle/claude-telegram-bot/src/drivers/codex-pending-outputs.ts`
- `super_turtle/claude-telegram-bot/src/drivers/codex-pending-outputs.test.ts`
- `super_turtle/claude-telegram-bot/src/handlers/callback.ts`
- `super_turtle/claude-telegram-bot/src/handlers/callback.subturtle.test.ts`
- `super_turtle/claude-telegram-bot/src/handlers/callback.test.ts`
- `super_turtle/claude-telegram-bot/src/handlers/codex.flow.test.ts`
- `super_turtle/claude-telegram-bot/src/handlers/commands.ts`
- `super_turtle/claude-telegram-bot/src/handlers/commands.subturtle.test.ts`
- `super_turtle/claude-telegram-bot/src/handlers/stop.ts`
- `super_turtle/claude-telegram-bot/src/handlers/stop.test.ts`
- `super_turtle/claude-telegram-bot/src/handlers/streaming.ts`
- `super_turtle/claude-telegram-bot/src/handlers/streaming.test.ts`
- `super_turtle/claude-telegram-bot/src/handlers/text.ts`
- `super_turtle/claude-telegram-bot/src/handlers/text.progress.test.ts`
- `super_turtle/claude-telegram-bot/src/handlers/voice.typing.test.ts`
- `super_turtle/claude-telegram-bot/src/codex-session.conductor-inbox.test.ts`
- `super_turtle/claude-telegram-bot/src/session.ask-user.test.ts`

## Adjacent Commits Excluded For Now

- `4e4dad7b8aed90cb283020c58f56de811ab6216e` `Clean tracked subturtle state and add message kind helpers`: message-kind and streaming helper work, but not one of the primary runtime/control anchors.
- `4cf8d7ee88240f3800207ec2ddc4ef217bd3cd86` `fix tests`: broad suite cleanup without changing the in-scope implementation files.
- `be0256d9ffa16fec2aaa45610e623bb5dab5cfcc` `Implement retained Telegram progress message flow`: streaming-only change; revisit if later review shows lifecycle coupling.
- `da2b688d8dee1fc3da1cb2492f2fe5f4f56e14a9` `Align Telegram terminal progress and artifact delivery`: streaming-only change; revisit if later review shows lifecycle coupling.
- `501fcfea487d878f9a5c0a5a5636eefd972ce37b` `Refine Telegram streaming progress UI`: streaming-only change; revisit if later review shows lifecycle coupling.
- `1323d7a7081a2de6a980001c242e38c6b35a33bc` `Show only answer snapshots in progress history`: retained-history presentation change, not a control-plane change by itself.
