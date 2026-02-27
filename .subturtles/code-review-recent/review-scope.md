# Code Review Scope (Recent Changes)

## Scope Window

Focused review window based on latest relevant commits:

- `404a34b` Wire run-state events into ctl spawn and stop paths
- `252e1ab` Add run-state writer utility for JSONL and handoff updates
- `c0d7bac` Initialize long-run state files in subturtle ctl
- `37f3817` test(stop-intent): add stop-action coverage for global stop flow
- `9db5311` Wire stop intents to halt active runs and subturtles
- `1ed668c` Add robust stop-intent parsing for text and voice
- `68e26ed` Add regression coverage for update dedupe and spawn retry idempotency
- `dd5671d` Prevent duplicate spawn side effects on stalled retries
- `dd7ba1c` Add Telegram update dedupe middleware for messages and callbacks
- `e74db2f` docs: map OpenClaw reliability gaps to bot touchpoints
- `a32f4c5` docs: add OpenClaw reliability research and update gap state
- `b4bbb45` docs: summarize OpenClaw parity improvements and remaining gaps

## Primary Areas Touched

1. Telegram stop-intent and interruption control
- `super_turtle/claude-telegram-bot/src/handlers/stop.ts`
- `super_turtle/claude-telegram-bot/src/handlers/text.ts`
- `super_turtle/claude-telegram-bot/src/handlers/voice.ts`
- `super_turtle/claude-telegram-bot/src/utils.ts`

2. Telegram update dedupe and retry safety
- `super_turtle/claude-telegram-bot/src/update-dedupe.ts`
- `super_turtle/claude-telegram-bot/src/handlers/text.ts`
- `super_turtle/claude-telegram-bot/src/handlers/streaming.ts`
- `super_turtle/claude-telegram-bot/src/index.ts`

3. SubTurtle long-run tracking and handoff state
- `super_turtle/subturtle/ctl`
- `super_turtle/state/run_state_writer.py`
- `super_turtle/state/runs.jsonl`
- `super_turtle/state/handoff.md`

4. Regression coverage added alongside behavior changes
- `super_turtle/claude-telegram-bot/src/handlers/stop.test.ts`
- `super_turtle/claude-telegram-bot/src/utils.stop-intent.test.ts`
- `super_turtle/claude-telegram-bot/src/handlers/text.retry.test.ts`
- `super_turtle/claude-telegram-bot/src/update-dedupe.test.ts`

## Next Review Priority

- Validate stop-intent behavior consistency between text, voice, and `/stop` paths.
- Validate dedupe key design and TTL behavior for false positives/negatives.
- Validate spawn/retry logic avoids duplicate side effects after partial tool execution.
- Validate run-state writer and handoff refresh paths for failure handling and data integrity.
