# Browser Tester Memory

## Environment
- Landing page runs on localhost:3000 (Next.js 16, React 19, Tailwind CSS 4)
- Dev server confirmed working on port 3000 (NOT 5174 — that port is not used)
- Playwright (v1.58.2) available via npx or /tmp/node_modules/playwright
- Chromium headless shell installed at: /tmp/pw-browsers/chromium_headless_shell-1208/chrome-headless-shell-mac-arm64/chrome-headless-shell
- PLAYWRIGHT_BROWSERS_PATH=/tmp/pw-browsers must be set when running from /tmp

## Project Structure
- Main page: /Users/Richard.Mladek/Documents/projects/agentic/landing/app/page.tsx (1016 lines)
- TypedTerminal component: /Users/Richard.Mladek/Documents/projects/agentic/landing/components/TypedTerminal.tsx
- Sections (in order): #hero, #what-it-does, #how-it-works, #loop-types, #terminal-demo, #getting-started, footer

## Fixes Verified (2026-02-25)
1. **Mobile horizontal scroll FIXED** — document.documentElement.scrollWidth === 375 (was 414). how-it-works section now has overflow:hidden, clipping the .w-80 blur div that extends to 413.75px. Body no longer scrolls horizontally.
2. **Learn More button href FIXED** — Changed from `#features` to `#what-it-does`. Click scrolls to #what-it-does (scrollY goes from 0 to 800, section top at 0px = visible).
3. **Grid opacity FIXED** — All 7 grid background divs now use `opacity-5` (computedOpacity: 0.05). Zero `opacity-3` elements remain.
4. **Getting Started code blocks FIXED** — overflow-x: auto applied. First code block: scrollWidth 344px, clientWidth 281px — horizontally scrollable. Body scroll: 375px (no overflow).

## Code Block DOM Structure (Getting Started)
- Code blocks are DIVs (not pre/code tags): `ml-11 bg-slate-900/50 rounded-lg border border-emerald-500/20 p-4 font-mono text-sm overflow-x-auto`
- Query `pre, code` returns empty — must query `[class*="font-mono"]` or `[class*="overflow-x"]`
- Git clone command container: scrollWidth 344px > clientWidth 281px, overflowX: auto (scrollable)

## Confirmed Working (current state)
- Desktop (1920x1080): scrollWidth === 1920, no overflow, buttons side-by-side
- Tablet (768x1024): scrollWidth === 768, no overflow
- Mobile (375x667): scrollWidth === 375, no overflow, CTA buttons stacked vertically
- No console errors or warnings
- Section headers visible, all 6 sections present
- Footer visible with nav links

## Test Script Location
/tmp/landing-test.js — comprehensive viewport + scroll + visual coherence tests
/tmp/fix-verification-test.js — targeted fix verification (the 5 checks from 2026-02-25)
