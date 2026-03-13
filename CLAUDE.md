# Super Turtle — Dev Branch

You are Super Turtle 🐢 — an autonomous coding agent controlled from Telegram. You spawn SubTurtles to do work, supervise them, and report back. This repo is the agent itself.

## Architecture

- **`super_turtle/claude-telegram-bot/`** — Telegram bot (TypeScript/Bun). The meta agent's runtime. Handles messages, voice, streaming, driver routing (Claude/Codex), MCP tools, session management.
- **`super_turtle/subturtle/`** — SubTurtle orchestration (Python). Loop types: `slow`, `yolo`, `yolo-codex`, `yolo-codex-spark`. Includes `ctl` CLI, watchdog, loop runner, browser screenshot helper, tunnel helper.
- **`super_turtle/meta/`** — Meta agent prompts: `META_SHARED.md` (system prompt) and `DECOMPOSITION_PROMPT.md`.
- **`super_turtle/setup`** — Onboarding setup script for fresh clones.
- **`super_turtle/bin/`** — CLI entry point (`superturtle` npm package).
- **`super_turtle/templates/`** — Templates for CLAUDE.md, etc.
- **`super_turtle/docs/`** — Internal design notes, audits, and implementation references.
- **`../superturtle-web/`** — Hosted site + control-plane app (Next.js/Supabase/Stripe/Vercel) for browser auth, CLI login, billing, and account surfaces.
- **`../turtlesite/docs/`** — Actual documentation site source for the published docs.

## Tech Stack

- **Bot runtime:** Bun + TypeScript
- **Hosted site/control plane:** Next.js + Supabase + Stripe + Vercel
- **Managed runtime:** E2B sandboxes
- **AI drivers:** Claude CLI (primary), Codex CLI (optional)
- **SubTurtle loops:** Python 3.13
- **MCP servers:** send-turtle (stickers), bot-control (session/model/usage), ask-user (inline buttons)
- **Telegram:** Grammy framework
- **Package:** npm (`superturtle`)

## Key Files

- `super_turtle/claude-telegram-bot/src/handlers/text.ts` — text message handler
- `super_turtle/claude-telegram-bot/src/handlers/voice.ts` — voice message handler + transcription
- `super_turtle/claude-telegram-bot/src/handlers/stop.ts` — stop logic (`stopAllRunningWork()`)
- `super_turtle/claude-telegram-bot/src/handlers/driver-routing.ts` — Claude/Codex driver selection
- `super_turtle/claude-telegram-bot/src/session.ts` — session state, process management, query execution
- `super_turtle/claude-telegram-bot/src/deferred-queue.ts` — voice message queue (max 10 per chat)
- `super_turtle/claude-telegram-bot/src/utils.ts` — `isStopIntent()` detection (line ~302)
- `super_turtle/claude-telegram-bot/src/config.ts` — bot configuration, system prompt injection
- `super_turtle/subturtle/ctl` — SubTurtle CLI (spawn, stop, status, logs, list)

## Branch Merge Instructions (dev <-> main)

Use standard merges. No special merge drivers or merge policy is required.

**Merging:**
```bash
# dev -> main
git checkout main && git merge dev && git push origin main

# main -> dev
git checkout dev && git merge main
```

---

## Current task
Managed teleport: with hosted browser OAuth login now live, turn the current manual teleport flow into a production-ready hosted product by prioritizing single-owner runtime control, E2B sandbox lifecycle, bidirectional teleport semantics, and hosted cloud-status/teleport-target endpoints behind real production interfaces rather than demo-only glue.

## Current system baseline

### Shipped
- Telegram bot runtime, Claude/Codex drivers, MCP tools, queueing, and session management
- Managed `/teleport` bot command with idle/queue/lock checks, background launch, status reporting, and `--managed` target resolution reuse of the existing handoff script
- Current manual teleport path in `super_turtle/scripts/teleport-manual.sh`
- Teleport handoff/import helpers in `super_turtle/state/teleport_handoff.py`
- Manual teleport runbook in `super_turtle/docs/MANUAL_TELEPORT_RUNBOOK.md`
- Hosted site/control-plane repo in `../superturtle-web/`
- Live hosted CLI auth routes at `https://superturtle-web.vercel.app`:
  - `/v1/cli/login/start`
  - `/v1/cli/login/poll`
  - `/v1/cli/session`
  - `/v1/cli/session/refresh`
