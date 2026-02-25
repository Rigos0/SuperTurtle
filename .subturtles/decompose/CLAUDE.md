# Current Task
All backlog items complete.

# End Goal with Specs
Two deliverables:

1. **New file: `super_turtle/meta/DECOMPOSITION_PROMPT.md`** — a reference guide the meta agent uses when decomposing tasks. Contains:
   - When to decompose (multi-feature requests, >3 backlog items, parallel-safe work)
   - When NOT to decompose (simple fixes, sequential dependencies, single-file changes)
   - Decomposition patterns with examples:
     - Frontend feature → component-per-SubTurtle
     - API work → endpoint-per-SubTurtle
     - Full-stack → frontend + backend + tests SubTurtles
   - Max 5 SubTurtles per request
   - Each SubTurtle gets 3-7 backlog items
   - Naming convention: `<project>-<feature>` (e.g., `dashboard-search`, `dashboard-filters`)

2. **Update `super_turtle/meta/META_SHARED.md`** — add a "## Task decomposition" section after "## Starting new work" that:
   - Documents the decomposition authority
   - References DECOMPOSITION_PROMPT.md
   - Shows the user-facing flow: user says "build X" → meta agent decomposes → spawns parallel SubTurtles → reports what's running
   - Defines dependency handling: if B depends on A, spawn A first, queue B

Acceptance criteria:
- DECOMPOSITION_PROMPT.md exists with 3+ worked examples
- META_SHARED.md has decomposition section
- Examples are concrete (not abstract)

# Backlog
- [x] Read META_SHARED.md to understand current structure and find insertion point
- [x] Create `super_turtle/meta/DECOMPOSITION_PROMPT.md` with decomposition guide and examples
- [x] Add "## Task decomposition" section to META_SHARED.md after "## Starting new work"
- [x] Commit with descriptive message

## Loop Control
STOP
