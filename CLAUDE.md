# Current task

Rewire CLAUDE/AGENTS guard and restore a valid planning template after repo restructure. <- current

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
- [ ] Verify guard behavior from orchestrator-run Claude sessions <- current
- [ ] Add regression test for non-target files remaining unguarded