- Hosted browser login and CLI linking validated with `superturtle login` / `superturtle whoami`
- Token-prefixed runtime isolation for logs, temp dirs, IPC dirs, and tmux sessions
- Existing operator ergonomics: `/status`, `/debug`, `/looplogs`, `superturtle status`, `superturtle logs`

### Known gaps
- Hosted auth/linking is live, but the deployed control plane still needs hosted managed-runtime endpoints for:
  - `/v1/cli/cloud/status`
  - `/v1/cli/cloud/instance/resume`
  - `/v1/cli/teleport/target`
- No single-owner runtime lease exists yet, so logged-in local and cloud installs can still conflict
- No production-managed E2B sandbox lifecycle is attached to the live hosted control plane yet
- Stripe checkout, webhook, and entitlement surfaces exist in the hosted app design, but billing is not yet the validated gate for managed teleport launch
- Current hosted browser auth is GitHub-backed; Google support is still pending if it remains in v1 scope
- `/teleport` still depends on SSH + rsync handoff under the hood; the hosted part currently unlocks identity, not the full managed sandbox cutover path
- Cloud -> local return is in the product spec, but not yet implemented as a first-class flow
- Hosted Claude/Codex credential setup policy is still undefined at the product level

## End goal with specs
- A user can sign in on the site with GitHub or Google
- A user can pay for managed hosting with Stripe
- A paid user gets one persistent managed E2B sandbox
- A local SuperTurtle install can link to the hosted account with a cloud login flow
- `/teleport` can move the active bot identity from local -> cloud and cloud -> local without manual SSH host setup
- Teleport preserves the existing semantic handoff model and same Telegram bot identity
- Only one runtime may be authoritative for a cloud-linked bot identity at a time
- The control plane tracks users, subscriptions, managed instances, cloud links, and teleport sessions
- Hosted provider credentials remain user-scoped and are never shared between users
- The hosted product has basic audit logging, entitlement enforcement, and operational status

## Managed user flow
- User signs in on the site with GitHub or Google
- User chooses the managed hosting plan and pays via Stripe
- Control plane can create or resume exactly one persistent SuperTurtle-managed E2B sandbox for that paid account
- User links a local `superturtle` install to the hosted account through a browser or device login flow
- User runs `/teleport` from the existing Telegram bot identity to move local -> cloud
- Later, user can run `/teleport` again to move cloud -> local with the same semantic handoff model
- The control plane ensures only one side is authoritative at a time

## Teleport semantics
- If a user is not logged in to hosted cloud, `superturtle start` behaves exactly like today and performs no cloud ownership checks
- If a user is logged in, runtime ownership is coordinated through the control plane
- Only one runtime may process messages, spawn workers, or mutate durable bot state at a time
- If the control plane is unreachable during `superturtle start`, local start is allowed but terminal logs must warn that ownership could not be verified
- `/teleport` requires the bot to be idle and the deferred queue to be empty
- `/teleport` is confirm-based, not one-shot
- Ownership transfers only after the destination runtime is verified healthy
- Missing destination provider auth blocks teleport before ownership transfer
- If the local machine already has working Claude/Codex auth, first teleport should reuse that existing local auth to seed the managed sandbox instead of forcing a fresh browser/device OAuth flow
- For v1, direct interactive auth inside the managed sandbox is fallback-only; the preferred path is to bootstrap hosted provider auth from the already logged-in local machine during first teleport
- The product spec is bidirectional, but rollout is phased: local -> cloud first, cloud -> local next

## Recommended MVP architecture
- **Marketing/site app**: landing page, auth, billing entrypoint, account settings, instance status
- **Control plane API + database**: users, auth identities, subscriptions, entitlements, managed runtimes, runtime leases, CLI links, teleport sessions, audit log
- **Billing integration**: Stripe checkout, customer portal, webhook processing, subscription state sync
- **Sandbox provisioner**: E2B sandbox creation/resume, bootstrap, health checks, and reprovision hooks
- **Managed runtime**: one persistent E2B sandbox per paid account, running SuperTurtle in hosted mode with user-scoped provider credentials
- **CLI cloud link flow**: `superturtle login` / `whoami` / cloud status backed by short-lived auth tokens and device or browser login
- **Teleport resolution layer**: `/teleport` resolves managed target metadata from the control plane instead of operator-maintained SSH config

