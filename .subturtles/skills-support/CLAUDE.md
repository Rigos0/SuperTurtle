# Current task

Update `agents.py` `Claude` class to accept `add_dirs: list[str]` param, include `--add-dir` flags in all `claude` CLI calls (plan + execute).

# End goal with specs

Enable SubTurtles to load Claude Code skills on demand. The meta agent decides which skills a task needs and specifies them at spawn time. The SubTurtle's Claude session gets those skills loaded automatically.

## How it works

1. Meta agent runs: `./super_turtle/subturtle/ctl start my-feature --type yolo --skill frontend --skill testing`
2. `ctl` passes the skill names through to the SubTurtle Python process
3. The SubTurtle loop (`agents.py`) adds `--add-dir` flags to its `claude` CLI calls, pointing at a directory structure where the skills are properly placed under `.claude/skills/`
4. Claude Code discovers the skills automatically and the SubTurtle can use them

## Architecture

Skills are standard Claude Code skill folders (`SKILL.md` + optional supporting files). They live at:

```
super_turtle/skills/
├── .claude/
│   └── skills/
│       ├── frontend/
│       │   └── SKILL.md
│       ├── remotion/
│       │   └── SKILL.md
│       └── testing/
│           └── SKILL.md
```

The `super_turtle/skills/` directory is structured so it can be passed directly via `--add-dir super_turtle/skills` and Claude Code will discover everything under `.claude/skills/` within it.

When a SubTurtle is spawned with `--skill frontend`, the loop passes `--add-dir super_turtle/skills` to the `claude` CLI. Claude Code loads the skills automatically. If no `--skill` flags are given, no `--add-dir` is added — existing behavior unchanged.

Note: we use a single `--add-dir` for all skills (they all live under the same `.claude/skills/` tree). The `--skill` flag on `ctl` is for documentation/intent — so the meta agent is explicit about which skills it expects, and we could add per-skill filtering later.

## What "done" looks like

- `ctl start` accepts `--skill <name>` flags (repeatable)
- Skills are passed through to the SubTurtle Python process as arguments
- `agents.py` `Claude` class accepts an optional `add_dirs` parameter and includes `--add-dir` in its CLI calls
- The SubTurtle loop (`__main__.py`) reads skill args and passes `add_dirs` to `Claude`
- `super_turtle/skills/.claude/skills/frontend/SKILL.md` exists with a solid frontend skill (React/Next.js patterns, component architecture, CSS, accessibility)
- `super_turtle/skills/.claude/skills/remotion/SKILL.md` exists with a Remotion video skill
- `ctl status` and `ctl list` show active skills
- META_SHARED.md updated: document `--skill` usage, when to attach which skills
- End-to-end verification: spawn a SubTurtle with `--skill frontend`, confirm skills appear in its Claude session

## Constraints

- Don't break existing SubTurtle behavior — `--skill` is optional
- Use Claude Code's native `--add-dir` mechanism — no custom skill loading
- Skills directory structure must follow Claude Code conventions (`.claude/skills/<name>/SKILL.md`)
- The `--add-dir` flag is added to ALL claude CLI calls in the loop (plan, execute, groom) so skills are available throughout

# Roadmap (Completed)

(none yet)

# Roadmap (Upcoming)

- **Milestone: Skills infrastructure** — ctl flag, agent wiring, starter skills, docs

# Backlog

- [x] Add `--skill <name>` flag parsing to `ctl start` — repeatable flag, store skill names, pass them to the Python SubTurtle process as extra args
- [x] Update SubTurtle `__main__.py` entry point to accept `--skills` argument and pass it through to the loop functions
- [ ] Update `agents.py` `Claude` class to accept `add_dirs: list[str]` param, include `--add-dir` flags in all `claude` CLI calls (plan + execute) <- current
- [ ] Update all loop functions (yolo, slow, yolo-codex) to pass `add_dirs` through to their Claude/Codex instances
- [ ] Create `super_turtle/skills/.claude/skills/frontend/SKILL.md` — React/Next.js best practices, component patterns, styling, accessibility, testing
- [ ] Create `super_turtle/skills/.claude/skills/remotion/SKILL.md` — Remotion video composition, rendering, asset management
- [ ] Update `ctl status` and `ctl list` to show active skills (read from subturtle.meta)
- [ ] Update META_SHARED.md: document `--skill` usage, list available skills, guidance on when to attach which skills
- [ ] Verify end-to-end: spawn a test SubTurtle with `--skill frontend`, check logs to confirm skills are loaded
