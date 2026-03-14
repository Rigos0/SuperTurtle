# Repo-Bound Teleport Spec

## Status

Draft v1 product/runtime spec for VM-backed teleport on `dev`.

## Problem

Teleport and sync become unsafe if SuperTurtle treats "wherever the user happened to start it" as the transfer scope.

Examples of bad outcomes:

- a user runs SuperTurtle from `$HOME`
- a user keeps unrelated personal files next to the project
- a user starts the bot from a subdirectory inside a large monorepo
- a user installs `superturtle` globally and expects the whole machine to be portable

The product must define a strict project boundary.

## Core Decision

Each SuperTurtle installation is bound to exactly one Git repository.

That bound repository is the only code/content scope eligible for teleport sync.

Teleport never means "copy this machine." It means:

1. sync the bound repository
2. transfer the SuperTurtle runtime handoff bundle
3. start the destination
4. flip ownership only after destination health is verified

## User Model

SuperTurtle is attached to a project, not to an arbitrary working directory.

The user experience should be:

- install SuperTurtle
- bind it to a repo
- run/start/status/teleport against that repo

If the user wants to operate on a different project, they need a different SuperTurtle binding.

## Install Modes

Two install modes are supported:

### 1. Normal user install

- install the launcher via `npm`
- use the launcher to bind SuperTurtle to one repo

Example:

```bash
npm install -g superturtle
superturtle bind /path/to/repo
```

### 2. Developer install

- clone the full source repo
- run the same launcher/runtime from source
- bind that install to one repo

Example:

```bash
git clone <repo>
cd agentic
node super_turtle/bin/superturtle.js bind /path/to/project-repo
```

The runtime contract is the same in both modes: one installation, one bound repo.

## Bound Repo Rules

The bound repo is the nearest Git root for the chosen project path.

Rules:

1. Teleport only works when SuperTurtle has an explicit bound repo.
2. The sync root is the bound repo root, not the current subdirectory.
3. Nothing above the repo root is ever synced.
4. Nothing outside the repo root is ever synced.
5. Binding must be refused for clearly unsafe roots:
   - `/`
   - the user's home directory
   - any path explicitly marked as unsafe by policy
6. Teleport must fail closed if the bound repo cannot be resolved.

## Transfer Scope

Teleport moves two distinct things:

### 1. Repo content

This is the continuously synced or pre-cutover synced project content inside the bound repo.

Default inclusion rule:

- include Git-tracked files inside the bound repo

Default exclusion rule:

- exclude files and directories that are rebuildable, machine-local, or secret

Default exclusions:

- `.git/`
- `node_modules/`
- `.venv/`
- package-manager caches
- build outputs
- logs
- editor temp files
- `.env`
- machine-local credential files

### 2. Runtime handoff state

This is not generic repo sync. It is an explicit SuperTurtle continuity bundle.

Examples:

- selected `.superturtle` runtime state
- queue or handoff artifacts
- session continuity metadata needed for teleport semantics

This bundle is transferred atomically at teleport time, not mirrored as part of the background repo sync loop.

## Untracked Files

Git defines the boundary, but not every important file is necessarily tracked.

Policy:

- tracked files are included by default
- untracked files are excluded by default
- specific untracked files may be included only through an explicit allowlist manifest

That manifest should live inside the bound repo and be human-reviewable.

Candidate path:

```text
.superturtle/teleport-manifest.json
```

The manifest is for safe project-local extras, not for secrets or large caches.

## Dependencies And Environment

Dependencies should not be synced as raw directories.

Policy:

- rebuild dependencies on the VM from lockfiles
- keep dependency installation reproducible
- treat secrets as separately injected runtime inputs, not synced files

Examples:

- `bun install --frozen-lockfile`
- Python environment recreation from the declared lock/setup path
- secrets loaded from operator-managed environment or a secrets manager

This avoids trying to mirror `node_modules`, venvs, package caches, or local auth files.

## VM Runtime Layout

The VM should host the same bound repo concept at a fixed remote path.

Example:

```text
/home/superturtle/project
```

Important property:

- local path and remote path may differ
- repo identity is logical, not path-equal
- sync is always repo-root to repo-root

## Ownership And Safety

Repo sync alone is not teleport.

Teleport still requires:

1. source runtime is idle
2. runtime handoff bundle is exported
3. destination repo content is in sync
4. destination dependencies are healthy
5. destination runtime starts successfully
6. ownership flips only after health verification
7. source stops only after the destination is authoritative

Rollback requirement:

- if destination start or verification fails, ownership must stay with the source
- repo sync must not delete or overwrite files outside the bound repo
- return-to-local must never perform destructive whole-machine sync

## Non-Goals

Teleport is not:

- whole-machine backup
- home-directory replication
- generic bidirectional sync for arbitrary folders
- secret replication
- dependency-folder mirroring

## Practical Product Consequences

This spec implies:

1. `superturtle` needs an explicit bind/init concept.
2. `start`, `status`, and `teleport` should resolve through the bound repo, not through the current shell directory alone.
3. Teleport should be refused for unsafe repo roots.
4. VM teleport should operate on repo content plus the explicit handoff bundle.
5. Any future background sync layer should be repo-scoped.

## Recommended Next Implementation Steps

1. Add a persisted "bound repo" config for the installation.
2. Define the repo safety validator.
3. Define the first version of `.superturtle/teleport-manifest.json`.
4. Split transfer logic into:
   - repo sync
   - runtime handoff bundle
5. Make VM teleport use this repo-bound contract end to end.
