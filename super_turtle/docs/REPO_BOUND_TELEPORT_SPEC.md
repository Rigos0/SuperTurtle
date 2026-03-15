# Repo-Bound E2B Teleport Spec

## Status

Active product/runtime spec for `teleport-v2.0`.

## Decision

Teleport is now E2B-only.

There is no active Azure, GCP, AWS, or generic VM target in this branch.

The remote runtime model is:

1. local SuperTurtle keeps using long polling
2. `/teleport` provisions or resumes an E2B sandbox
3. the sandbox starts the bot in webhook mode
4. Telegram ownership flips only after the remote webhook is healthy
5. local ownership is released only after the remote runtime is authoritative

## Repo Boundary

Each SuperTurtle installation is bound to exactly one Git repository.

That bound repository is the only sync scope eligible for teleport.

Rules:

1. Teleport only works when a bound repo exists.
2. The sync root is the repo root, not the current shell directory.
3. Nothing above the repo root is ever synced.
4. Nothing outside the repo root is ever synced.
5. Binding must be refused for unsafe roots such as `/` or the user's home directory.
6. Teleport must fail closed if the bound repo cannot be resolved.

## Transfer Model

Teleport moves two things:

### 1. Repo content

Default inclusion:

- Git-tracked files inside the bound repo

Default exclusion:

- `.git/`
- `node_modules/`
- `.venv/`
- caches
- build outputs
- logs
- `.env`
- machine-local credential files

Untracked files stay excluded unless explicitly allowlisted in:

```text
.superturtle/teleport-manifest.json
```

### 2. Runtime handoff bundle

This is the continuity state required to keep the bot session coherent across cutover.

Examples:

- selected `.superturtle` runtime state
- session continuity metadata
- queue/handoff artifacts needed for ownership transfer

This bundle is transferred atomically at teleport time, not mirrored continuously.

## Remote Runtime Contract

The E2B sandbox is the remote runtime boundary.

Required sandbox properties:

- repo cloned or synced at a deterministic project root
- bot can boot with the repo-bound project config
- bot can run Bun HTTP webhook transport
- sandbox can receive environment-seeded secrets at startup
- sandbox lifecycle supports start, pause, resume, and destroy

Expected runtime env on the sandbox:

- `TELEGRAM_TRANSPORT=webhook`
- `TELEGRAM_WEBHOOK_URL=<public webhook url>`
- `TELEGRAM_WEBHOOK_SECRET=<secret token>`
- repo-bound `.superturtle/.env` values needed for the bot

## Ownership And Cutover

Repo sync alone is not teleport.

Teleport requires:

1. source runtime is idle or explicitly paused
2. runtime handoff bundle is exported
3. destination repo content is present
4. destination dependencies are healthy
5. destination webhook endpoint is live
6. Telegram webhook is switched to the destination
7. destination health is rechecked after webhook registration
8. source polling ownership is released only after destination verification

Rollback requirement:

- if sandbox startup fails, local ownership stays authoritative
- if webhook registration fails, local polling stays authoritative
- if post-cutover health fails, revert ownership rather than leaving Telegram detached

## Telegram Transport Policy

Transport is mode-specific, not global:

- local development/runtime: long polling
- remote E2B runtime: webhooks

This keeps local installs from exposing ports while allowing cloud sandboxes to receive Telegram updates directly.

## Pause/Resume Policy

Remote lifecycle must be controllable from Telegram.

The expected user model is:

- `/teleport` starts or resumes the sandbox and flips Telegram to the webhook runtime
- a pause action pauses remote execution without losing continuity state
- a resume action wakes the same sandbox or replacement sandbox and restores webhook ownership

Precise Telegram commands can evolve, but the sandbox lifecycle contract must support this flow.

## Non-Goals

Teleport is not:

- whole-machine backup
- home-directory replication
- generic folder sync
- secret replication
- dependency-directory mirroring
- multi-provider cloud orchestration

## Practical Consequences

This spec implies:

1. `init` persists the bound repo root.
2. `start` and `status` resolve through the bound repo.
3. teleport code should assume E2B, not a generic provider abstraction.
4. webhook cutover is part of teleport correctness, not an optional extra.
5. any remote pause/resume semantics must map to E2B sandbox lifecycle operations.

## Near-Term Implementation Focus

1. Keep the persisted bound-repo config.
2. Define the repo safety validator.
3. Define `.superturtle/teleport-manifest.json`.
4. Define the E2B sandbox handoff contract.
5. Implement `/teleport` ownership cutover using webhook health checks.
6. Implement pause/resume control from Telegram against the sandbox lifecycle.
