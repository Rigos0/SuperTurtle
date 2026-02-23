# Current task

Confirm PreToolUse guard hook fires in live orchestrator-spawned (`-p` mode) sessions.

# End goal with specs

Maintain a lean autonomous workspace where root stays clean, orchestration is reliable, and planning state remains consistently valid and enforceable.

# Roadmap (Completed)

- Moved active components under `super_turtle/`
- Updated orchestrator entrypoints and control script paths

# Roadmap (Upcoming)

- Add small root wrappers if command ergonomics need to be preserved
- Tighten guard tests around symlink/path edge cases

# Backlog

- [x] Repoint Claude PreToolUse hook to the moved guard script
- [x] Extend guard validation target set to include `AGENTS.md`
- [x] Verify guard behavior from orchestrator-run Claude sessions (52/52 tests pass)
- [ ] Confirm hook fires in a live orchestrator-spawned session <- current
- [ ] Add regression test for non-target files remaining unguarded

