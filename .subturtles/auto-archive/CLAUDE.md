## Current Task
Commit the verified auto-archive implementation and finalize loop state.

## End Goal with Specs
- When `ctl stop <name>` completes successfully, it calls `do_archive` automatically (move workspace to `.subturtles/.archive/<name>/`).
- When the Python loop (`loop.py`) detects `## Loop Control\nSTOP` and exits, the SubTurtle workspace is archived.
- `/subturtle` command in the Telegram bot only ever shows running SubTurtles (no stale stopped entries).
- `ctl list` without `--archived` shows only running SubTurtles (already true if archive works).
- No regressions: `ctl spawn`, `ctl status`, `ctl logs` still work. Archived SubTurtles still visible via `ctl list --archived`.

## Backlog
- [x] In `ctl` `do_stop()` function: after successful stop + cron cleanup, call `do_archive "$name"` automatically
- [x] In `loop.py`: after the loop exits due to `_should_stop()` (Loop Control STOP), archive the workspace by calling `ctl archive <name>`
- [x] Verify `do_archive` is safe to call from `do_stop` (no circular deps, handles already-archived gracefully)
- [x] Test: `ctl spawn test-auto-archive --type yolo-codex --timeout 5m` → let it self-stop or `ctl stop` it → confirm workspace moved to `.archive/`
- [x] Commit <- current

## Notes
File: `super_turtle/subturtle/ctl` — `do_stop()` is around line 200-250, `do_archive()` is at line 771.
File: `super_turtle/subturtle/loop.py` — `_should_stop()` checks for Loop Control directive; main loop exits when true.
The archive dir is `.subturtles/.archive/<name>/`. `do_archive` already handles mkdir, rm existing, and mv.

## Loop Control
STOP