## Execution phases
- **Phase 0 — product contract**: lock v1 scope, billing semantics, credential policy, support posture, and Codex beta boundary
- **Phase 1 — auth and identity foundation**: choose stack/repo boundaries, define schema, build site OAuth, CLI browser login, token/session model, and audit logging
- **Phase 2 — runtime ownership + sandbox control plane**: add runtime lease/heartbeat control, E2B sandbox lifecycle, health reporting, and reprovision path
- **Phase 3 — local -> cloud teleport**: resolve hosted sandbox target from the control plane and reuse the current semantic handoff path safely
- **Phase 4 — cloud -> local teleport**: make the reverse handoff a first-class product flow
- **Phase 5 — billing, provider setup, and operations**: Stripe entitlement enforcement, hosted Claude setup/validation, Codex beta decision, admin tooling, telemetry, and production hardening

## Production priorities
- The first production-critical path, `superturtle login`, is now live against `https://superturtle-web.vercel.app`: local CLI opens the browser, user completes OAuth on the hosted site, the CLI receives a device/browser completion signal, and the control plane issues a user-bound cloud session
- The second production-critical path is runtime ownership + sandbox readiness: once a user is authenticated and entitled, the control plane can establish a single active owner, create or resume exactly one managed sandbox, and report durable runtime state back to the CLI and site
- Billing matters for launch, but auth/session integrity and provisioning correctness come first because they define the contract every later paid flow depends on
- Every interface must be production-shaped now: typed APIs, durable state transitions, idempotent jobs, webhook signature verification, and auditable operator actions

## Overnight implementation plan
- **Worker 1 — `cloud-auth` (Codex)**: define the hosted auth architecture, CLI browser login flow, token/session model, callback semantics, and required `superturtle` commands
- **Worker 2 — `cloud-schema` (Codex)**: define the control-plane schema and API surface for users, identities, sessions, entitlements, managed runtimes, runtime leases, provisioning jobs, and audit log
- **Worker 3 — `cloud-provisioning` (Codex)**: design the managed-runtime lifecycle, E2B sandbox provisioner contract, bootstrap/registration flow, and idempotent create/resume/reprovision behavior
- **Worker 4 — `cloud-billing` (Codex)**: define Stripe subscription lifecycle, entitlement transitions, webhook handling, and how billing gates provisioning without coupling core auth too tightly to Stripe
- **Worker 5 — `teleport-integration` (Codex)**: map how `/teleport` resolves managed targets from the control plane and how existing handoff/import code is reused without weakening current semantics
- Supervisor wakeups should run on Thursday, March 12, 2026 UTC every 30 minutes for all workers, with an additional 90-minute milestone wakeup that forces cross-worker dependency review
- First wakeup pass should check for contract drift between auth, schema, and provisioning; second pass should check that CLI login and provisioning state machines still compose cleanly; later passes should push unfinished work toward concrete docs, interfaces, and implementation-ready tickets
- If any worker gets blocked by missing real Stripe/E2B credentials, that worker must switch to production-interface design, test harnesses, stub adapters, and explicit cutover checklists instead of stalling
- If the auth worker finishes first, it becomes the integration lead and reviews all other worker outputs against the `login -> entitlement -> provision -> status -> teleport` path

## SubTurtle spawn strategy
- Before any spawn, the main agent writes a canonical `.subturtles/<name>/CLAUDE.md` for each worker using the required state contract: `# Current task`, `# End goal with specs`, `# Roadmap (Completed)`, `# Roadmap (Upcoming)`, and `# Backlog`
- Each worker state file should keep exactly one open backlog item marked `<- current`, and that item should match the worker’s overnight scope
- Spawn all five workers immediately to maximize overnight parallelism, but make `cloud-auth`, `cloud-schema`, and `cloud-provisioning` the contract owners the main agent reconciles first
- Default loop type should be `yolo-codex`; default timeout should be `7h`; recurring supervision should be `30m`
- Spawn commands should use repo-native `ctl spawn` so the workspace, validation, process metadata, and recurring silent supervision job are created atomically

```bash
./super_turtle/subturtle/ctl spawn cloud-auth --type yolo-codex --timeout 7h --cron-interval 30m --state-file .subturtles/cloud-auth/CLAUDE.md
./super_turtle/subturtle/ctl spawn cloud-schema --type yolo-codex --timeout 7h --cron-interval 30m --state-file .subturtles/cloud-schema/CLAUDE.md
./super_turtle/subturtle/ctl spawn cloud-provisioning --type yolo-codex --timeout 7h --cron-interval 30m --state-file .subturtles/cloud-provisioning/CLAUDE.md
./super_turtle/subturtle/ctl spawn cloud-billing --type yolo-codex --timeout 7h --cron-interval 30m --state-file .subturtles/cloud-billing/CLAUDE.md
./super_turtle/subturtle/ctl spawn teleport-integration --type yolo-codex --timeout 7h --cron-interval 30m --state-file .subturtles/teleport-integration/CLAUDE.md
```

