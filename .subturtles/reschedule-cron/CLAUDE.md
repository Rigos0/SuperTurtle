# Current Task
Commit the `reschedule-cron` implementation changes in `super_turtle/subturtle/ctl` with a descriptive message.

# End Goal with Specs
A new `ctl reschedule-cron <name> <interval>` command that:
1. Reads the SubTurtle's `CRON_JOB_ID` from `.subturtles/<name>/subturtle.meta`
2. Finds that job in `super_turtle/claude-telegram-bot/cron-jobs.json`
3. Updates its `interval_ms` to the new value (parsed from human duration like `1m`, `5m`, `10m`)
4. Updates `fire_at` to `now + new_interval_ms`
5. Writes back to cron-jobs.json

Acceptance criteria:
- `./super_turtle/subturtle/ctl reschedule-cron myturtle 1m` works
- Usage shows in `ctl` help text
- Error handling: missing name, invalid interval, no cron job found

# Backlog
- [x] Read existing `ctl` script at `super_turtle/subturtle/ctl`
- [x] Add `reschedule-cron` to the `usage()` function help text
- [x] Implement `do_reschedule_cron()` function using embedded Python (same pattern as `register_spawn_cron_job`)
- [x] Add `reschedule-cron` case to the main `case "$CMD"` dispatch at bottom of script
- [ ] Commit with descriptive message <- current
