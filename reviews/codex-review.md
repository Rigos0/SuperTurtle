# Codex Review

## TypeScript sweep: `super_turtle/claude-telegram-bot/src/`

1. High: archive extraction trusts attacker-controlled paths and symlinks
   - File: `super_turtle/claude-telegram-bot/src/handlers/document.ts:146-157`, `super_turtle/claude-telegram-bot/src/handlers/document.ts:189-210`
   - Issue: `unzip -d` / `tar -xf` extract entries without validating `..`, absolute paths, or symlink targets, and the follow-up reader opens whatever landed under the extracted tree. A crafted archive can escape the temp dir or trick the bot into reading arbitrary local files.
   - Fix: pre-list archive members and reject traversal/symlink entries before extraction, or switch to an extraction library that enforces containment.

2. High: document downloads collide on filename, so same-named uploads overwrite each other
   - File: `super_turtle/claude-telegram-bot/src/handlers/document.ts:75-87`, `super_turtle/claude-telegram-bot/src/handlers/document.ts:650-659`
   - Issue: downloaded documents are stored as `${TEMP_DIR}/${safeName}` with no unique suffix. Two uploads named `README.md` (especially inside one media group) will write the same temp path, so later processing can analyze the wrong file or duplicate the last upload.
   - Fix: generate unique temp filenames the same way the photo handler does, then clean them up after processing.

3. High: Claude/Codex preference and session persistence is fire-and-forget
   - File: `super_turtle/claude-telegram-bot/src/session.ts:232-235`, `super_turtle/claude-telegram-bot/src/session.ts:1132-1133`, `super_turtle/claude-telegram-bot/src/codex-session.ts:67-70`, `super_turtle/claude-telegram-bot/src/codex-session.ts:1670-1671`
   - Issue: these helpers call `Bun.write(...)` without `await`, inside synchronous `try/catch` blocks. Write failures become unhandled promise rejections, and callers assume the data is already on disk when a restart or resume can still race the pending write.
   - Fix: use synchronous writes for these state files or make the helpers async and await every persistence call.

4. Medium: temp files for non-audio media are never reclaimed
   - File: `super_turtle/claude-telegram-bot/src/handlers/document.ts:69-89`, `super_turtle/claude-telegram-bot/src/handlers/document.ts:417-447`, `super_turtle/claude-telegram-bot/src/handlers/document.ts:558-659`, `super_turtle/claude-telegram-bot/src/handlers/photo.ts:42-56`, `super_turtle/claude-telegram-bot/src/handlers/photo.ts:102-129`, `super_turtle/claude-telegram-bot/src/handlers/video.ts:32-52`, `super_turtle/claude-telegram-bot/src/handlers/video.ts:132-214`
   - Issue: photo, document, and video handlers keep the downloaded temp artifacts forever; archive cleanup only happens on the success path. A long-running bot can steadily fill `/tmp` and eventually break future uploads or unrelated local processes.
   - Fix: add `finally` cleanup for each downloaded path and always remove extracted archive directories/files on both success and failure.

## SubTurtle sweep: `super_turtle/subturtle/`

1. High: `ctl status` deletes worker metadata on a read-only code path
   - File: `super_turtle/subturtle/ctl:1257-1300`
   - Issue: when a worker is stopped, `do_status()` unconditionally removes both `subturtle.pid` and `subturtle.meta`. A harmless status check can erase `RUN_ID`, `CRON_JOB_ID`, timeout, and watchdog metadata before `ctl stop`, reconciliation, or postmortem tooling runs, which makes later cleanup and diagnosis incomplete.
   - Fix: keep `status` read-only; at most remove a stale PID file, and only delete the meta file from explicit stop/archive/gc flows after cleanup is finished.

