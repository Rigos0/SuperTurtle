## Current Task
Add/adjust test or logging to prevent regressions.

## End Goal with Specs
- A scheduled turtle job produces exactly one sticker and one "you’re doing great" message.
- The bot always sends the "🔔 Scheduled:" notice before the turtle message.
- Manual user messages that look like scheduled prompts don’t cause duplicates.

## Backlog
- [x] Reproduce/trace how scheduled prompts are injected and executed
- [x] Implement guard so cron runs do not double-trigger when prompt already contains scheduled notice
- [x] Ensure only one turtle sticker is sent per job (no extra manual echo)
- [ ] Add/adjust test or logging to prevent regressions <- current
- [ ] Commit changes

## Notes
Files likely involved:
- super_turtle/claude-telegram-bot/src/index.ts (cron loop prompt injection)
- super_turtle/claude-telegram-bot/src/handlers/streaming.ts (send-turtle dispatch)
- super_turtle/claude-telegram-bot/src/handlers/text.ts (general message path)

Behavior to preserve:
- Non-silent cron should auto-inject "🔔 Scheduled:" unless the prompt already contains it.
- Scheduled notice should appear before actual content.
