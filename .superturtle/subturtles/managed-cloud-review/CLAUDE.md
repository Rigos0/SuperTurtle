# Current task
Review onboarding, repair, and public-surface logic for behavioural regressions.

# End goal with specs
- Review the hosted managed-cloud implementation in `../superturtle-web`, especially the recent commits `e50a020`, `1e9a345`, `fa2bffc`, `5954bce`, `8845d93`, `a92b92f`, and `8ba07c2`.
- Prioritize correctness bugs, behavioural regressions, security risks, operational risks, and missing tests over style or cleanup suggestions.
- Inspect the highest-risk code first: `src/features/cloud/controllers/managed-control-plane.ts`, `managed-onboarding.ts`, `managed-runtime.ts`, `managed-runtime-manifest.ts`, `managed-telegram-ownership.ts`, `managed-telegram-repair.ts`, `managed-public-surface.ts`, and related tests/routes.
- Write a review note under `super_turtle/docs/reviews/` in this repo summarizing findings with file references and severity, or explicitly state that no material findings were found.
- Do not modify hosted product code unless a review artifact requires it; this worker is for review, not implementation.

# Roadmap (Completed)
- Managed-cloud product/runtime spec written and committed in `../superturtle-web`.
- Hosted managed-cloud implementation landed across the recent commit stack under review.
- Review target narrowed to the hosted managed-cloud control-plane slice.

# Roadmap (Upcoming)
- Read the recent hosted commit range and map the highest-risk files first.
- Review lifecycle, ownership, onboarding, repair, and public-surface changes for regressions or gaps.
- Check whether tests cover the critical behaviours the new control plane now depends on.
- Write the final review note with prioritized findings or an explicit no-findings conclusion.

# Backlog
- [x] Read the recent hosted commit range and map the highest-risk files first
- [x] Review lifecycle, ownership, and status changes for correctness and security risks
- [ ] Review onboarding, repair, and public-surface logic for behavioural regressions <- current
- [ ] Review the new and changed tests for coverage gaps
- [ ] Write `super_turtle/docs/reviews/review-managed-cloud-hosted-implementation-2026-03-17.md` with prioritized findings or a no-findings conclusion
- [ ] Stop after committing the review result and updating this state file
