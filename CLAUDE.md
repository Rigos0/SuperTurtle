# Super Turtle — Dev Branch

You are Super Turtle 🐢 — a Telegram bot that is actively developing itself. This is the dev branch where the actual building happens.

---

## Branch Merge Instructions (dev → main)

`CLAUDE.md` is **branch-specific**: `main` has the public onboarding runbook, `dev` has the working developer state. The `.gitattributes` file uses Git's `merge=ours` driver to prevent merges from overwriting the target branch's `CLAUDE.md`.

### One-time setup (per clone)

Every developer who clones this repo must run this once:

```bash
git config merge.ours.driver true
```

This registers the "ours" merge driver locally. Without it, Git won't know how to handle the `merge=ours` attribute and will fall back to default (which could overwrite).

### Merging dev → main

Always use `--no-ff` to ensure the merge driver is invoked:

```bash
git checkout main
git merge --no-ff dev
git push origin main
```

This will merge all code changes from dev into main, but `CLAUDE.md` on main will stay untouched.

### Merging main → dev (syncing back)

Same pattern — dev's `CLAUDE.md` is preserved:

```bash
git checkout dev
git merge --no-ff main
```

### Why `--no-ff` is required

Fast-forward merges skip the merge machinery entirely (no merge commit = no merge drivers). If Git can fast-forward, the `merge=ours` rule is never evaluated and `CLAUDE.md` gets overwritten. Always use `--no-ff`.

### If something goes wrong

If `CLAUDE.md` does get overwritten during a merge:

```bash
# Restore the version from before the merge
git checkout HEAD~1 -- CLAUDE.md
git commit -m "restore branch-specific CLAUDE.md"
```

---

## Current task
Prepare `dev` for promotion to `main` after MCP consolidation and resume UX updates.

## End goal with specs
Clean, releasable `dev` branch:
- MCP server layout consolidated to 2 servers (`send-turtle`, `bot-control`)
- Unified `/resume` UX (Claude + Codex + continue-current) working
- Command docs aligned with runtime behavior
- `bun run typecheck` and `bun test` green

## Roadmap (Completed)
- ✅ Fix Codex MCP `Transport closed` bug (stdout transport pollution from MCP subprocess logs)
- ✅ Add MCP transport regression tests
- ✅ Consolidate MCP servers (`ask_user` + `pino_logs` into `bot-control`)
- ✅ Remove stale MCP server references and old server directories
- ✅ Unified `/resume` picker plus `resume_current` callback behavior
- ✅ Docs update for `/resume`, `/looplogs`, `/pinologs`

## Roadmap (Upcoming)
- Fix remaining brittle test fixture dependency on ephemeral `.subturtles/*` state
- Run final validation pass on `dev`
- Push `dev` and merge to `main` with non-fast-forward merge

## Backlog
- [x] Sync `dev` with latest `main` (non-ff merge)
- [ ] Remove/replace tests that depend on archived SubTurtle paths <- current
- [ ] Confirm `bun run typecheck` + `bun test` all green
- [ ] Push `dev` to origin
- [ ] Merge `dev` → `main` and run post-merge verification

## Notes
- CI on `main` runs typecheck + unit tests; Codex integration tests are gated behind `CODEX_INTEGRATION=1`.
