# Current task

Verify end-to-end: spawn a test SubTurtle with the frontend-design skill, check logs to confirm the skill loads.

# End goal with specs

Enable SubTurtles to load Claude Code skills on demand. The meta agent decides which skills a task needs and specifies them at spawn time.

## CRITICAL: Do NOT hand-write skills that already exist

Skills are published by their creators and installed via package managers. NEVER write a skill from scratch if one exists. Always search first.

**How to install skills:**
- **Anthropic official plugins:** `claude plugin install <name>` (e.g. `frontend-design`)
- **Third-party skills via npx:** `npx skills add <package>` (e.g. `npx skills add remotion-dev/skills`)
- **Custom project skills:** Only write your own if nothing exists anywhere.

## What's already done (DO NOT REDO)

- [x] `ctl start` accepts `--skill <name>` flags (repeatable)
- [x] Skills passed through to Python process
- [x] `agents.py` Claude class has `add_dirs` support
- [x] All loop functions pass `add_dirs` through
- [x] `frontend-design` official plugin installed
- [x] `ctl status`/`list` show active skills
- [x] META_SHARED.md updated with skills docs

## What was wrong and has been fixed by meta agent

- Hand-written frontend skill was deleted — official `frontend-design` plugin installed instead ✓
- Hand-written Remotion skill was deleted — official Remotion skill needs to be installed (see backlog)

# Backlog

- [x] Add `--skill <name>` flag parsing to `ctl start`
- [x] Update SubTurtle `__main__.py` to accept `--skills` argument
- [x] Update `agents.py` Claude class with `add_dirs` support
- [x] Update all loop functions to pass `add_dirs` through
- [x] Install the official `frontend-design` plugin
- [x] Update `ctl status` and `ctl list` to show active skills
- [x] Update META_SHARED.md with skills documentation
- [x] Install the official Remotion skill: run `npx skills add remotion-dev/skills`. This installs to `.claude/skills/remotion-best-practices/`. Verify it installed successfully by checking that directory exists. DO NOT hand-write a Remotion skill — the official one exists.
- [x] Remove the hand-written Remotion skill directory if it still exists at `super_turtle/skills/.claude/skills/remotion/` (meta agent may have already done this)
- [ ] Verify end-to-end: spawn a test SubTurtle with the frontend-design skill, check logs to confirm the skill loads <- current
