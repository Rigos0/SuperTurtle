# SuperTurtle Cloud Outpost Design

## Status

Active product/design document for the current SuperTurtle Cloud direction.

Read this together with:

- `super_turtle/docs/REPO_BOUND_TELEPORT_SPEC.md`
- `super_turtle/docs/TELEGRAM_WEBHOOK_POC.md`
- `super_turtle/docs/E2B_WEBHOOK_WAKE_POC.md`
- `super_turtle/docs/E2B_REMOTE_RUNTIME_SETUP.md`

This document refines the user model, ownership model, connector model, and health/security model discussed after the initial repo-bound teleport spec.

## Product Model

SuperTurtle Cloud is not a throwaway teleport destination and is not a whole-machine replica.

The system has two persistent habitats for one turtle:

- `Home Base`: the local machine/runtime
- `Cloud Outpost`: the persistent E2B sandbox/runtime

Only one habitat owns Telegram at a time, but both habitats may continue to exist across repeated handoffs.

Core principle:

- `/teleport` moves Telegram ownership to the Cloud Outpost
- `/home` moves Telegram ownership back to Home Base
- neither command implies full bidirectional sync
- the Outpost remains stateful across pause/resume cycles

## Key Decisions

### 1. The Cloud sandbox is a persistent Outpost

The E2B sandbox is expected to stay stateful and resumable.

It should usually be:

- running when it actively owns Telegram
- paused when it does not
- resumed on demand

If the Outpost environment becomes messy, the answer is not to discard it by default. The user should be able to reconnect to it and let the turtle repair the environment inside the sandbox.

### 2. Returning home is not the same as syncing home

`/home` only returns Telegram ownership to Home Base.

It does not automatically mean:

- apply all remote changes locally
- mirror the sandbox back into the local machine
- clean or reset the remote environment

Promotion of remote work back to Home Base is a separate decision.

### 3. Cloud-ready connectors should work without the local PC

For connectors such as GitHub CLI, Supabase CLI, Vercel/other cloud CLIs, secret-backed API tools, and similar auth-driven integrations, the goal is:

- import once from the user's local machine
- store securely in the control plane
- hydrate into the Cloud Outpost automatically
- keep working even if the local machine is offline

The local machine is the onboarding and refresh point for these connectors, not the runtime dependency.

### 4. Git is required for workspace continuity, not for Cloud as a whole

Cloud usage does not need to hard-require a Git repo in all cases.

However, safe workspace continuity between Home Base and Cloud Outpost should require:

- one bound Git repo root
- the same repo identity on both sides
- a deterministic remote project root

Without Git, SuperTurtle would need to reinvent snapshots, diffs, merges, rollback, and provenance.

Therefore:

- Cloud chat/cloud execution may exist without a bound repo
- workspace teleport and workspace promotion should require a bound Git repo

### 5. Syncable state is not the same as all state

Do not force every piece of state into Git sync.

Split state into:

- Git-synced workspace state
- control-plane-vault connector/auth state
- runtime continuity/handoff state
- ephemeral machine-local/runtime-only state

## User Experience

### Local runtime UX

The public local UX should be:

- `superturtle start` starts the turtle in the normal continuous local mode
- `superturtle stop` stops the local turtle

The internal foreground runner should exist, but it is supervisor plumbing rather than primary product UX.

Current direction:

- `superturtle service run` is for `launchd`, `systemd`, and Cloud/Outpost supervision
- it should not be taught as a second normal manual run mode

If we later want a distinct developer console flow, it should be an explicit `attach` or `console` concept rather than a second meaning for `start`.

### Initial setup

Expected flow:

1. user logs in locally with SuperTurtle
2. local machine becomes the repo's `Home Base`
3. user enables Cloud for the repo
4. SuperTurtle discovers cloud-capable connectors locally
5. user approves import of those connectors into Cloud
6. control plane stores encrypted connector material
7. later Cloud Outpost launches can hydrate those connectors automatically

The user-facing story should be:

- the PC is where SuperTurtle learns the user's tools
- the Cloud Outpost is where SuperTurtle replays those tools

### Teleport

`/teleport` should mean:

1. verify or create the Outpost
2. ensure the correct repo snapshot is available remotely
3. ensure required connector/auth material can be hydrated
4. resume or start the Outpost
5. wait for remote readiness
6. move Telegram ownership to the Outpost

If the Outpost is already healthy, teleport should be fast and should reuse the same sandbox instead of re-bootstrapping from scratch.

### Home

`/home` should mean:

1. move Telegram ownership back to Home Base
2. leave the Outpost state intact
3. optionally pause the Outpost

It should not imply automatic workspace promotion from remote to local.

### Repair

If the Outpost is unhealthy or messy:

- the user should be able to reconnect to it
- the turtle should be able to repair it in place
- the control plane should surface the failure state clearly

Only a future explicit reset flow should destroy or rebuild the Outpost from scratch.

## Repo And State Model

### Bound repo

Workspace continuity should be repo-bound.

Rules:

1. one turtle installation binds to one repo root for teleportable workspace state
2. nothing above the repo root is synced
3. nothing outside the repo root is synced
4. the Cloud Outpost uses that same repo at a deterministic path

### What Git should carry

Git should carry:

- project files
- syncable `.superturtle` state
- SuperTurtle-managed workspace snapshots/refs needed for continuity

Git should not carry:

- connector secrets
- auth tokens
- `.superturtle/.env`
- PID files
- locks
- sockets
- ephemeral caches

### `.superturtle`

Treat `.superturtle` as logically full-sync state with an explicit denylist for secrets and machine-local artifacts.

