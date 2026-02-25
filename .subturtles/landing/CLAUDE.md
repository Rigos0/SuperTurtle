## Current Task

Final mobile QA: check every section at 375px width, no overflow, readable text, good spacing

## End Goal with Specs

A landing page that looks GREAT on mobile (iPhone-sized screens first), then scales up. More personality, more opinionated layout decisions, less "template energy."

**Mobile-first priorities:**
- Hero must be punchy on a phone screen — turtle logo not too big (96px max on mobile), headline tight
- Cards stack cleanly in single column, no awkward padding
- Terminal demo should be readable on mobile (smaller font, horizontal scroll if needed)
- Touch-friendly tap targets (min 44px)
- No horizontal overflow anywhere
- Sections should breathe — generous vertical spacing but not wasteful
- SVG architecture diagram should be replaced with a simpler mobile-friendly version (the current SVG doesn't scale well) — use a vertical step list instead

**More opinionated design choices:**
- Use a sticky/fixed nav header on scroll with turtle logo + "agentic" + GitHub link (appears after scrolling past hero)
- Hero: LEFT-align the text on mobile (centered feels generic). Turtle sits to the right or above.
- Feature cards: use a distinctive left-border accent (4px colored bar) instead of full border — feels more editorial
- Section dividers: use a subtle wavy or organic line SVG between major sections (not just flat color changes)
- Typography: Make headings BIGGER and bolder. Use tight letter-spacing on the main title. More contrast between heading and body sizes.
- The comparison table in loop types: convert to a stacked mobile layout (not a table) on small screens
- Add a small "Built by turtles 🐢" tagline somewhere playful

**Color & style (keep earthy but push it):**
- Background: keep warm cream (#faf8f5)
- PRIMARY accent: olive green (#4a5f3b) — slightly darker/richer than before
- SECONDARY accent: terracotta (#b86f4c) — slightly warmer
- TERTIARY: sage (#8fa87e)
- Text: #1a1815 for headings (near black, warm), #4a4642 for body
- Cards: white (#ffffff) with subtle warm shadow, left accent bar
- Terminal blocks: #1a1815 background, amber prompt (#d4a574)
- Use Tailwind's `@apply` in globals.css for reusable patterns. Stop using inline style={{}} — use CSS custom properties + Tailwind classes

**Technical approach:**
- Rewrite `landing/app/page.tsx` completely — MOBILE FIRST
- Use Tailwind responsive prefixes properly: base = mobile, `sm:` = tablet, `lg:` = desktop
- Update `landing/app/globals.css` — add reusable utility classes, clean up CSS vars
- Keep TypedTerminal component as-is (it already works, just ensure mobile sizing)
- Keep the same 7 content sections but restructure layouts for mobile
- Max page.tsx complexity: aim for ~600 lines, not 1000+. Extract repeated patterns.

## Backlog

- [x] Rewrite globals.css: clean CSS variables, add utility classes (@apply patterns), remove unused styles
- [x] Build sticky nav header component (turtle logo + "agentic" + GitHub CTA, appears on scroll)
- [x] Rewrite Hero section: mobile-first, left-aligned text, big bold headline, turtle logo, GitHub CTA
- [x] Rewrite "What it does" cards: left accent bar design, clean single-column mobile stack
- [x] Rewrite "How it works": replace SVG diagram with vertical step-flow (mobile-friendly), keep desktop 2-col
- [x] Rewrite "Loop types": stacked cards mobile, comparison as stacked blocks (not table) on mobile
- [x] Rewrite terminal demo + getting started: mobile-readable code blocks, proper overflow handling
- [x] Rewrite footer: compact mobile layout, earthy warm
- [x] Add section divider SVGs (subtle organic wave shapes between major sections)
- [ ] Final mobile QA: check every section at 375px width, no overflow, readable text, good spacing <- current
- [ ] Commit all changes

## Notes

- Project dir: `landing/` at repo root
- Dev server running on port 3000, tunnel active
- Turtle logo already at `landing/public/turtle-logo.png` (emoji kitchen turtle+turtle)
- TypedTerminal component at `landing/components/TypedTerminal.tsx` — don't rewrite, just ensure mobile sizing
- Test at 375px width (iPhone SE) as the baseline mobile size
- All Tailwind classes: base = mobile, sm: = 640px+, md: = 768px+, lg: = 1024px+
- Keep all section IDs for anchor links
