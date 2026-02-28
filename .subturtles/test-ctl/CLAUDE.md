# Current Task
Write stop tests: kills process, cleans cron, archives, handles dead process.

## End Goal with Specs
A single test script that exercises every `ctl` command with fake CLI binaries. Tests run in ~30 seconds, no real Claude/Codex calls, fully deterministic.

**File to create:** `super_turtle/subturtle/tests/test_ctl_integration.sh`

**Test framework:** Bash with simple pass/fail assertions. Follow the pattern from existing `smoke_spawn_status.sh`.

**Fake CLI setup:**
- Create temp dir with fake `claude` and `codex` scripts
- Fake `claude`: `#!/bin/bash; sleep 3600` (hangs to simulate running)
- Fake `codex`: `#!/bin/bash; sleep 3600` (hangs to simulate running)
- Prepend fake dir to PATH so ctl finds them

**Cron-jobs.json safety:**
- Before tests: backup `super_turtle/claude-telegram-bot/cron-jobs.json`
- After tests (cleanup trap): restore backup
- This prevents test cron entries from leaking into the real bot

**Test naming:** Each test is a bash function `test_<name>()`. A runner calls each one and reports pass/fail.

**Tests to write:**

1. `test_spawn_creates_workspace` — spawn creates CLAUDE.md, AGENTS.md symlink, PID file, meta file, cron entry
2. `test_spawn_stdin_state` — pipe state via `echo | ctl spawn --state-file -`, verify CLAUDE.md content
3. `test_spawn_file_state` — pass state via `--state-file /tmp/file.md`, verify content matches
4. `test_status_running` — spawn, then status shows "running as", PID, time left
5. `test_status_stopped` — spawn, stop, then status shows "not running"
6. `test_stop_kills_process` — spawn, note PID, stop, verify PID dead
7. `test_stop_cleans_cron` — spawn (creates cron entry), stop, verify cron entry removed from JSON
8. `test_stop_archives_workspace` — spawn, stop, verify workspace moved to .archive/
9. `test_stop_already_dead` — spawn, manually kill PID, then stop — should exit 0 gracefully
10. `test_list_shows_subturtles` — spawn 2, list shows both names and "running"
11. `test_list_shows_tunnel_url` — spawn, write .tunnel-url file, list shows URL
12. `test_watchdog_timeout` — spawn with --timeout 5s using a fake binary that sleeps forever, wait 10s, verify PID dead and log has "TIMEOUT"
13. `test_gc_archives_old` — create a stopped workspace (no PID), touch with old timestamp, run gc --max-age 1s, verify archived
14. `test_reschedule_cron` — spawn, reschedule-cron to 15m, verify cron-jobs.json interval_ms is 900000
15. `test_spawn_validates_cli` — remove fake codex from PATH, try spawn --type yolo-codex, verify exit non-zero
16. `test_spawn_with_skills` — spawn with --skill frontend --skill testing, verify meta has SKILLS

**Cleanup:**
- Each test uses unique SubTurtle names with timestamp suffix: `test-<name>-$(date +%s)`
- Global cleanup trap: stop all test SubTurtles, restore cron-jobs.json, remove temp dirs
- Individual test cleanup on failure: stop the SubTurtle

**Important paths:**
- CTL script: `super_turtle/subturtle/ctl`
- Cron jobs: `super_turtle/claude-telegram-bot/cron-jobs.json`
- Workspaces: `.subturtles/<name>/`
- Archive: `.subturtles/.archive/<name>/`

## Backlog
- [x] Read smoke_spawn_status.sh to match existing test patterns
- [x] Write test harness: setup (fake bins, backup cron), teardown (cleanup), assert helpers
- [x] Write spawn tests: workspace creation, stdin state, file state, skills
- [x] Write status tests: running output, stopped output
- [ ] Write stop tests: kills process, cleans cron, archives, handles dead process <- current
- [ ] Write list tests: shows subturtles, shows tunnel URL
- [ ] Write watchdog timeout test (5s timeout)
- [ ] Write gc and reschedule-cron tests
- [ ] Write CLI validation test (missing codex binary)
- [ ] Run all tests, fix any failures
- [ ] Commit