Examples of syncable `.superturtle` content:

- session metadata
- turn logs
- SubTurtle state
- manifests
- continuity metadata

Examples of non-syncable `.superturtle` content:

- `.env`
- auth material
- machine-local IPC artifacts
- runtime locks and PID files

## Connector Model

### Cloud-ready connectors

Cloud-ready connectors are integrations whose useful state can be imported and rehydrated in the Outpost.

Examples:

- GitHub CLI auth/state
- Supabase CLI auth/state
- other cloud/service CLIs with exportable login state
- API tokens or service credentials that can be re-materialized safely

Expected flow:

1. detect locally during setup or refresh
2. normalize into a SuperTurtle connector record
3. store encrypted secret material in the control plane
4. materialize the connector into the Outpost on launch/resume/bootstrap

This extends the same pattern already used for Claude/Codex auth bootstrap.

### Local-only connectors

Some future connectors may be truly machine-bound.

These should be treated as local-only and should not block the core Cloud Outpost model.

The main Cloud experience should not depend on the local machine staying online for cloud-capable connectors.

## Ownership Model

Telegram ownership is an explicit control-plane concept, not an emergent side effect.

The control plane should track:

- current owner: `home` or `outpost`
- current lease epoch
- current repo binding
- current Outpost identity

Each runtime should act only when it holds a valid current lease.

This is required to avoid split-brain behavior when:

- the local runtime dies and later comes back
- the Outpost is resumed after an ownership change
- an old process keeps running with stale assumptions

## Health Tracking

Health should be modeled as:

- last known good state
- current provider/runtime state
- signed control-plane lease

It should not depend on waking paused infrastructure unnecessarily.

### Home Base health

The local runtime should maintain an authenticated outbound control channel to the control plane.

This channel should carry:

- device identity
- boot identity
- process identity
- current lease epoch
- repo binding
- recent checkpoint metadata
- frequent heartbeats

Suggested Home Base states:

- `healthy`
- `suspect`
- `down`
- `recovering`

### Cloud Outpost health

The control plane should track two different things:

1. sandbox lifecycle from E2B
2. turtle-process readiness inside the sandbox

Suggested Outpost states:

- `parked`
- `waking`
- `active`
- `unhealthy`
- `failed`

Important rule:

- a paused Outpost can still be considered healthy if it was last known good before pause
- the control plane should not resume the Outpost just to ask whether it is alive

### What the control plane should store

At minimum:

- current owner
- current lease epoch
- last local heartbeat
- local device/boot identity
- last Outpost ready timestamp
- last Outpost heartbeat while running
- current E2B sandbox lifecycle state
- last successful cutover time
- last failure reason

## Local-To-Cloud Failover

When Home Base owns Telegram through polling:

1. Home Base sends heartbeats to the control plane
2. if heartbeats expire, control plane marks Home Base `down`
3. control plane revokes the local lease
4. control plane switches Telegram to the Cloud webhook path
5. the Outpost stays paused until the next real Telegram message arrives
6. the next Telegram message causes the Outpost to resume
7. control plane waits for Outpost readiness
8. the update is delivered to the Outpost under the new lease epoch

This preserves the paused-when-idle property for E2B while still allowing failover from local polling to cloud ownership.

When Home Base later reconnects:

- it must detect that its old lease is stale
- it must not reclaim ownership automatically
- it should enter standby until an explicit handoff returns ownership home

## Security Model

The security boundary should be the control plane, not the raw E2B URL.

### Public ingress

Do not expose the raw sandbox as the public Telegram endpoint.

Instead:

- Telegram posts to a control-plane-owned webhook endpoint
- the control plane validates the request
- the control plane resumes/routes to the correct Outpost
- the Outpost receives only authenticated internal control-plane traffic

This is safer than depending on an internet-visible sandbox URL with a hard-to-guess path.

### Telegram webhook hardening

Require:

- random per-Outpost webhook path
- Telegram secret header validation
- strict method/path checks
- request size limits
- rate limiting
- replay/update deduplication by Telegram update id

Optional additional signals may be layered in later, but the secret header must remain the core protocol check.

### Home Base security

Home Base should use:

- outbound-only control-plane connection
- device-scoped credentials
- rotating session tokens
- signed heartbeat/control traffic

Home Base should not require inbound local port exposure for Cloud failover.

### Outpost security

The Outpost should use:

- short-lived control-plane-issued boot or session tokens
- authenticated control-plane-to-Outpost requests
- a supervisor contract for ready/liveness state
- no unauthenticated public control surface

If the turtle process dies in the Outpost, the control plane should be able to:

- detect the loss of readiness/heartbeat while running
- mark the Outpost unhealthy
- inform the user clearly
- offer restart or repair flows

## Operational Consequences

This design implies:

1. the Outpost is a first-class persistent runtime, not a disposable teleport target
2. `/home` must be separated from workspace promotion
3. cloud-capable connector import/vault/hydration is core product work
4. Git remains the safety mechanism for workspace continuity
5. the control plane must own the lease model and public webhook ingress
6. paused Outposts are treated as parked state, not as failed state
7. local failure detection must come from authenticated control-plane heartbeats, not Telegram traffic

## Near-Term Design Priorities

1. define the control-plane lease contract and epoch behavior
2. define the Home Base heartbeat schema and failure thresholds
3. define the Outpost supervisor/ready contract
4. define the cloud connector record/vault/hydration flow
5. define the exact repo snapshot and promotion semantics between Home Base and Outpost
6. define the control-plane webhook ingress that fronts the Outpost
