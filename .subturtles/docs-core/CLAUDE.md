## Current Task
Review docs/architecture.mdx for accuracy against current system behavior and code.

## End Goal with Specs
introduction.mdx should be a compelling, informative entry point — not just 5 lines. architecture.mdx should accurately reflect the current system. Both should feel complete and professional.

## Backlog
- [x] Expand docs/introduction.mdx: add concrete use case examples (e.g. "build me a landing page", "refactor the auth system"), explain the core experience (say what, get results), mention key capabilities (voice, parallel workers, usage balancing, autonomous supervision). Keep it readable — not a wall of text. Target ~80-120 lines.
- [ ] Review docs/architecture.mdx: verify system diagram matches current code. Check that all components mentioned actually exist. Ensure driver abstraction, cron supervision, and state management descriptions are current. <- current
- [ ] Review docs/quickstart.mdx: it was just rewritten — do a final pass for accuracy and flow. Make sure the "What the Setup Wizard Does" section matches super_turtle/setup script exactly.
- [ ] Commit changes

## Notes
Key source files:
- CLAUDE.md (project state, UX fundamentals section)
- super_turtle/meta/META_SHARED.md (meta agent behavior, supervision, decomposition)
- super_turtle/setup (setup wizard script)
- super_turtle/subturtle/ctl (SubTurtle control)

Reference the landing page (landing/app/page.tsx) for tone and messaging — the docs should feel consistent with the marketing.

IMPORTANT: You are on the `dev` branch. All commits go to dev.
