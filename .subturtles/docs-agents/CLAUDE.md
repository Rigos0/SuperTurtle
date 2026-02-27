## Current Task
Write docs/subturtles/overview.mdx.

## End Goal with Specs
Create 9 documentation pages covering SubTurtles and the Meta Agent. Pages go in `docs/subturtles/` and `docs/meta/` as `.mdx` files. Use Mintlify MDX syntax (supports `<Steps>`, `<Card>`, `<CardGroup>`, `<Tip>`, `<Warning>`, `<Note>`, `<Info>`, `<Accordion>`, `<Tabs>`, `<Tab>`).

**Style guidance:**
- Developer-focused, concise, lots of code blocks
- Reference super_turtle/meta/META_SHARED.md and super_turtle/subturtle/README.md for accuracy
- This is the most architecturally interesting part of the project — explain the concepts well

**SubTurtle pages (docs/subturtles/):**

1. `overview.mdx` — What SubTurtles are (autonomous background coding agents). The workspace structure (.subturtles/<name>/). How they read/write their own CLAUDE.md. Self-completion via Loop Control STOP directive. Timeout and watchdog.
2. `loop-types.mdx` — Detailed comparison of all 4 loop types:
   - slow: Plan → Groom → Execute → Review (4 agent calls per iteration, most thorough)
   - yolo: Single Claude call per iteration (fast, good for well-scoped tasks)
   - yolo-codex: Same as yolo but uses Codex (cheapest, default)
   - yolo-codex-spark: Same as yolo-codex but forces Codex Spark (fastest iterations)
   - When to use each. Cost/speed tradeoffs.
3. `ctl-commands.mdx` — Full CLI reference for the ctl script:
   - spawn (with --type, --timeout, --state-file, --cron-interval, --skill flags)
   - start (low-level, no state seeding)
   - stop (graceful + kill watchdog + cron cleanup)
   - status (running? type, time elapsed/remaining)
   - logs (tail recent output)
   - list (all SubTurtles + status)
   - Examples for each command.
4. `state-files.mdx` — CLAUDE.md format: Current Task, End Goal with Specs, Backlog (checkbox format with <- current marker), Loop Control section. How meta agent writes it before spawning. How SubTurtle reads/updates it. AGENTS.md symlink.
5. `skills.mdx` — Skills system: what --skill does, how skills are loaded, the Remotion example (remotion-best-practices), creating custom skills.

**Meta Agent pages (docs/meta/):**

6. `overview.mdx` — What the Meta Agent is (conversational interface, player-coach). How it decides to code directly vs delegate. The two-layer architecture (Meta Agent + SubTurtles). Voice mode and transcription handling.
7. `supervision.mdx` — Cron-based autonomous supervision. Silent-first default. When it notifies (Finished, Milestone, Stuck, Error). Notification format templates. How to progress to next task (stop → update state → respawn). The autonomous conveyor belt concept.
8. `task-decomposition.mdx` — How "build X" gets decomposed into parallel SubTurtles. Dependency handling (A before B). Multi-SubTurtle spawn reliability protocol. Limits and naming conventions.
9. `resource-management.mdx` — Usage-aware routing. The decision matrix (Claude Code usage × Codex usage → which loop type). How cron frequency adjusts with usage. Default to yolo-codex. When to use Claude-heavy loops.

## Backlog
- [x] Read super_turtle/meta/META_SHARED.md for content
- [x] Read super_turtle/meta/DECOMPOSITION_PROMPT.md
- [x] Read super_turtle/subturtle/README.md
- [ ] Write docs/subturtles/overview.mdx <- current
- [ ] Write docs/subturtles/loop-types.mdx
- [ ] Write docs/subturtles/ctl-commands.mdx
- [ ] Write docs/subturtles/state-files.mdx
- [ ] Write docs/subturtles/skills.mdx
- [ ] Write docs/meta/overview.mdx
- [ ] Write docs/meta/supervision.mdx
- [ ] Write docs/meta/task-decomposition.mdx
- [ ] Write docs/meta/resource-management.mdx
- [ ] Commit

## Notes
- Repo root: /Users/Richard.Mladek/Documents/projects/agentic
- Key source files: super_turtle/meta/META_SHARED.md, super_turtle/meta/DECOMPOSITION_PROMPT.md, super_turtle/subturtle/README.md, super_turtle/subturtle/ctl (the script itself)
- docs.json navigation already points to these page slugs
- Use .mdx extension
