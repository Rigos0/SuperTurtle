## Current task
Validate full `up` flow on real E2B (create/reuse -> sync -> install -> start), persist state, and patch regressions. Current blocker: non-interactive `sandbox connect` still fails in CLI 2.4.2 (`setRawMode`) after successful API-based create.

## End goal with specs
`bash super_turtle/e2b/remote.sh up` works reliably in non-interactive automation, and official E2B docs used by this integration are mirrored under `docs/external/e2b/` with an index + refresh script.

Acceptance criteria:
- `remote.sh up` no longer depends on interactive terminal behavior that destroys/loses sandbox state.
- Sandbox creation path is non-interactive and script-safe (no `setRawMode` crash class, no create-then-vanish behavior).
- Existing commands still work: `status`, `pause`, `resume`, `stop`, `sync`, `reconcile-cron`.
- Local docs mirror exists at `docs/external/e2b/` with:
  - `index.md` listing mirrored sources + snapshot date
  - one file per key source used by implementation/runbook
  - `refresh.sh` (or equivalent) to refresh mirrors.
- `docs/e2b-remote-runbook.md` references local mirror paths for agent use.
- Smoke coverage updated for any behavior changes.

## Roadmap (Completed)
- E2B command router, state manager, lifecycle, cron reconciliation, and initial runbook shipped.

## Roadmap (Upcoming)
- Fix non-interactive E2B create/reuse reliability
- Add local docs mirror workflow
- Re-run end-to-end bring-up validation

## Backlog
- [x] Reproduce current `remote.sh up` failure path and document exact root cause in `docs/e2b-up-known-issues.md`
- [x] Implement a stable non-interactive sandbox creation/reuse path in `super_turtle/e2b/up.sh` (avoid interactive `sandbox create` dependency)
- [ ] Validate full `up` flow on real E2B (create/reuse -> sync -> install -> start), persist state, and patch regressions <- current (progress: non-interactive create now succeeds via API curl path; connect/probe still blocks full flow)
- [ ] Add local E2B docs mirror under `docs/external/e2b/` with `index.md` + snapshots of official pages referenced in runbook
- [ ] Add `docs/external/e2b/refresh.sh` (or equivalent) so mirror can be updated reproducibly
- [ ] Update `docs/e2b-remote-runbook.md` and `README.md` to point agents to local mirror first, web as fallback
- [ ] Run smoke tests (`super_turtle/e2b/tests/*`) and any targeted tests changed by the fix
- [ ] Commit in focused steps and keep `.subturtles/e2b-remote-fix/CLAUDE.md` accurate after each step

## Notes
- Keep scope focused on reliability + docs mirror.
- Prioritize primary/official E2B sources when mirroring.
- Preserve backwards compatibility for existing scripts and env vars.
- 2026-02-27 progress: real `remote.sh up` no longer fails on Python SSL during create; sandbox ID extraction now handles `sandboxID`. Remaining failure is non-interactive `sandbox connect` (CLI raw-mode behavior) during connect probe/sync.
