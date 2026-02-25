## Current Task

Restyle TypedTerminal component: warm dark brown background, amber/olive accents.

**Status**: ✓ COMPLETE - Updated TypedTerminal.tsx with:
- Warm dark brown background (#1e1c1a) using CSS variable `--terminal-bg`
- Amber accent color (#d4a574) for command prompts and cursor using `--terminal-accent`
- Removed emerald green borders and text colors
- Terminal text now uses warm light color (#e8e8e4)
- Borders use amber with reduced opacity for subtle styling

## End Goal with Specs

A landing page that feels warm, natural, and distinctive — NOT the typical dark-mode AI startup template. Think more like a well-crafted open-source project page that happens to have personality.

**Logo / Mascot:**
- The project logo is the Emoji Kitchen turtle (turtle + turtle combo from Google's Emoji Kitchen)
- Download the sticker image from: `https://www.gstatic.com/android/keyboard/emojikitchen/20231113/u1f422/u1f422_u1f422.png`
- Save it to `landing/public/turtle-logo.png`
- Use this as the hero logo / mascot prominently. It should feel like the face of the project.

**Design direction — EARTHY & NATURAL:**
- Background: warm off-white / cream (#faf8f5 or similar), NOT black
- Text: dark warm brown/charcoal (#2d2a26 or similar), NOT pure white
- Accent colors: warm olive green (#5a7247), terracotta/clay (#c07a56), muted sage (#8fa87e) — earthy palette
- Cards/sections: soft paper-like backgrounds, subtle shadows, NO neon borders or glowing effects
- Typography: keep Geist Sans but make it feel editorial — generous line-height, comfortable reading
- NO gradient text, NO neon glows, NO glowing grid backgrounds, NO blur orbs
- Subtle texture welcome (light paper grain, gentle noise) but keep it minimal
- Think: "craft coffee shop menu design" meets "thoughtful developer documentation"

**What to keep from current version:**
- All 7 sections (Hero, What it does, How it works, Loop types, Terminal demo, Getting started, Footer)
- The same content/copy structure and information
- The TypedTerminal component (but restyle it to match earthy theme — think warm terminal colors)
- The SVG architecture diagram (but restyle with earthy colors)

**What to change:**
- EVERY visual style: backgrounds, colors, borders, gradients, hover effects
- Hero: turtle logo image front and center, warm typography, no gradient text
- Feature cards: soft cream backgrounds with subtle borders, warm shadows
- Terminal: warm dark brown background (#1e1c1a) instead of pure black, amber/olive accent colors instead of emerald
- Code blocks: similar warm dark treatment
- Footer: warm, light — not dark/black
- Loop type cards: use earthy color differentiation (olive for slow, terracotta for yolo, sage for yolo-codex) instead of emerald/cyan/purple
- All hover effects: subtle warmth (slight background shifts), no neon glow effects

**Technical:**
- Rewrite `landing/app/page.tsx` completely with new styles
- Update `landing/app/globals.css` with earthy theme variables
- Update `landing/app/layout.tsx` metadata if needed
- Restyle `landing/components/TypedTerminal.tsx` to match
- Keep Next.js 15, Tailwind CSS 4, static export

## Backlog

- [x] Download emoji kitchen turtle logo to landing/public/turtle-logo.png
- [x] Update globals.css with earthy color scheme and warm theme variables
- [x] Redesign Hero section: turtle logo image, warm typography, cream background, no gradients
- [x] Redesign "What it does" feature grid: soft cream cards, warm shadows, earthy icons
- [x] Redesign "How it works" section: restyle SVG diagram with earthy colors, warm step cards
- [x] Redesign "Loop types" cards: olive/terracotta/sage color scheme, no neon
- [x] Restyle TypedTerminal component: warm dark brown background, amber/olive accents
- [ ] Redesign terminal demo and "Getting started" sections with earthy code blocks <- current
- [ ] Redesign footer: warm light background, earthy links and badges
- [ ] Final polish: verify no remnants of neon/dark theme, consistent earthy feel throughout

## Notes

- Project dir: `landing/` at repo root
- Dev server should already be running on port 3000
- Turtle logo URL: https://www.gstatic.com/android/keyboard/emojikitchen/20231113/u1f422/u1f422_u1f422.png
- The existing page.tsx is ~1000 lines — rewrite the whole thing, don't try to patch
- TypedTerminal component is at `landing/components/TypedTerminal.tsx`
- Keep all section IDs (hero, what-it-does, how-it-works, loop-types, terminal-demo, getting-started) for anchor links
- The tunnel is already running — changes will be visible live
