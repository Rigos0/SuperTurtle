# Current task
Ship a manually testable local -> cloud managed teleport prototype on E2B. Optimize for one happy path the human can run soon, not for production completeness. Do not spend time on template publishing, billing, admin tooling, generalized transport cleanup, or full cloud -> local return unless a real prototype test is blocked without it. The prototype path can now consume a checked-in managed target JSON file for a real sandbox, and the sandbox now receives the linked hosted cloud session during live cutover, so the next work should stay focused on validating the destination ownership handoff and tightening the human test recipe.

# End goal with specs
- `/teleport` from Telegram can move the live bot from local -> an E2B managed sandbox in one happy-path prototype flow
- The prototype may assume one fixed template ID or an already-created or resumable managed sandbox if that keeps the first real test simple
- The same Telegram bot identity is preserved through the semantic handoff bundle model
- Existing local Claude/Codex auth is reused to seed the managed sandbox when available
- Use the minimum destination health verification needed before ownership transfer
- If rollback is already cheap, keep it; otherwise prefer a visible failure over more framework work
- The repo ends with a short operator test recipe, exact prerequisites, and explicit blockers
- Production hardening is out of scope for this pass unless it directly blocks the first live prototype

# Roadmap (Completed)
- Hosted browser login and CLI account linking are working against the live control plane
- Linked local startup ownership enforcement exists with lease claim, heartbeat, release, and conflict refusal
- `/teleport` preflight confirm/cancel, idle-only rejection, and richer status reporting exist
- The current implementation already has E2B helper commands, archive sync, auth bootstrap, sandbox runtime bootstrap, and basic rollback pieces
- Local tests already cover the E2B helper path, managed teleport bootstrap path, and tmux-style lease release path

# Roadmap (Upcoming)
- Make one happy-path local -> cloud E2B prototype runnable end to end against live infrastructure
- Keep only the minimum health checks and failure handling needed for a credible first test
- Validate that hosted cloud-status, teleport-target, machine-register, and machine-heartbeat are good enough for the prototype
- Leave a short operator test recipe plus exact prerequisites and blockers
- Defer broader productionization until after the first live prototype succeeds

# Backlog
- [x] Inventory the existing managed teleport, cloud control-plane, and E2B helper pieces already in the repo
- [x] Add `/teleport` preflight confirm/cancel, idle-only checks, and better status reporting
- [x] Build the E2B helper path for archive sync, script execution, auth seeding, and sandbox bootstrap support
- [ ] Make one happy-path local -> cloud prototype runnable end to end with an existing or resumable E2B sandbox and fixed template assumptions where needed <- current
  - Progress: `teleport-manual.sh --managed` now accepts `SUPERTURTLE_TELEPORT_MANAGED_TARGET_PATH`, so a local prototype run can bypass hosted `/v1/cli/teleport/target` lookup and point directly at a real E2B sandbox description while keeping the same managed teleport flow.
  - Progress: regression coverage now proves the override path works without any cloud session file, and the live E2B helper smoke still passes with `SUPERTURTLE_RUN_LIVE_E2B_TESTS=1`.
  - Progress: live managed E2B cutover now seeds the linked hosted cloud session into `~/.config/superturtle/cloud-session.json` inside the sandbox so remote `superturtle start` can reuse the account link and participate in hosted lease ownership.
- [ ] Keep only the minimum health and rollback behavior required to avoid a broken first prototype run
- [ ] Write the shortest useful human test recipe for the prototype and list exact prerequisites
- [ ] After one real prototype attempt, fix only the concrete blocker surfaced by that run
- [ ] Defer cloud -> local return and broader productionization unless the first prototype succeeds
