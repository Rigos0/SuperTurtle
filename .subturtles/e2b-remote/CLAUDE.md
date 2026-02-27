## Current task
Implement cron pause/resume policy helper in `super_turtle/e2b/reconcile-cron.sh` against `super_turtle/claude-telegram-bot/cron-jobs.json` (documented behavior for missed windows).

## End goal with specs
From this repo, a user can provision or resume an E2B sandbox, sync project code, start Super Turtle remotely, and manage lifecycle (`status`, `pause`, `resume`, `stop`) via scripts in `super_turtle/e2b/`.

Acceptance criteria:
- New command path exists and is documented:
  - `bash super_turtle/e2b/remote.sh up`
  - `bash super_turtle/e2b/remote.sh status`
  - `bash super_turtle/e2b/remote.sh pause`
  - `bash super_turtle/e2b/remote.sh resume`
  - `bash super_turtle/e2b/remote.sh stop`
- `up` creates or reuses persistent sandbox, syncs repo, installs deps, and starts bot/run-loop remotely.
- Sandbox metadata persists locally in `super_turtle/e2b/.state.json` (sandbox id, template, created/resumed timestamps).
- Cron behavior under pause is explicitly handled/documented (no silent data loss):
  - define what happens to overdue one-shot/recurring jobs
  - provide at least one implemented reconciliation behavior or explicit safe policy + helper command.
- Codex and Claude entrypoint compatibility is documented for E2B templates.
- Smoke test instructions are included and executable.

## Roadmap (Completed)
- Prior local-only SubTurtle infrastructure is stable.

## Roadmap (Upcoming)
- Research and design E2B remote architecture for this repo
- Implement remote control scripts and state handling
- Add docs and smoke test path

## Backlog
- [x] Research current E2B capabilities and official APIs for persistent sandboxes + pause/resume + templates (Codex/Claude); summarize in `docs/e2b-remote-runbook.md` with concrete links
- [x] Create `super_turtle/e2b/remote.sh` command router (`up|status|pause|resume|stop|sync|reconcile-cron`) with strict error handling
- [x] Implement sandbox state manager in `super_turtle/e2b/state.sh` (read/write `super_turtle/e2b/.state.json`, validation, stale-state recovery)
- [x] Implement `up` flow in `super_turtle/e2b/up.sh`: create/resume sandbox, copy repo, install deps, start remote bot process, persist metadata
- [x] Implement lifecycle commands in `super_turtle/e2b/lifecycle.sh`: status/pause/resume/stop using E2B APIs/CLI
- [ ] Implement cron pause/resume policy helper in `super_turtle/e2b/reconcile-cron.sh` against `super_turtle/claude-telegram-bot/cron-jobs.json` (documented behavior for missed windows) <- current
- [ ] Wire docs updates in `README.md` and `docs/e2b-remote-runbook.md` with exact setup env vars (`E2B_API_KEY`, template info, expected caveats)
- [ ] Run smoke tests (at least script-level and one end-to-end dry run path), then commit in focused steps

## Notes
- Prioritize existing code reuse; avoid rewriting existing SubTurtle control unless needed.
- Keep changes backward-compatible for local-only users.
- If E2B credentials are missing, implement commands so they fail fast with actionable messages and still allow static validation/tests.
- For spawn/restart safety, avoid duplicate remote process start; check remote state before creating new long-running processes.
