## Current Task
Add/extend tests for stop intent parsing and stop action.

## End Goal with Specs
User messages containing stop intents trigger a global stop of running SubTurtles, regardless of command prefix. Voice-transcribed variants should be tolerated. Behavior is consistent across text and command handlers. Tests cover the stop intent parsing.

## Backlog
- [x] Identify entry points for Telegram updates (commands, text, callbacks) in `super_turtle/claude-telegram-bot/src`
- [x] Implement stop-intent parser (normalize text, match `stop`, `pause`, `abort`, `!`, `!stop` and common voice variants)
- [x] Wire stop intent to a handler that stops all running SubTurtles (via `ctl stop` or existing stop flow)
- [ ] Add/extend tests for stop intent parsing and stop action <- current
- [ ] Update docs if needed, update state, stop

## Notes
Likely files: `src/index.ts`, `src/handlers/commands.ts`, `src/handlers/text.ts`, `src/handlers/callback.ts`, tests in `src/handlers/*.test.ts`. Use existing ctl stop helper if present.

Entry points identified:
- `src/index.ts` is the ingress router: `bot.command(...)` command registrations, `bot.on("message:text", handleText)`, `bot.on("message:voice", handleVoice)`, `bot.on("message:audio", handleAudio)`, `bot.on("message:document", handleDocument)`, and `bot.on("callback_query:data", handleCallback)`.
- `src/index.ts` sequentialization middleware already special-cases `!` and messages starting with `stop` to bypass queueing.
- `src/handlers/text.ts` intercepts bare stop intent early via `isStopIntent(message)` and calls `getCurrentDriver().stop()` (currently swallows text without user-facing confirmation).
- `src/handlers/voice.ts` checks transcribed text with `isStopIntent(transcript)` and stops the active driver via `stopActiveDriverQuery()`.
- `src/handlers/callback.ts` has two stop-related flows: global query interruption for ask-user callbacks via `stopActiveDriverQuery()`, and SubTurtle-specific stop via callback data `subturtle_stop:{name}` which executes `ctl stop <name>`.
- There is currently no explicit `/stop` command registration in `src/index.ts`; `/stop` is only referenced in help/error text.
