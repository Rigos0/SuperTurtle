# Current task
All quick-win shell script bug fixes are complete. Append loop control and stop.

# End goal with specs
Fix 4 straightforward issues in bash scripts. Each fix = one commit.

# Roadmap (Completed)
- Nothing yet

# Roadmap (Upcoming)
- Quick-win shell script bug fixes from code review

# Backlog
- [x] Fix #16: ctl line 1069 — change `$CRON_JOBS_FILE_REL` to `$CRON_JOBS_FILE`. The variable `CRON_JOBS_FILE_REL` is never defined and crashes under `set -u`.
- [x] Fix #18: browser-screenshot.sh lines 108-111 — the legacy flags `--app`, `--mode`, `--capture-focus` use `shift 2` but they're boolean flags. Change to `shift 1` so they don't eat the next argument.
- [x] Fix #11: start-tunnel.sh lines 177-187 — remove the two dead subshell blocks that try to `wait` on parent's children (can't work from a subshell). Remove DEV_WAIT_PID and TUNNEL_WAIT_PID variables. The `kill -0` polling loop on line 190 already handles monitoring.
- [x] Fix #15: __main__.py (all loop variants) — add a MAX_CONSECUTIVE_FAILURES = 5 counter. When an agent CLI call raises CalledProcessError or OSError, increment the counter. Reset to 0 on any successful iteration. After 5 consecutive failures, log a fatal error, call `_record_failure_pending(name, run_id, "max consecutive failures reached")` if that helper exists (or write a `## Loop Control` + `STOP` directive), and break out of the loop.
- [x] Fix Codex#1 (ctl status): In `do_status()`, stop it from deleting `subturtle.pid` and `subturtle.meta` when a worker is stopped. Status should be read-only. Only remove a stale PID file (where the process no longer exists), never delete the meta file. The meta file should only be cleaned up by `do_stop` or `do_archive`.

## Loop Control
STOP
