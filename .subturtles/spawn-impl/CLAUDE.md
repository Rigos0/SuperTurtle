# Current Task

Backlog complete. Waiting for next task.

# End Goal with Specs

Implement the spawn UX design from `.subturtles/spawn-ux/SPAWN-UX-DESIGN.md`. Two main changes:

## 1. New `ctl spawn` subcommand

File: `super_turtle/subturtle/ctl` (bash script, ~530 lines)

Add a `do_spawn()` function and wire it into the case statement at bottom. `spawn` is a wrapper around `start` that also handles workspace setup, state writing, and cron registration atomically.

**CLI interface:**
```
./super_turtle/subturtle/ctl spawn <name> --type <type> [--timeout DURATION] [--state-file PATH] [--cron-interval DURATION] [--skill NAME ...]
```

**Behavior (in order):**
1. Read CLAUDE.md content from `--state-file <path>` (use `-` for stdin). If no flag but stdin is piped (`! -t 0`), read stdin. If no state source, fail with error.
2. Create workspace dir: `mkdir -p .subturtles/<name>/`
3. Write state content to `.subturtles/<name>/CLAUDE.md`
4. Create symlink: `ln -sf CLAUDE.md .subturtles/<name>/AGENTS.md`
5. Call the existing `do_start` logic internally (reuse, don't duplicate)
6. Register cron job in `super_turtle/claude-telegram-bot/cron-jobs.json` (see below)
7. Store `CRON_JOB_ID` in `subturtle.meta` for cleanup
8. Print summary: name, type, timeout, cron interval, cron job ID

**If start fails:** Don't write cron. Exit with error.
**If cron write fails after start:** Stop the just-started SubTurtle, exit with error.

**Defaults:**
- `--type`: `slow`
- `--timeout`: `1h`
- `--cron-interval`: `5m`

## 2. Cron auto-registration in `do_spawn()`

Use Python for JSON manipulation (already used in the script for other things). The cron job format:

```json
{
  "id": "<6 hex chars>",
  "prompt": "Check SubTurtle <name>: run `./super_turtle/subturtle/ctl status <name>`, inspect `.subturtles/<name>/CLAUDE.md`, and review `git log --oneline -10`. If backlog is complete, stop SubTurtle <name> and report shipped work. If stuck/off-track, stop it, diagnose, and restart with corrected state. If progressing, let it run.",
  "type": "recurring",
  "fire_at": <now_epoch_ms + interval_ms>,
  "interval_ms": <interval in ms>,
  "created_at": "<ISO timestamp>"
}
```

Cron jobs file path: `super_turtle/claude-telegram-bot/cron-jobs.json` (relative to PROJECT_DIR).

After writing cron, append to `subturtle.meta`:
```
CRON_JOB_ID=<id>
CRON_INTERVAL_MS=<interval_ms>
CRON_JOBS_FILE=super_turtle/claude-telegram-bot/cron-jobs.json
```

## 3. Cron cleanup in `do_stop()`

Extend the existing `do_stop()` function:
1. Before killing the process, read `CRON_JOB_ID` from `subturtle.meta`
2. If found, remove that job from `cron-jobs.json` using Python JSON manipulation
3. Print `[subturtle:<name>] cron job <id> removed` on success
4. If cron removal fails, print warning but continue with stop (process stop is higher priority)
5. Existing stop logic continues unchanged after cron cleanup

## 4. Update usage() help text

Add `spawn` to the usage help at the top of the script, showing its flags and description.

## 5. Update META_SHARED.md

File: `super_turtle/meta/META_SHARED.md`

Update the "Starting new work" section to use the new `ctl spawn` flow:
1. Replace the 6-step manual process with the streamlined version
2. Add note about type selection via `ask_user` buttons
3. Add note that cron is automatic via `ctl spawn`
4. Keep the "Writing CLAUDE.md for Different Loop Types" section unchanged
5. Update "Autonomous supervision" to note cron is auto-registered by `ctl spawn`
6. Update `do_stop` documentation to mention cron cleanup

# Backlog

- [x] Add `do_spawn()` function to `ctl` with state input (stdin/file), workspace setup, and start delegation
- [x] Add cron auto-registration in `do_spawn()` using Python JSON manipulation
- [x] Store CRON_JOB_ID in subturtle.meta after successful cron write
- [x] Extend `do_stop()` with cron cleanup (read CRON_JOB_ID from meta, remove from cron-jobs.json)
- [x] Update usage() help text with spawn subcommand
- [x] Wire `spawn` into the case statement at bottom of ctl
- [x] Update META_SHARED.md with new spawn flow and auto-cron docs
- [x] Test: run `./super_turtle/subturtle/ctl spawn test-spawn --type yolo --timeout 5m --state-file -` with echo piped in, verify workspace + cron created, then stop and verify cron cleaned up
- [x] Commit all changes
