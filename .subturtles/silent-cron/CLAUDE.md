## Current Task
All backlog items complete.

## End Goal with Specs
All SubTurtle supervision cron jobs are silent by default. The cron prompt instructs the meta agent to only produce notification messages when there's actual news. META_SHARED.md documents the new silent behavior.

**What changes:**
1. `ctl spawn` generates cron jobs with `"silent": true` in cron-jobs.json
2. The cron prompt is redesigned — instead of "Check SubTurtle X and report", it says "Check SubTurtle X silently. Only respond if: completion, stuck, error, or milestone."
3. META_SHARED.md supervision section is rewritten for silent-first behavior

**Acceptance criteria:**
- `ctl spawn` adds `"silent": true` to cron job entries
- New cron prompt template instructs silent behavior
- META_SHARED.md documents: what triggers a message, what stays silent, notification formats
- Old non-silent cron jobs still work (backward compatible)

## Backlog
- [x] Read `super_turtle/subturtle/ctl` — find the `register_spawn_cron_job` function (around line 339-403) and understand cron job generation
- [x] Update `register_spawn_cron_job` in `ctl` — add `"silent": true` to the cron job JSON. Redesign the prompt template to instruct silent behavior with notification markers.
- [x] Read `super_turtle/meta/META_SHARED.md` — find the "Autonomous supervision" section (around line 145-190) and the cron scheduling section
- [x] Rewrite the supervision section in META_SHARED.md — document silent check-in behavior: what the meta agent does when woken by cron (check silently, only message on news), notification format (🎉🚀⚠️❌), when to escalate
- [x] Update the "Starting new work" section in META_SHARED.md to mention that spawned SubTurtles get silent cron by default
- [x] Commit all changes

## Notes
- **Key files:**
  - `super_turtle/subturtle/ctl` — cron job registration (~line 339-403)
  - `super_turtle/meta/META_SHARED.md` — meta agent behavior docs
- The new cron prompt should look something like:
  ```
  [SILENT CHECK-IN] Check SubTurtle <name>: run ctl status, inspect CLAUDE.md, review git log.
  Rules: Do NOT message the user unless one of these conditions is met:
  - 🎉 SubTurtle completed all backlog items → stop it and report what shipped
  - ⚠️ SubTurtle appears stuck (no commits in 2+ checks) → stop, diagnose, report
  - ❌ SubTurtle errored or crashed → report the error
  - 🚀 New milestone reached (significant backlog progress) → brief update
  If the SubTurtle is just progressing normally, respond with only: [SILENT]
  ```
- Backward compatibility: if `silent` field is missing from a cron job, treat it as non-silent (existing behavior)

## Loop Control
STOP
