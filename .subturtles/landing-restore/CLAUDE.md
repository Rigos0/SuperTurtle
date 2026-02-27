# Current Task

Restore `landing/app/globals.css` from git commit a67778f.

# End Goal with Specs

The landing page at `landing/app/page.tsx` and `landing/app/globals.css` should:
1. Show the actual Super Turtle project landing page (NOT the snake game currently there)
2. Use the Epify Puzlo red-forward palette from commit a67778f
3. Say "Super Turtle" consistently (not "agentic", not "Super Turtle System")
4. Accurately describe what the system does
5. Be responsive and polished on mobile and desktop
6. Keep existing components: StickyNav, TypedTerminal, SectionDivider (they still exist at landing/components/)

# How to restore

Run these two git commands to restore the files:
```
git show a67778f:landing/app/page.tsx > landing/app/page.tsx
git show a67778f:landing/app/globals.css > landing/app/globals.css
```

Then update the copy in page.tsx:
- Hero pill badge: "Super Turtle" (not "Super Turtle System")
- Hero headline: "Build in silence, ship in waves" (keep this)
- Hero description: "Super Turtle orchestrates autonomous SubTurtles to execute multi-step work with structured supervision and audit-ready commits."
- Change any remaining "agentic" references to "Super Turtle"
- The terminal demo should show realistic `ctl spawn` commands (the version from a67778f already does this — verify it's correct)
- Loop types: slow (thorough), yolo (direct), yolo-codex (cost-aware) — verify these match
- GitHub CTA link: use "#" (no public repo yet)

# What Super Turtle is (for accurate copy)

An autonomous coding system you talk to on Telegram. You say what you want built — the system decomposes it, spawns workers (SubTurtles), supervises them silently, and delivers results.

Player-coach model: Meta Agent handles quick tasks directly, delegates bigger work to SubTurtles. Silent by default — only notifies on milestones, completion, errors, stuck states.

Four loop types: slow (Plan→Groom→Execute→Review), yolo (single Claude call), yolo-codex (single Codex call, cheapest, default), yolo-codex-spark (Codex Spark, fastest).

# Files to modify

- `landing/app/page.tsx` — restore from a67778f, then update branding
- `landing/app/globals.css` — restore from a67778f (no changes needed after restore)

# DO NOT modify these files

- `landing/components/StickyNav.tsx`
- `landing/components/TypedTerminal.tsx`
- `landing/components/SectionDivider.tsx`
- `landing/app/layout.tsx`

# Backlog

- [x] Restore page.tsx from commit a67778f: `git show a67778f:landing/app/page.tsx > landing/app/page.tsx`
- [ ] Restore globals.css from commit a67778f: `git show a67778f:landing/app/globals.css > landing/app/globals.css` <- current
- [ ] Update hero pill badge to "Super Turtle" (not "Super Turtle System")
- [ ] Replace any "agentic" references with "Super Turtle" in page.tsx
- [ ] Verify terminal demo, loop types, and feature descriptions are accurate
- [ ] Commit the restored and updated landing page
