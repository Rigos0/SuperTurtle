# Managed Teleport Inventory

Last checked: 2026-03-13

## agentic repo

### Telegram bot `/teleport`
- `super_turtle/claude-telegram-bot/src/handlers/commands.ts`
  - `/teleport` only supports `status`, `managed`, and `dry-run`.
  - Launch is immediate once the bot is idle and the deferred queue is empty.
  - There is no preflight summary, confirm/cancel flow, or `ask_user` MCP integration.
  - The command launches `super_turtle/scripts/teleport-manual.sh --managed` in the background and tracks it with `.superturtle/teleport/managed-active.lock`.
- `super_turtle/claude-telegram-bot/src/handlers/commands.teleport.test.ts`
  - Tests cover idle checks, queue checks, duplicate-run lock handling, and `/teleport status`.
  - Tests do not cover confirm/cancel, provider-auth preflight, or richer status phases.

### Teleport execution path
- `super_turtle/scripts/teleport-manual.sh`
  - Managed teleport still resolves an SSH target and remote project root from the hosted control plane.
  - If the instance is not running, it calls `/v1/cli/cloud/instance/resume` and polls `/v1/cli/cloud/status`.
  - Final execution is still SSH + `rsync` + remote shell bootstrap on a Linux host.
  - The script assumes the destination exposes `ssh_target` and `remote_root`; there is no E2B file upload, sandbox connect, or PTY execution flow here yet.
- `super_turtle/state/teleport_handoff.py`
  - Export/import of semantic handoff state already exists and is reusable.
  - The bundle includes runtime prefs, turn/session state, inbox handoff context, and a portable `runtime-import` directory.

### Hosted cloud client and runtime ownership
- `super_turtle/bin/cloud.js`
  - Includes hosted session handling and typed client functions for:
    - `/v1/cli/cloud/status`
    - `/v1/cli/cloud/instance/resume`
    - `/v1/cli/teleport/target`
    - runtime lease claim/heartbeat/release
  - Client validation still expects the hosted teleport target to be SSH-based.
- `super_turtle/bin/cloud-control-plane-contract.js`
  - `validateCliTeleportTargetResponse()` requires `ssh_target` and `remote_root`.
  - Managed instance validation is still VM-shaped (`hostname`, `vm_name`, `region`, `zone`) and has no E2B fields.
- Local runtime ownership is already integrated into startup/stop flows elsewhere in the repo; teleport can build on that lease foundation instead of inventing a second ownership system.

### Local prototype and provider auth
- `super_turtle/bin/cloud-control-plane-runtime.js`
  - Contains a local prototype control plane with `provider_credentials` storage and Claude credential validation/configuration logic.
  - The prototype also returns SSH-based teleport targets and GCP-oriented managed instances, so it is not yet the production E2B contract.
- `super_turtle/docs/MANUAL_TELEPORT_RUNBOOK.md`
  - Current operator guidance still assumes SSH hosts, Claude OAuth token sync via `.superturtle/.env`, and optional remote `codex login`.
- There is no production Telegram-path bootstrap yet for reusing local Claude/Codex auth and seeding a managed sandbox before cutover.

## ../superturtle-web repo

### Hosted runtime routes that exist
- `src/app/v1/cli/cloud/status/route.ts`
- `src/app/v1/cli/cloud/instance/resume/route.ts`
- `src/app/v1/cli/teleport/target/route.ts`
- `src/app/v1/cli/runtime/lease/{claim,heartbeat,release}/route.ts`
- `src/app/v1/machine/{register,heartbeat}/route.ts`

These routes are production-shaped in the sense that they use bearer auth, typed controller helpers, and `Cache-Control: no-store`.

### Managed runtime controller shape
- `src/features/cloud/controllers/managed-runtime.ts`
  - `getManagedCloudStatus()`, `resumeManagedInstance()`, and `getTeleportTarget()` all call `requireActiveEntitlement(userId)`.
  - That means the current hosted runtime path is still billing-gated, which conflicts with the stated near-term goal of open access for any authenticated user.
  - `resumeManagedInstance()` only mutates Supabase rows and enqueues a `provision` or `resume` job; there is no sandbox provider adapter behind it yet.
  - `getTeleportTarget()` returns `ssh_target` and `remote_root`, not `sandbox_id`, `template_id`, or E2B execution metadata.
  - `registerManagedMachine()` and `heartbeatManagedMachine()` update VM-oriented fields like `hostname` and `vm_name`.
- `src/features/cloud/controllers/runtime-lease.ts`
  - Lease claim/heartbeat/release is implemented against Supabase RPCs and writes audit log entries.
  - This is the single-owner runtime control surface the teleport flow should continue to use.

### Current schema shape
- `supabase/migrations/20260313110000_add_managed_runtime_tables.sql`
  - `managed_instance_provider` only contains `gcp`.
  - `managed_instances` stores VM/SSH fields: `hostname`, `vm_name`, `ssh_user`, `remote_root`, `region`, `zone`.
  - There is no `sandbox_id`, `template_id`, E2B lifecycle state, or sandbox metadata contract.
  - `provisioning_jobs` and `runtime_owners` already exist and match the hosted lease/runtime model.

### E2B status
- `../superturtle-web/package.json`
  - No `e2b` or `@e2b/*` dependency is installed.
- Repo search found no hosted sandbox adapter, no `E2B_API_KEY` usage, and no `sandbox_id` / `template_id` fields in the hosted code.
- The hosted control plane currently exposes runtime state, lease, and machine-registration interfaces, but they are still VM-shaped end to end.

### Provider auth status
- The hosted Next.js app does not currently expose provider-auth routes for Claude or Codex.
- The only concrete provider-credential implementation found during this pass is the local prototype in `agentic`, not the deployed hosted app.

## Immediate implications
- The next actionable step is fixing the pre-existing `../superturtle-web` build/lint issues so the hosted runtime codebase is in a clean state before functional changes.
- Converting managed teleport to E2B requires contract changes in both repos:
  - `../superturtle-web`: schema, managed-runtime controller, sandbox adapter, and teleport target contract
  - `agentic`: `cloud.js` validation and `teleport-manual.sh` execution path
- The existing lease/runtime ownership foundation is usable, but the managed runtime abstraction is still VM/SSH-shaped and billing-gated today.
