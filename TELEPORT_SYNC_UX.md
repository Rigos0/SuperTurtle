# Teleport Git Authority UX

## Goal

Define a safe user-facing model for `/teleport` and `/home` where the E2B sandbox can act freely, but remote changes never overwrite another live checkout directly.

## Product Stance

- Git is the source of truth.
- The authority is a Git repo, not a mutable working directory.
- The authority may live on the local machine or in a managed sandbox, depending on product mode.
- The E2B sandbox may be disposable or authoritative depending on mode, but cross-boundary returns should still happen through Git semantics.

This means `/home` must not "sync files back" in the naive sense.

## Product Modes

### 1. Local-authoritative teleport

This is the current BYO local install model.

- the authoritative repo lives on the user's machine
- `/teleport` syncs runtime handoff state and ensures the remote workspace is available through Git
- `/home` brings remote work back as Git history, not as direct file edits

### 2. Managed sandbox-only

This is the future fully managed model for users who bring their own Codex subscription and work only in the sandbox.

- the authoritative repo lives in the managed sandbox
- there may be no local repo involved at all
- no file return to a PC is required
- the user can stay entirely in the sandbox workflow

The key invariant shared by both modes is:

- do not move remote changes into another active checkout as raw file writes
- move them as Git-native history when crossing an authority boundary

## Core Model

- `/teleport` routes work toward the sandbox runtime.
- The remote turtle works in a sandbox workspace and may make arbitrary edits there.
- SuperTurtle should sync only runtime continuity state, not arbitrary project files.
- Project content should move via Git operations performed by turtles, not by a custom file-sync layer.
- When work crosses back into another authoritative repo, it should cross back as Git history, not as direct filesystem edits.
- A receiving checkout stays untouched unless the human explicitly decides to merge, cherry-pick, or check out the returned branch.

## Minimal Transport Model

The clean split is:

- SuperTurtle syncs only the runtime handoff bundle
- turtles themselves move project work through Git

That means the teleport protocol is responsible for:

- session continuity metadata
- ownership handoff state
- selected portable runtime state under `.superturtle`
- queue or transport artifacts needed for cutover

It is not responsible for:

- general project file mirroring
- reconciling arbitrary local and remote working tree states
- inventing a second sync system beside Git

## What In `.superturtle` Should Sync

The answer should be "a curated subset," not "the whole directory."

Good candidates:

- `.superturtle/teleport/`
- handoff state
- selected session continuity files
- other explicitly portable runtime metadata

Bad candidates:

- `.superturtle/.env`
- local auth caches
- logs
- machine-local secrets
- bulky ephemeral files

So the real rule should be:

- sync a defined portable runtime bundle that happens to live under `.superturtle`
- do not sync the raw `.superturtle` directory blindly

## Safety Boundary

The main risk is not teleport itself. The main risk is letting remote output write directly into some other authoritative checkout after the sandbox has had broad autonomy.

So the boundary should be:

- remote can change its own workspace freely
- remote cannot directly mutate another authoritative checkout on return
- the receiving side should only get a Git artifact that the human can inspect and merge deliberately

## `/teleport` UX

### User meaning

In local-authoritative mode, `/teleport` means:

- sync runtime handoff state and route control to a remote workspace obtained through Git
- send control to the remote turtle

It does not mean:

- local and remote now mirror each other continuously

### Local state capture

`/teleport` should capture a clear Git base for the remote session.

Preferred behavior:

- keep teleport itself focused on runtime handoff, not file sync
- prefer Git-visible project state
- do not mutate the user's current branch just to prepare teleport

Implementation shape can vary, but the product contract should be:

- the remote turtle starts from a known Git base
- if project changes must move across the boundary, turtles move them through Git
- teleport itself does not promise arbitrary working tree replication

### Success copy

Example:

```text
Teleported to E2B
- Runtime handoff synced
- Remote workspace ready through Git
- Local repo remains the source of truth
- Remote changes will come back as a Git branch on /home
```

In managed sandbox-only mode, `/teleport` may collapse into pure ownership cutover:

```text
Teleported to E2B
- Telegram is now routed to your managed sandbox
- This sandbox repo is your active source of work
```

