## Current Task
All backlog items complete.

## End Goal with Specs
- Driver abstraction is always enabled (no env toggle needed).
- Codex sessions prepend a current date/time line on first message, same format as Claude.
- Existing commands and routing continue working without regressions.

## Backlog
- [x] Remove DRIVER_ABSTRACTION_V1 toggle and always route via drivers
- [x] Inject date/time prefix into first Codex message (only when new thread)
- [x] Verify /stop behavior still works and no legacy code path is used
- [x] Commit changes

## Notes
Files:
- super_turtle/claude-telegram-bot/src/config.ts
- super_turtle/claude-telegram-bot/src/handlers/text.ts
- super_turtle/claude-telegram-bot/src/handlers/driver-routing.ts
- super_turtle/claude-telegram-bot/src/codex-session.ts
- super_turtle/claude-telegram-bot/src/drivers/* (if needed)

Behavior reference:
- Claude injects date/time at session start in session.sendMessageStreaming()
- Codex should prepend identical date/time line for the first message of a new thread

Acceptance:
- No code path depends on DRIVER_ABSTRACTION_V1
- Codex first message includes the date/time prefix

## Loop Control
STOP
