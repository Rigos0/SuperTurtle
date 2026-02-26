## Current Task
Document manual verification notes in CLAUDE.md and add `## Loop Control\nSTOP` when done.

## End Goal with Specs
- Inline buttons (ask_user prompts, /status, /cron, /resume, model/effort selectors) remain visible on iOS Telegram until tapped.
- No deletion/overwrite of button messages by streaming/thinking updates.
- Codex and Claude driver flows behave the same.
- Add or update tests if feasible.

## Backlog
- [x] Read inline button handling in `super_turtle/claude-telegram-bot/src/handlers/streaming.ts`, `src/handlers/callback.ts`, `src/session.ts`, `src/handlers/driver-routing.ts`, `src/handlers/text.ts`, and inline keyboards in `src/handlers/commands.ts`.
- [x] Identify any message edit/delete/cleanup that could remove inline keyboards (esp. thinking block cleanup / streaming edits) and reproduce via logs if needed.
- [x] Fix root cause so iOS clients keep buttons visible (ensure edits preserve `reply_markup`, avoid delete/edit of button messages, or segregate button messages from streaming updates).
- [x] Add/adjust tests (likely `src/handlers/codex.flow.test.ts` or unit tests) to guard button persistence behavior.
- [ ] Document manual verification notes in CLAUDE.md and add `## Loop Control\nSTOP` when done. <- current

## Notes
User report: iOS Telegram buttons disappear similarly to thinking blocks. Focus on any cleanup that edits/deletes messages without preserving `reply_markup`.

Progress (this commit):
- Found a cleanup gap in `src/handlers/media-group.ts`: `handleProcessingError()` deleted all `toolMessages` unconditionally.
- Patched cleanup to skip inline-keyboard messages via `isAskUserPromptMessage(...)`, matching other handler cleanup paths.
- Added regression test `src/handlers/media-group.test.ts` to verify inline-keyboard messages are preserved while non-keyboard tool messages are still deleted.
- Verified with `bun test src/handlers/media-group.test.ts src/handlers/text.silent.test.ts` (pass).

## Files
super_turtle/claude-telegram-bot/src/handlers/streaming.ts
super_turtle/claude-telegram-bot/src/handlers/callback.ts
super_turtle/claude-telegram-bot/src/session.ts
super_turtle/claude-telegram-bot/src/handlers/driver-routing.ts
super_turtle/claude-telegram-bot/src/handlers/text.ts
super_turtle/claude-telegram-bot/src/handlers/commands.ts
