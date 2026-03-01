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
Debug and fix Codex MCP tool transport failures (`Transport closed`) in the MetaAgent runtime.

## End goal with specs
Codex-driven MetaAgent calls can successfully execute MCP tools (`send_turtle`, `bot_control`, `ask_user`, `pino_logs`) without transport crashes, with regression tests passing under Bun.

## Roadmap (Completed)
- (none yet)

## Roadmap (Upcoming)
- Reproduce transport failure in Codex path with deterministic local test
- Identify root cause in Codex session/MCP config wiring
- Implement fix and add focused regression tests
- Verify MCP tools execute end-to-end in Codex mode
- Summarize fix and residual risks

## Backlog
- [ ] Spawn dedicated SubTurtle for Codex MCP transport debugging <- current
- [ ] Reproduce `Transport closed` from Codex tool calls
- [ ] Patch MCP wiring/lifecycle to prevent transport shutdown
- [ ] Add regression coverage for Codex MCP tool invocation path
- [ ] Run targeted tests and report results

## Notes
- Priority shifted from coverage expansion to MCP transport stability for Codex mode.