- `ctl spawn` already auto-registers one recurring `subturtle_supervision` cron job per worker in `.superturtle/cron-jobs.json`; these jobs are silent and should remain the low-level worker health/milestone mechanism
- If one worker proves noisier or more dependency-sensitive than the others, the main agent should adjust only that worker with `./super_turtle/subturtle/ctl reschedule-cron <name> <interval>` instead of changing the whole fleet

## Main-agent cron wakeup plan
- Worker supervision cron is not enough on its own because it checks each worker independently; the main agent still needs scheduled synthesis turns that reconcile cross-worker contracts and reprioritize work
- Main-agent wakeups should be scheduled as one-shot generic cron jobs, not recurring jobs, so each wakeup has a specific purpose and does not drift into duplicate review loops
- These wakeups should be non-silent so they run through the main driver as `cron_scheduled` work; if the driver is busy, the bot already defers them until idle instead of losing them
- Use the repo-native cron store via Bun and `addJob(...)` from `super_turtle/claude-telegram-bot/src/cron.ts`; do not hand-edit `.superturtle/cron-jobs.json` unless the cron module is unavailable

```bash
bun --eval 'import { addJob } from "./super_turtle/claude-telegram-bot/src/cron.ts"; addJob(process.argv[1], "one-shot", Number(process.argv[2]), undefined, false, { job_kind: "generic" });' \
  "Review all managed-teleport workers. Check .superturtle/state/handoff.md, each worker CLAUDE.md, and recent commits. Reconcile auth, schema, and provisioning contracts. If drift exists, update the relevant worker state files and reschedule or stop/restart workers as needed. Respond with concrete orchestration actions only." \
  2700000
```

- Wakeup 1 at `+45m`: contract review across `cloud-auth`, `cloud-schema`, and `cloud-provisioning`; correct interface drift early
- Wakeup 2 at `+90m`: login-to-provision path review; ensure CLI OAuth completion, entitlement gate, and instance state machine compose cleanly
- Wakeup 3 at `+150m`: implementation-shape review; convert open design output into implementation-ready tasks, APIs, and file targets
- Wakeup 4 at `+240m`: dependency and risk sweep; stop or retask any worker that is stuck, redundant, or blocked by missing provider credentials
- Wakeup 5 at `+360m`: morning handoff preparation; collect what is production-ready, what still needs real Stripe/E2B cutover, and what should be the next interactive coding session
- Optional final notification can be a one-shot `BOT_MESSAGE_ONLY:` cron if a human-facing morning summary must be sent even without a synthesis run, but the default plan is to let the main agent synthesize first
- Every main-agent wakeup should read conductor state first, not rely on memory: `.superturtle/state/handoff.md`, `.superturtle/state/workers/`, pending wakeups, worker `CLAUDE.md`, and `ctl status`

## Roadmap (Completed)
- ✅ Core bot runtime: Telegram integration, streaming, Claude/Codex routing, MCP tools
- ✅ Existing local operator model: CLI setup, queueing, logs, dashboard, stop/status flows
- ✅ Manual teleport v1: handoff bundle export/import, remote Linux cutover, semantic continuity
- ✅ Managed `/teleport` command scaffold in the bot: background launch, status/log surfaces, and managed-target reuse of the current handoff flow
- ✅ Multi-instance runtime isolation: token-prefixed temp files, IPC, logs, and tmux sessions
- ✅ Current teleport docs: README section plus manual teleport runbook
- ✅ Hosted browser login + CLI account linking: `superturtle login` and `superturtle whoami` work against `../superturtle-web` / `https://superturtle-web.vercel.app`
- ✅ Initial Codex stream-disconnect hardening for cloud-hosted instability

## Roadmap (Upcoming)
- Lock the managed teleport v1 product contract and hosted credential policy
- Build runtime ownership lease/heartbeat and start-time conflict prevention
- Build hosted cloud status, resume, and teleport-target endpoints behind the deployed control plane
- Build managed E2B sandbox lifecycle, registration, and cloud status surfaces
- Add safe local -> cloud managed teleport
- Add safe cloud -> local managed return
- Productize first-teleport provider setup from the user’s local machine for managed sandboxes
- Add Stripe entitlement enforcement without compromising auth/provisioning contracts
- Add hosted provider setup flow and basic operator/admin tooling

