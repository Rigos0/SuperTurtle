# Current Task

Spawn command end-to-end verification complete.

# End goal with specs

Verify that `ctl spawn` command works correctly:
- Creates workspace directory
- Writes CLAUDE.md from state file
- Creates AGENTS.md symlink
- Spawns SubTurtle process
- Registers cron supervision job
- Can be stopped cleanly

# Backlog

- [x] Verify spawn works <- current
