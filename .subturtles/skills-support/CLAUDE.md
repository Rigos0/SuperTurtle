# Current task

Verify end-to-end: spawn a test SubTurtle with the frontend-design skill, check logs to confirm the skill loads

# End goal with specs

Enable SubTurtles to load Claude Code skills on demand. The meta agent decides which skills a task needs and specifies them at spawn time. The SubTurtle's Claude session gets those skills loaded automatically.

## How it works

1. Meta agent runs: `./super_turtle/subturtle/ctl start my-feature --type yolo --skill frontend-design`
2. `ctl` passes the skill names through to the SubTurtle Python process
3. The SubTurtle loop (`agents.py`) adds `--add-dir` flags to its `claude` CLI calls for custom skills
4. Claude Code discovers the skills automatically and the SubTurtle can use them

## IMPORTANT: Two-tier skill system

There are TWO kinds of skills:

1. **Official plugins from the Anthropic registry** (e.g. `frontend-design`, `code-review`, `security-guidance`). Install via `claude plugin install <name>` CLI command (non-interactive). These are globally available after install — no `--add-dir` needed. **DO NOT hand-write skills that already exist in the registry.**

2. **Custom project skills** for domain-specific needs not covered by official plugins (e.g. Remotion video). These live at `super_turtle/skills/.claude/skills/<name>/SKILL.md` and are loaded via `--add-dir super_turtle/skills`.

## What's already done (by the previous run — DO NOT REDO)

- [x] `ctl start` accepts `--skill <name>` flags (repeatable)
- [x] Skills passed through to Python process
- [x] `agents.py` Claude class has `add_dirs` support with `--add-dir` in CLI calls
- [x] All loop functions pass `add_dirs` through

## What's wrong and needs fixing

- The previous run hand-wrote `super_turtle/skills/.claude/skills/frontend/SKILL.md` — this is WRONG. The official `frontend-design` plugin exists in the Anthropic registry and should be installed instead. The hand-written file has already been deleted by the meta agent.
- The previous run also hand-wrote a Remotion skill — check if it's reasonable quality. Remotion doesn't have an official plugin so a custom skill IS correct for that one.

# Roadmap (Completed)

- ctl flag parsing, Python wiring, agent --add-dir support

# Roadmap (Upcoming)

- Official plugin install, skill system docs, e2e verify

# Backlog

- [x] Add `--skill <name>` flag parsing to `ctl start`
- [x] Update SubTurtle `__main__.py` to accept `--skills` argument
- [x] Update `agents.py` Claude class with `add_dirs` support
- [x] Update all loop functions to pass `add_dirs` through
- [x] Install the official `frontend-design` plugin from the Anthropic registry. Use the `claude` CLI to install it non-interactively. Figure out the exact command (try: `claude plugin install frontend-design`, or `claude /plugin install frontend-design`). Verify it installed successfully.
- [x] Review the hand-written Remotion skill at `super_turtle/skills/.claude/skills/remotion/SKILL.md` — is it solid? If not, improve it. This one IS correctly custom since no official Remotion plugin exists.
- [x] Update `ctl status` and `ctl list` to show active skills in subturtle.meta
- [x] Update META_SHARED.md: document the two-tier skill system (official plugins installed globally via registry vs custom skills via `--add-dir`), list available official plugins worth installing (frontend-design, code-review, security-guidance, etc.), document `--skill` flag usage, note that skills stay out of the meta agent's context
- [ ] Verify end-to-end: spawn a test SubTurtle with the frontend-design skill, check logs to confirm the skill loads <- current
