# Current Task

Call `_write_completion_notification()` after the while loop breaks due to STOP directive (NOT on timeout/kill exits), using a `stopped_by_directive` flag in each loop. <- current

# End Goal with Specs

When a SubTurtle finishes and exits its loop, the user sees a message in Telegram within ~10 seconds like:

```
🎉 Finished: archive-gc
✓ Add do_archive() function
✓ Add do_gc() with --max-age
✓ Update do_list() for --archived flag
✓ Wire ctl dispatcher
```

**How it works:**

1. SubTurtle writes `## Loop Control\nSTOP` to its CLAUDE.md → loop detects it → breaks
2. After loop exit (NOT via atexit — just after the while loop breaks), call `_write_completion_notification()`
3. This function:
   - Reads the SubTurtle's own CLAUDE.md
   - Extracts all `[x]` checked items from the Backlog section
   - Builds a `🎉 Finished: <name>` message with completed items
   - Writes a one-shot cron job to `super_turtle/claude-telegram-bot/cron-jobs.json` with prefix `BOT_MESSAGE_ONLY:`
   - `fire_at` = now + 5 seconds, `type` = `one-shot`, no `silent` field needed
4. Bot's existing 10-second cron timer loop picks it up
5. Bot detects `BOT_MESSAGE_ONLY:` prefix → sends via `bot.api.sendMessage()` directly, skipping `handleText()` entirely
6. Message appears in Telegram. Zero Claude Code cost.

**Also:** When the meta agent's cron supervision fires and finds the SubTurtle already stopped + notification already sent, it should still clean up (stop cron job, update state) but NOT send a duplicate "finished" message. The completion notification covers that.

**Acceptance criteria:**
- SubTurtle self-stop triggers a notification in Telegram within ~15 seconds
- Message shows SubTurtle name and completed backlog items
- Zero Claude Code quota used for the notification
- Bot handles `BOT_MESSAGE_ONLY:` prefix gracefully (direct send, no session)
- If CLAUDE.md has no checked items, message still sends with just the name
- Normal (non-self-stop) SubTurtle exits (timeout, manual stop) do NOT trigger the notification

# Backlog

- [x] Read `super_turtle/subturtle/__main__.py` fully — understand the loop exit paths and where to hook
- [x] Add `_write_completion_notification(state_dir, name, project_dir)` function to `__main__.py`
  - Parse CLAUDE.md for `[x]` items in Backlog section
  - Build message: `🎉 Finished: <name>\n✓ item1\n✓ item2\n...`
  - Load cron-jobs.json, append one-shot job with `BOT_MESSAGE_ONLY:` prefix, write back
  - Generate unique 6-char hex ID (same pattern as `register_spawn_cron_job` in ctl)
- [ ] Call `_write_completion_notification()` after the while loop breaks due to STOP directive (NOT on timeout/kill exits) <- current
  - The `_should_stop()` function already prints a log line — use a flag variable like `stopped_by_directive = True`
  - Only call notification if `stopped_by_directive` is True
- [ ] Modify `super_turtle/claude-telegram-bot/src/index.ts` cron timer section (~line 228)
  - When processing a due job, check if `job.prompt.startsWith("BOT_MESSAGE_ONLY:")`
  - If yes: extract message text after prefix, call `bot.api.sendMessage(chatId, message)` directly
  - Skip `handleText()` and session creation entirely
  - Still remove the one-shot job as usual
- [ ] Test end-to-end: spawn a SubTurtle with a trivial task, let it self-stop, verify Telegram notification arrives
- [ ] Commit all changes

# Notes

**Files to modify:**
- `super_turtle/subturtle/__main__.py` — add notification writer, call it on self-stop
- `super_turtle/claude-telegram-bot/src/index.ts` — add BOT_MESSAGE_ONLY handler in cron timer

**Cron jobs file location:** `super_turtle/claude-telegram-bot/cron-jobs.json`

**Cron job format (from cron.ts):**
```json
{
  "id": "abc123",
  "prompt": "BOT_MESSAGE_ONLY:🎉 Finished: task-name\n✓ Item 1\n✓ Item 2",
  "type": "one-shot",
  "fire_at": 1234567890000,
  "interval_ms": null,
  "created_at": "2026-02-25T22:30:00Z"
}
```

**Important:** The cron-jobs.json path relative to project root is `super_turtle/claude-telegram-bot/cron-jobs.json`. The SubTurtle runs from the project root, so use `project_dir / "super_turtle/claude-telegram-bot/cron-jobs.json"`.

**Do NOT use atexit** — it's unreliable with SIGTERM. Instead, use a simple flag after the while loop:
```python
stopped_by_directive = False
while True:
    # ... iteration ...
    if _should_stop(...):
        stopped_by_directive = True
        break

if stopped_by_directive:
    _write_completion_notification(...)
```