2. High: PID reuse can make `ctl` target the wrong process
   - File: `super_turtle/subturtle/ctl:539-549`, `super_turtle/subturtle/ctl:1223-1248`
   - Issue: liveness and stop decisions trust any PID found in `subturtle.pid` and only verify it with `kill -0`. If a worker crashes and the OS later reuses that PID, `status` reports the worker as running and `stop` sends `SIGTERM`/`SIGKILL` to an unrelated local process.
   - Fix: persist a stronger process identity alongside the PID (for example start time, session id, or command line) and verify it before treating the worker as alive or killable.

3. Medium: archiving a reused worker name destroys the previous archive
   - File: `super_turtle/subturtle/ctl:1316-1345`
   - Issue: `do_archive()` always `rm -rf`s `.subturtles/.archive/<name>` before moving the current workspace into place. Reusing a worker name therefore silently deletes the prior archived workspace, including logs and state that operators expect to keep for debugging/history.
   - Fix: archive into a run- or timestamp-specific directory, or refuse to overwrite an existing archive unless the operator explicitly asks for it.

4. Medium: cron mutations are unsynchronized read-modify-write updates on a shared file
   - File: `super_turtle/subturtle/ctl:879-952`, `super_turtle/subturtle/ctl:961-991`, `super_turtle/subturtle/ctl:1030-1063`
   - Issue: spawn, stop, and reschedule each load `.superturtle/cron-jobs.json`, mutate it in memory, and write the whole file back without locking. The same store is also updated by the bot runtime, so concurrent operations can lose jobs, resurrect deleted entries, or clobber interval changes.
   - Fix: funnel cron writes through one helper that takes an exclusive lock and commits updates atomically.

## Meta prompt sweep: `super_turtle/meta/`

1. High: orchestrator mode can schedule duplicate roadmap drivers on every successful cycle
   - File: `super_turtle/meta/ORCHESTRATOR_PROMPT.md:59-67`, `super_turtle/meta/META_SHARED.md:357-371`, `super_turtle/subturtle/ctl:865-953`
   - Issue: `ctl spawn --cron-mode orchestrator` already registers a recurring `subturtle_supervision` cron job with the full orchestrator prompt, but the prompt docs still instruct each wake-up to append a new one-shot follow-up job. If the agent follows that guidance, every healthy cycle adds another orchestrator runner and you end up with overlapping stop/spawn decisions against the same roadmap.
   - Fix: make orchestrator scheduling single-sourced by removing self-scheduling from the prompt, or switch the runtime to true one-shot orchestrator jobs instead of recurring registration.

2. High: orchestrator progress/stuck checks use repo-global git history instead of worker-local state
   - File: `super_turtle/meta/ORCHESTRATOR_PROMPT.md:13-17`, `super_turtle/meta/ORCHESTRATOR_PROMPT.md:34-38`
   - Issue: the prompt tells the orchestrator to run `git log --oneline -10` for each worker and treat an unchanged log as evidence that that worker is stuck. All SubTurtles share one repo history, so commits from any worker mutate that signal for every worker and can hide a genuinely stalled SubTurtle or make progress attribution incorrect.
   - Fix: base progressing/stuck decisions on per-worker conductor data such as checkpoint signatures, completed backlog counts, and latest worker events.

3. Medium: meta prompts still tell agents to hand-edit the shared cron JSON
   - File: `super_turtle/meta/META_SHARED.md:47-53`, `super_turtle/meta/META_SHARED.md:119`, `super_turtle/meta/META_SHARED.md:487-503`, `super_turtle/meta/ORCHESTRATOR_PROMPT.md:59-65`, `super_turtle/claude-telegram-bot/src/session.ts:72-94`, `super_turtle/claude-telegram-bot/src/cron.ts:150-199`
   - Issue: the shared prompt says direct edits to `.superturtle/cron-jobs.json` are allowed, later says not to edit it during spawn, and its scheduling sections still describe manual JSON append/remove flows. That bypasses the available `CronCreate`/`CronDelete`/`CronList` tool surface and adds more unsynchronized writers to the same file the bot and `ctl` already mutate.
   - Fix: remove manual cron-file editing instructions from the prompts, route scheduling through the cron tools or one helper path, and reserve raw JSON edits for recovery/debug-only cases.