## Manual Teleport Status

- Manual operator-run teleport is implemented via `super_turtle/scripts/teleport-manual.sh`
- The validated direction is local macOS repo -> remote Linux VM over SSH
- Successful cutover keeps the same Telegram bot identity and resumes via semantic handoff on the next turn
- The product spec is now bidirectional local <-> cloud teleport, but the shipped implementation is still the original one-way manual/operator flow plus the current managed `/teleport` scaffold
- Reverse teleport back to local is not automated yet; current operator flow is: stop remote bot, ensure work is committed and pushed, `git pull --ff-only` locally, then start the local bot
- Remote stop/restart steps and auth notes live in `super_turtle/docs/MANUAL_TELEPORT_RUNBOOK.md`

## Backlog
### Runtime ownership + conflict prevention
- [ ] Add runtime owner / claim / heartbeat / release endpoints plus lease epoch semantics <- current
- [ ] Make logged-in `superturtle start` cloud-aware while preserving local-only startup for logged-out users
- [ ] Refuse start when another host owns the bot identity; allow start with terminal warning if the control plane is unreachable
- [ ] Stop stale runtimes on lease loss or epoch mismatch

### Teleport UX
- [ ] Add `/teleport` preflight summary with confirm/cancel before cutover
- [ ] Keep `/teleport` idle-only; reject while work is active or queued
- [ ] Improve `/teleport status` with phase, active owner, destination runtime state, and latest failure reason
- [ ] Surface clear preflight failures for missing login, missing cloud auth, and destination sandbox issues

### Managed cloud runtime on E2B
- [ ] Wire the deployed hosted control plane to real managed-runtime endpoints (`/v1/cli/cloud/status`, resume, teleport target)
- [ ] Replace managed VM assumptions with one persistent E2B sandbox per user
- [ ] Define managed-runtime lifecycle and idempotent sandbox create/connect-resume/pause/reprovision/delete behavior
- [ ] Build the production `superturtle-teleport` E2B template with pinned toolchain, startup scripts, health checks, log paths, and provider config directories
- [ ] Store hosted runtime identity as `sandbox_id` + `template_id` in the control plane instead of SSH coordinates
- [ ] Use E2B metadata only for non-secret routing (`user_id`, `account_id`, sandbox role, driver, environment, teleport session)
- [ ] Add a sandbox adapter in `../superturtle-web` for create, connect/resume, pause, kill, list, and metadata lookup through the E2B SDK
- [ ] Set short active timeouts with `onTimeout: "pause"` and keep resume control-plane-driven for `/teleport`, `cloud status`, and explicit resume
- [ ] Default managed sandboxes to secure access with restricted public traffic; front any exposed ports with the control plane and traffic-token checks
- [ ] Build sandbox bootstrap, health reporting, and registration back to the control plane

### Local -> cloud cutover
- [ ] Reuse the semantic handoff bundle for managed E2B cutover
- [ ] Replace SSH target resolution with a `sandbox_id`-based hosted teleport target contract
- [ ] Upload handoff bundles and required runtime artifacts with E2B file APIs instead of `rsync`
- [ ] Start remote bootstrap and health verification through E2B commands/PTY, not SSH, and stream logs back through command/PTY output
- [ ] Transfer ownership only after the destination runtime is healthy
- [ ] Add automatic rollback so local remains authoritative if cloud startup fails
- [ ] Prevent duplicate concurrent teleport launches across both local lock state and control-plane ownership
- [ ] Keep SSH/manual teleport only as an operator fallback path during migration off the current host-based flow

### Cloud -> local return
- [ ] Define cloud -> local teleport as a first-class flow rather than an operator-only workaround
- [ ] Rehydrate the local runtime from cloud handoff state before ownership returns
- [ ] Transfer ownership back only after local is healthy
- [ ] Add rollback so cloud remains authoritative if local restart fails

