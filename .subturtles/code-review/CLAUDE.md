# Current task
Audit restart/recovery flow for state reconstruction correctness after bot restarts, using the mapped conductor checklist and source references.

# End goal with specs
Deliver a review artifact that identifies real bugs/regressions or confirms no blocking issues in the restart/recovery/stale-cleanup flow. The review must include severity-ranked findings, exact file/line references, and reproducible reasoning for each finding. If no defects are found, explicitly state that and list residual risks and test gaps.

# Roadmap (Completed)
- Scoped review target to conductor restart/recovery and stale cleanup behavior
- Confirmed expected review output format and severity ordering

# Roadmap (Upcoming)
- Inspect conductor supervisor and wakeup reconciliation paths for restart safety
- Inspect cron cleanup paths for stale job and stale worker handling
- Inspect delivery/inbox behavior for mid-chat completion delivery edge cases
- Validate existing tests for multi-worker orchestration and restart coverage
- Write findings report under docs/reviews with references and recommended fixes

# Backlog
- [x] Build a review checklist and map relevant source files for restart/recovery/stale-cleanup
- [ ] Audit restart/recovery flow for state reconstruction correctness after bot restarts <- current
- [ ] Audit stale cron cleanup and worker cleanup behavior for false positives/negatives
- [ ] Audit mid-chat completion/inbox delivery semantics for race conditions and dropped notifications
- [ ] Audit multi-worker orchestration paths for isolation/regression risks
- [ ] Produce a severity-ranked review report with file/line references in docs/reviews
