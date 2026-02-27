## Current Task
All backlog items complete.

## End Goal with Specs
The landing page at `landing/app/page.tsx` has compelling, non-repetitive copy that highlights the project's real differentiators. Style: factual, simple, catchy. No marketing fluff.

**Key value props to cover (each mentioned ONCE, in the right place):**
1. Wraps your existing Claude Code or Codex subscription — no API tokens needed
2. Agnostic between Claude and Codex — works with either, auto-routes between them
3. Telegram interface — voice and text, just say what you want
4. Autonomous workers that loop (read state → code → test → commit) until done
5. Parallel task decomposition — breaks big asks into concurrent workers
6. Quiet by default — only messages you on milestones, errors, completion
7. Built with itself — Super Turtle builds and maintains Super Turtle (dogfooding)
8. Screenshots of sites via Playwright for visual QA
9. Live preview links via Cloudflare tunnels for frontend work
10. Cron supervision — detects stuck workers, restarts them automatically
11. Self-stop — workers exit cleanly when done, no orphan processes
12. Four execution modes trading depth vs speed vs cost
13. Git-native — every change is a commit with a clear message

**Content rules:**
- Each selling point appears ONCE across the entire page — zero repetition
- Simple, factual language. No "revolutionary", "cutting-edge", "seamless", "leverage"
- Short sentences. Active voice. Concrete examples over abstract claims
- The hero lead should hook in one sentence — what it IS, not what it does
- Section order should build a narrative: what → why → how → modes → get started
- Keep the existing visual structure (pillars, flow steps, mode cards, step cards)
- The Telegram chat preview in the hero stays as-is (chat bubbles, not terminal)

**What NOT to change:**
- Don't touch CSS/styles — only edit content/copy in page.tsx
- Don't change component imports or the JSX structure (sections, grids, class names)
- Don't remove the TypedTerminal import if it's still there (it was removed, that's fine)
- Keep the tg-chat component markup exactly as-is

**Files:**
- `landing/app/page.tsx` — the ONLY file to edit

**Current section structure (keep this order or reorder if it tells a better story):**
1. Hero (headline, lead, bullets, CTAs, Telegram chat preview)
2. "What it is" (3 pillar cards)
3. "How it works" (4 workflow steps + "Under the hood" panel)
4. "Execution modes" (4 mode cards)
5. "Quick start" (4 step cards)
6. Footer

**Suggested reorder (if it helps the narrative):**
- Hero: hook + Telegram preview
- What it is: subscription model, provider agnostic, quiet
- How it works: decompose → dispatch → loop → deliver
- What you get: screenshots, tunnels, git commits, self-healing (merge "under the hood" into this)
- Execution modes: the 4 types
- Quick start
- Footer with "Built with itself"

## Backlog
- [x] Read current page.tsx to understand exact current copy
- [x] Draft new copy for hero (headline, lead, bullets) — hook in one sentence
- [x] Draft new pillar cards — 3 distinct, non-overlapping value props
- [x] Draft new workflow steps — concrete, no overlap with pillars
- [x] Rewrite "Under the hood" panel — unique points not covered elsewhere
- [x] Review execution modes copy — make each card distinct and useful
- [x] Final pass: grep for repeated phrases, ensure each point appears exactly once
- [x] Commit changes

## Notes
- The user specifically called out: "quiet unless there is news" appeared in hero bullets AND as a pillar card
- The subscription/API tokens point was repeated in hero lead, hero bullets, section heading, AND first pillar
- Missing features that should be mentioned: screenshots, built-with-itself, tunnels
- Tone reference: the current style is "already pretty good" — keep it, just tighten and de-duplicate


## Loop Control
STOP