## Remote Workspace Model

In local-authoritative mode, the remote sandbox should behave like a temporary bot-owned branch/workspace:

- it can be dirty
- it can contain extra commits
- it can have uncommitted changes
- it can be paused and resumed

That is acceptable because the sandbox is not authoritative in that mode.

In managed sandbox-only mode, the sandbox workspace is authoritative for the session. The same Git-first rules still apply if work later needs to move elsewhere.

## `/home` UX

### User meaning

In local-authoritative mode, `/home` means:

- return Telegram ownership to the PC
- package remote work into a Git-native artifact
- import that work into the local repo without touching the current checkout

### Required rule

`/home` should never auto-merge remote work into the user's current branch.

It should never:

- overwrite local files directly
- auto-checkout a returned branch
- auto-merge bot changes into the current branch
- silently resolve conflicts inside the local checkout

### Clean return

If the remote workspace has no changes since teleport:

```text
Back on your PC
- No remote Git changes to import
```

### Changed return

If the remote workspace changed:

- normalize the remote state into Git history
- import it locally as a branch
- leave the current checkout unchanged

Example:

```text
Back on your PC
- Imported remote work as branch superturtle/teleport-return-<timestamp>
- Your current checkout was left unchanged
```

## Git Return Contract

For local-authoritative teleport, the return path should be Git-native end to end.

Recommended contract:

- remote work is captured into one or more commits on a remote branch
- `/home` exports that branch as a Git bundle or equivalent Git transport artifact
- local imports it as a new local branch
- the human reviews and merges manually

This keeps the import auditable and reversible.

## What To Do With Uncommitted Remote Changes

The sandbox may be dirty at `/home`.

The safest contract is:

- if remote has uncommitted changes, capture them into a bot-authored commit on the return branch before export
- import that branch locally
- tell the user that the branch includes uncommitted remote workspace changes captured at return time

That keeps the return path Git-only even when the sandbox did not finish in a clean commit state.

## Conflict Model

The old file-sync conflict model is the wrong abstraction here.

With Git return, the conflict surface moves to a place the user already understands:

- review the returned branch
- diff it against the local branch
- merge, rebase, cherry-pick, or discard intentionally

So Phase 1 should not implement file-level conflict handling on `/home`.

Phase 1 should instead guarantee:

- local checkout remains untouched
- remote work is imported as a separate branch
- merge decisions are left to the human

## Managed Sandbox-Only UX

For fully managed users who work only in the sandbox:

- there is no "sync back to my machine" step
- the sandbox repo is the active authority
- `/home` is either unavailable or means "leave remote control mode" rather than "return files"
- if the product later offers export from managed mode, that export should still be Git-native

That export could be:

- push to the user's Git remote
- download a Git bundle
- create a branch in a linked upstream repo

What it should not be:

- blindly writing files into a local checkout on some client machine

## Status Surface

`/status` should expose the return state clearly.

Examples:

```text
Teleport: remote
Authority: local git repo
Return mode: git branch import
Remote changes: 5 files not yet imported
```

Or after import:

```text
Teleport: local
Authority: local git repo
Last return branch: superturtle/teleport-return-<timestamp>
```

Managed mode example:

```text
Teleport: remote
Authority: managed sandbox repo
Export mode: git push or bundle
```

## MVP Recommendation

- Keep `/teleport` simple: sync runtime continuity state and cut over ownership.
- Keep project transfer out of teleport-specific file sync.
- Let turtles handle project movement through Git.
- Make cross-boundary returns Git-only.
- Do not write remote file changes into another live working tree.
- Do not auto-merge returned work.
- In local-authoritative mode, import returned work as a named local branch.
- In managed mode, keep the sandbox repo authoritative and export through Git only when needed.

## Open Design Question

The remaining product choice is how strict to be on `/teleport` in local-authoritative mode when the local checkout is dirty.

Two viable options:

1. Require a Git-visible state before teleport and let turtles help the user commit, branch, or push.
2. Add a later escape hatch for creating an explicit temporary Git snapshot for teleport.

My bias is to start with option 1 because it keeps the architecture simple: teleport moves runtime state, and Git moves project state.
