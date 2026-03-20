# Current task
Rewrite `super_turtle/docs/TELEGRAM_PROGRESS_UX_SPEC.md` into a concrete implementation-ready spec.

# End goal with specs
Finish the spec files under `super_turtle/docs/` that are still in draft or need alignment for the current Telegram/runtime work.

Primary target:
- `super_turtle/docs/TELEGRAM_PROGRESS_UX_SPEC.md`

Related files to align only if needed:
- `super_turtle/docs/TELEGRAM_WEBHOOK_POC.md`
- `super_turtle/docs/REPO_BOUND_TELEPORT_SPEC.md`
- `super_turtle/docs/E2B_WEBHOOK_WAKE_POC.md`
- `super_turtle/docs/E2B_BETA_RUNTIME_DX.md`

Acceptance criteria:
- the primary UX spec reads like an implementation-ready spec, not a loose draft
- inconsistent terminology or contradictory requirements across the touched spec files are resolved
- touched docs keep concise Markdown structure and explicit status/decision language
- changes stay scoped to spec/docs work only
- all spec edits are committed in one focused commit

# Roadmap (Completed)
- Meta agent identified the main draft spec surface in `super_turtle/docs/`

# Roadmap (Upcoming)
- Audit the draft UX spec for unresolved decisions and missing acceptance criteria
- Cross-check adjacent spec docs for terminology or behavior conflicts
- Tighten the spec language and update any dependent docs that must match
- Re-read the touched docs for internal consistency
- Commit the finished spec updates in one focused commit

# Backlog
- [x] Read `super_turtle/docs/TELEGRAM_PROGRESS_UX_SPEC.md` closely and list the unresolved or draft-only sections
- [x] Cross-check `super_turtle/docs/TELEGRAM_WEBHOOK_POC.md` and `super_turtle/docs/REPO_BOUND_TELEPORT_SPEC.md` for terms or requirements that should match
- [ ] Rewrite `super_turtle/docs/TELEGRAM_PROGRESS_UX_SPEC.md` into a concrete implementation-ready spec <- current
- [ ] Update any other spec files only where the UX/runtime contract must stay aligned
- [ ] Re-read all touched docs and remove contradictions, vague wording, and stale status language
- [ ] Commit the doc/spec changes with a clear message
