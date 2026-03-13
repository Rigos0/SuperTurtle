# Managed Teleport Inventory

Last checked: 2026-03-13

## agentic repo

### Telegram bot `/teleport`
- `super_turtle/claude-telegram-bot/src/handlers/commands.ts`
  - `/teleport` only supports `status`, `managed`, and `dry-run`.
  - Launch is immediate once the bot is idle and the deferred queue is empty.
  - There is no confirm/cancel preflight yet.
  - The command starts `super_turtle/scripts/teleport-manual.sh --managed` in the background and tracks it with `.superturtle/teleport/managed-active.lock`.
- `super_turtle/claude-telegram-bot/src/handlers/commands.teleport.test.ts`
  - Tests cover idle checks, queue checks, duplicate-run lock handling, and `/teleport status`.
  - Tests do not cover any confirm/cancel flow or ask-user integration for teleport.

### Teleport execution path
- `super_turtle/scripts/teleport-manual.sh`
  - The managed path still resolves an SSH target and remote project root from the control plane.
  - If the instance is not running, it calls `/v1/cli/cloud/instance/resume` and polls `/v1/cli/cloud/status`.
  - Final execution is still SSH + `rsync` + remote shell bootstrap on a Linux host.
  - The script assumes the destination exposes `ssh_target` and `remote_root`; there is no E2B file/PTY flow here yet.
- `super_turtle/state/teleport_handoff.py`
  - Handoff export/import already exists and is reusable.
  - The bundle carries runtime prefs, session/turn log state, and inbox handoff context.

### Cloud client and runtime ownership
- `super_turtle/bin/cloud.js`
  - Includes hosted session handling and typed client functions for:
    - `/v1/cli/cloud/status`
    - `/v1/cli/teleport/target`
    - `/v1/cli/cloud/instance/resume`
    - runtime lease claim/heartbeat/release
  - Client validation still expects the hosted teleport target to be SSH-based.
- Runtime ownership is already wired into local startup/stop flows elsewhere in the repo.

### Provider auth
- The shipping managed teleport path still relies on host-local CLI auth assumptions plus `.superturtle/.env` transfer for Claude.
- There is no user-facing managed teleport bootstrap for hosted Claude/Codex auth in the Telegram command path yet.
- There is local experimental/runtime code for Claude credential storage in `super_turtle/bin/cloud-control-plane-runtime.js`, but that is not the deployed Next.js control-plane implementation.

## ../superturtle-web repo

### Hosted runtime routes that exist
- `src/app/v1/cli/cloud/status/route.ts`
- `src/app/v1/cli/cloud/instance/resume/route.ts`
- `src/app/v1/cli/teleport/target/route.ts`
- `src/app/v1/cli/runtime/lease/{claim,heartbeat,release}/route.ts`
- `src/app/v1/machine/{register,heartbeat}/route.ts`

These routes are production-shaped in the sense that they use bearer CLI auth, typed controller helpers, and `Cache-Control: no-store`.

### Managed runtime controller shape
- `src/features/cloud/controllers/managed-runtime.ts`
  - Requires an active entitlement for `cloud/status`, `resume`, and `teleport/target`.
  - `resumeManagedInstance()` only mutates Supabase rows and enqueues a `provision` or `resume` provisioning job.
  - `getTeleportTarget()` returns `ssh_target` and `remote_root`, not sandbox identity.
  - `registerManagedMachine()` and `heartbeatManagedMachine()` update VM-oriented fields like `hostname` and `vm_name`.
- `src/features/cloud/controllers/runtime-lease.ts`
  - Lease claim/heartbeat/release is already implemented against Supabase RPCs and audit logging.

### Current schema shape
- `supabase/migrations/20260313110000_add_managed_runtime_tables.sql`
  - `managed_instance_provider` only contains `gcp`.
  - `managed_instances` stores VM/SSH fields: `hostname`, `vm_name`, `ssh_user`, `remote_root`, `region`, `zone`.
  - There is no `sandbox_id`, `template_id`, or E2B-specific lifecycle data.
  - `provisioning_jobs` and `runtime_owners` already exist and match the current control-plane contract.
- Billing/storage surfaces already exist:
  - `subscriptions` table comes from `supabase/migrations/20240115041359_init.sql`
  - Entitlements are in `supabase/migrations/20260312131500_add_entitlements.sql`

### E2B status
- No E2B SDK integration exists in `../superturtle-web` yet.
- `../superturtle-web/package.json` does not include an E2B dependency.
- A repo-wide search found no sandbox adapter, `E2B_API_KEY` usage, `sandbox_id`, or `template_id` in the hosted app code.

### Provider auth status
- The hosted Next.js app does not currently expose provider-auth routes for Claude or Codex.
- The existing provider-credential work is in the local runtime prototype in `agentic`, not in the deployed hosted control plane.

## Immediate implications
- The next implementation step should start by getting `../superturtle-web` building cleanly before adding new hosted runtime code there.
- Converting managed teleport to E2B will require contract changes in both repos:
  - control plane: managed instance schema + adapter + target contract
  - agentic: `/teleport` execution path and `cloud.js` validation
- The current hosted control plane already has the right ownership/lease foundation, but the managed runtime abstraction is still VM-shaped end to end.
