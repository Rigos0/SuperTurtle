## Current Task
Backlog complete.

## End Goal with Specs
When a SubTurtle writes `## Loop Control\nSTOP` and the loop exits, the recurring cron job registered at spawn time must be removed — just like `ctl stop` does.

**Root cause:** `_archive_workspace()` in `__main__.py` calls `ctl archive` but not the cron removal logic. Only `ctl stop` (the `do_stop()` function in `ctl`) removes the cron job.

**Fix approach:** In `_archive_workspace()` (or right before it in the self-stop exit path), read the `subturtle.meta` file to get the `cron_job_id`, then call `ctl remove-spawn-cron <cron_job_id>` (or directly call the `remove_spawn_cron_job` shell function via `ctl`). Alternatively, add a new `ctl cleanup-cron <name>` subcommand that reads meta and removes the cron, then call that from Python before clearing the meta file.

**Key files:**
- `super_turtle/subturtle/__main__.py` — the self-stop exit path (lines ~370-402, `_archive_workspace()` function, and the post-loop code around lines 450-460, 490-500, 530-540, 570-580)
- `super_turtle/subturtle/ctl` — the `do_stop()` function (lines ~666-714) already does cron cleanup via `remove_spawn_cron_job`. Reuse this.

**Concrete steps:**
1. In `__main__.py`, before calling `_archive_workspace()`, read `subturtle.meta` to extract the `cron_job_id` field.
2. If found, call `ctl stop <name>` instead of `ctl archive <name>` — this handles cron removal, watchdog kill, AND archival all in one. The process PID file should be cleared first (already done) so `ctl stop` won't try to kill a non-existent process.
3. OR: add a dedicated cron-cleanup step: read meta → call a ctl subcommand to remove cron → then archive as before.

**Simplest fix:** Change `_archive_workspace()` to call `ctl stop <name>` instead of `ctl archive <name>`. Since the PID is already cleared, `ctl stop` will just do the cron removal + watchdog kill + archive steps without erroring on the missing process. Verify `do_stop()` handles a missing PID gracefully.

**Acceptance criteria:**
- After a SubTurtle self-stops, no recurring cron job remains in `cron-jobs.json` for that SubTurtle.
- Existing `ctl stop` behavior is unchanged.
- All existing tests still pass.

## Backlog
- [x] Read `_archive_workspace()` in `__main__.py` and `do_stop()` in `ctl` to confirm the fix approach
- [x] Implement fix: change self-stop cleanup to remove cron job (either call `ctl stop` instead of `ctl archive`, or add explicit cron removal before archive)
- [x] Verify `do_stop()` handles gracefully when PID file is already cleared
- [x] Test: spawn a SubTurtle, let it self-stop, confirm cron-jobs.json is clean afterward
- [x] Commit with clear message

## Loop Control
STOP
