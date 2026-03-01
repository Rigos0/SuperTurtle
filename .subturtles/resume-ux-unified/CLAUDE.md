# Current Task
- Backlog complete for `resume-ux-unified`; ready for handoff.

# Backlog
- [x] Inspect current `/resume` command and callback handling for `resume:` and `codex_resume:`.
- [x] Design compact button label format with clear Claude/Codex distinction.
- [x] Implement unified list assembly in `/resume` command.
- [x] Implement `resume_current` callback behavior.
- [x] Ensure empty-state UX is clear (no sessions vs only current session).
- [x] Run `bun run typecheck` in `super_turtle/claude-telegram-bot`.
- [x] Provide concise summary of changes and any follow-up suggestions.

# Summary
- `/resume` now shows a single unified picker containing both Claude (`resume:`) and Codex (`codex_resume:`) sessions, with `🔵/🟢` labels and compact `MM/DD HH:MM title` button text.
- The menu includes `resume_current` when a driver already has an active linked session, so users can continue immediately without re-selecting from history.
- Current sessions are filtered out of the picker, both driver lists are sorted newest-first, and each list is capped to 5 for cleaner Telegram UX.
- Empty states are explicit: `❌ No saved sessions.` when nothing exists, and a guidance message when only the current session exists.
- Callback routing now handles `resume_current`, `resume:*`, and `codex_resume:*` consistently, including preview replies from recent messages after resume.

# Follow-up Suggestions
- Add one integration test for mixed-driver ordering in the rendered keyboard to lock down cross-driver sort behavior.
- Consider adding a small "driver filter" toggle in `/resume` if users report long mixed lists even with the 5+5 cap.

## Loop Control
STOP