### Provider auth + entitlement gates
- [ ] Block teleport before ownership transfer when required destination provider auth is missing
- [ ] Productize first-teleport provider setup so the user can reuse existing local Claude/Codex auth when available, with browser/device auth only as fallback
- [ ] Support user-scoped Claude hosted auth bootstrap from the local machine by reusing existing local auth state or token material instead of requiring direct browser login inside the managed sandbox
- [ ] Support user-scoped Codex hosted auth bootstrap from the local machine by reusing existing local auth state or API-key-backed login instead of requiring direct browser login inside the managed sandbox
- [ ] Store user-scoped hosted provider auth material securely in the control plane and use it only for that user’s sandbox/session
- [ ] Add reauth/refresh/recovery flows when hosted Claude/Codex auth expires, is revoked, or becomes invalid
- [ ] Add managed Claude/Codex settings and secret-deny policy for hosted sandboxes
- [ ] Keep secrets out of E2B metadata and out of shared persisted sandbox auth state
- [ ] Decide whether hosted Codex support ships in v1 or beta
- [ ] Decide whether `runtime_provider = e2b_managed | e2b_byok` is a post-v1 provider mode or part of the first hosted rollout
- [ ] Add Stripe checkout, subscriptions, and webhook processing
- [ ] Add entitlement checks for paid vs unpaid vs suspended users
- [ ] Decide billing semantics: always-on sandbox vs suspend-on-idle
- [ ] Add basic admin/support tooling for reprovision, suspend, and teleport audit
- [ ] Add production telemetry for provisioning failures, teleport failures, and unhealthy runtimes

## Notes
- Managed teleport should target only SuperTurtle-managed E2B sandboxes in the hosted product path
- Detailed capability and product-shape report: `super_turtle/docs/e2b-managed-teleport-report.md`
- Local development note: the root `.env` in this workspace already has `E2B_API_KEY` configured; use that existing local credential for development and never print or commit the secret value
- Recommended hosted account model: GitHub/Google OAuth on the site plus a CLI browser/device login flow
- Current live hosted auth base URL: `https://superturtle-web.vercel.app`
- Recommended pricing shape: monthly subscription, one user, one managed sandbox, one bot
- V1 hosted provider setup should prefer reusing existing local Claude/Codex auth when the user is already logged in; browser/device login is the fallback path, not the default
- Recommended v1 launch posture: Claude-first hosted support, Codex explicitly beta
- Recommended runtime posture: one persistent E2B sandbox per paid account with hosted ownership control
- Preferred remote control path: E2B SDK + PTY/files/commands; SSH is only an operator escape hatch
- Existing manual teleport implementation remains the baseline cutover path to reuse
- Current manual teleport preserves semantic continuity, not exact provider-native thread continuity
- Feasibility validation on March 13, 2026: an E2B sandbox was created from the `claude` template, missing runtime packages were installed, the `feat/teleport` repo branch was cloned, `.superturtle/.env` was rewritten for sandbox-local paths, Claude auth was reused from existing local token material, Codex was installed and logged in with `codex login --with-api-key` using the existing local API key, both CLIs emitted streaming output, and `node super_turtle/bin/superturtle.js start` successfully booted `@superturtle_bot` inside the sandbox
- Replication details from that validation: use the existing local `E2B_API_KEY`; create an E2B sandbox; install `tmux`, `rsync`, `bun`, and `@openai/codex` if missing; clone the repo into `/home/user/agentic`; rewrite `.superturtle/.env` so `CLAUDE_WORKING_DIR` and `ALLOWED_PATHS` point at sandbox paths; seed Claude from existing local auth material; seed Codex from the existing local API key; then run `node super_turtle/bin/superturtle.js start` from the repo root
- The actual docs repo lives in sibling path `../turtlesite/`; edit `../turtlesite/docs/` for public docs when we are ready to publish managed teleport docs

## Skippable limitations
- There are currently no live production E2B or Stripe accounts attached to this workspace, so early implementation must use production-shaped provider interfaces, test-mode billing flows, provisioning adapters, and explicit cutover checklists instead of blocking on missing accounts
- Development is running in a sandbox environment, so browser OAuth callbacks, webhook delivery, and cloud provisioning must be designed to work with local/test harnesses first and then promote cleanly to real infrastructure
- These are skippable implementation limitations, not product-scope limitations: they should never justify demo-grade contracts, fake persistence, or one-off flows we would later need to replace
- Any code that depends on real cloud or billing credentials should ship behind clear adapter boundaries, feature flags, and health/status reporting so the production path remains auditable once credentials exist

## Open decisions
- Hosted provider-auth storage, refresh, and recovery details after the initial local-machine OAuth/bootstrap step
- Whether v1 billing is always-on monthly infrastructure or suspend-on-idle with resume semantics
- Whether hosted Codex support launches in v1 or remains explicit beta behind separate validation
- Final repo boundary choice for site/control plane versus bot/runtime code
