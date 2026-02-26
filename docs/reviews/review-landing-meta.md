# Code Review: Landing Page & Meta Agent Protocols

**Reviewer:** SubTurtle (autonomous review)
**Date:** 2026-02-27
**Scope:** Landing page components, meta agent protocols, configuration

---

## Executive Summary

**Landing Page Issues:** Inconsistent color palette alignment with Epify Puzlo red-forward branding. StickyNav and TypedTerminal use hardcoded colors not defined in the design system. Undefined CSS variables and responsive design gaps identified.

**Meta Protocols:** Clean, well-documented. No critical gaps detected. Decomposition protocol and META_SHARED.md are coherent and comprehensive.

**Severity Breakdown:** 4 critical, 5 medium, 8 low findings.

---

## Landing Page Review

### File: `landing/app/layout.tsx`

#### Finding 1.1 — CRITICAL: Outdated Metadata

**Severity:** Critical
**Location:** Lines 15-18
**Issue:**
```typescript
export const metadata: Metadata = {
  title: "Apify Meetup with PostHog — Today",
  description: "Mobile-first landing page for today's Apify Meetup featuring PostHog sessions, agenda, and venue details.",
};
```

The page title and description reference "Apify Meetup with PostHog" but the page content is a Snake game with Epify Puzlo branding. Metadata does not match actual page content.

**Fix:** Update to reflect Snake game or landing page purpose:
```typescript
export const metadata: Metadata = {
  title: "Epify Puzlo - Super Turtle Demo",
  description: "Autonomous agent coordination system showcase with Snake game demo.",
};
```

---

### File: `landing/app/page.tsx`

#### Finding 2.1 — MEDIUM: Eyebrow Text Branding Mismatch

**Severity:** Medium
**Location:** Line 189
**Issue:**
```typescript
<p className="eyebrow">Epify Puzlo</p>
```

Page correctly shows "Epify Puzlo", but metadata still references "Apify Meetup". Page content is aligned but metadata is not.

**Fix:** See Finding 1.1 above.

---

#### Finding 2.2 — LOW: Missing Semantic HTML Structure

**Severity:** Low
**Location:** Lines 185-311
**Issue:**
The page uses a `<main>` wrapper which is correct, but the root is classified as `meetup-page` (line 185) which is outdated terminology. The CSS class name doesn't match content.

**Fix:** Rename CSS class from `.meetup-page` to `.game-page` or `.demo-page` for semantic clarity.

---

### File: `landing/components/StickyNav.tsx`

#### Finding 3.1 — CRITICAL: Hardcoded Colors Not Aligned with Brand Palette

**Severity:** Critical
**Location:** Lines 20-24, 36, 44
**Issue:**
Component uses hardcoded colors that don't align with Epify Puzlo red-forward branding:
- Background: `rgba(255, 255, 255, 0.95)` — pure white (should be dark red-forward)
- Logo text: `text-[#1a1815]` — dark brown (conflicts with branding)
- Button: `bg-[#4a5f3b]` — green (not in design system)
- Button hover: `bg-[#3d4d31]` — darker green

These colors are completely disconnected from the red-forward palette defined in `globals.css`.

**Fix:**
Map to design system variables defined in globals.css:
```typescript
// Use CSS variables from globals.css instead of hardcoded colors
style={{
  backgroundColor: 'var(--card-strong)',
  backdropFilter: 'blur(8px)',
}}
```

Update button styles to use red-forward palette:
```typescript
className="... bg-[var(--red)] text-white hover:bg-[var(--red-strong)] ..."
```

---

#### Finding 3.2 — MEDIUM: Missing Alt Text on Logo Image

**Severity:** Medium
**Location:** Lines 30-34
**Issue:**
```typescript
<img
  src="/turtle-logo.png"
  alt="Super Turtle"
  className="w-full h-full object-contain"
/>
```

Alt text is present (`"Super Turtle"`), but the parent context is insufficient for accessibility. The logo is inside a navigation that users may not associate with "Super Turtle" without context.

**Fix:**
```typescript
alt="Super Turtle - Autonomous Agent Coordination System"
```

---

#### Finding 3.3 — MEDIUM: Hardcoded Border Color Not in Design System

**Severity:** Medium
**Location:** Line 20
**Issue:**
```typescript
className="... border-[rgba(74,95,59,0.08)] ..."
```

Border color uses green-based RGBA value not in design system. Should use red-forward palette.

**Fix:**
```typescript
className="... border-[var(--line)] ..."
// or inline: style={{ borderBottom: '1px solid var(--line)' }}
```

---

#### Finding 3.4 — LOW: Missing Keyboard Navigation Indicator

**Severity:** Low
**Location:** Lines 40-59
**Issue:**
The GitHub link button has no visible focus indicator for keyboard navigation. Users navigating via Tab key will have poor visibility.

**Fix:**
Add focus styles to the anchor:
```css
.sticky-nav a:focus-visible {
  outline: 2px solid var(--red);
  outline-offset: 2px;
}
```

---

### File: `landing/components/TypedTerminal.tsx`

#### Finding 4.1 — CRITICAL: CSS Variables Not Defined in Stylesheet

**Severity:** Critical
**Location:** Lines 79, 81, 91, 97, 100, 102
**Issue:**
Component relies on CSS variables that are not defined anywhere in `globals.css`:
- `--terminal-bg`
- `--terminal-text`
- `--terminal-accent`

The component will render with no styling or browser default styles, breaking the visual experience.

**Fix:**
Define in `landing/app/globals.css`:
```css
:root {
  --terminal-bg: rgba(22, 8, 12, 0.9);
  --terminal-text: var(--text);
  --terminal-accent: var(--amber);
}
```

Or import variables from the design system and use them directly in component styles.

---

#### Finding 4.2 — CRITICAL: Hardcoded Colors Don't Match Red-Forward Branding

**Severity:** Critical
**Location:** Lines 79, 83-85, 87, 91, 97, 100
**Issue:**
Component hardcodes terminal colors that don't align with Epify Puzlo red-forward branding:
- Line 79: Border color `rgba(212, 165, 116, 0.3)` — amber/tan (not in palette)
- Lines 83-85: Traffic light dots use red/yellow/green (generic, not branded)
- Line 87: Text color `rgba(232, 232, 228, 0.5)` — generic light gray
- Line 100: Prompt color `rgba(212, 165, 116, 0.7)` — amber/tan again

**Fix:**
Use design system variables or create new terminal-specific variables aligned with red-forward:
```typescript
<div className="w-full rounded-lg overflow-hidden" style={{
  backgroundColor: 'var(--card)',
  border: '1px solid var(--line)'
}}>
  {/* Traffic light colors aligned with brand */}
  <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full" style={{ backgroundColor: 'var(--red)' }} />
```

---

#### Finding 4.3 — MEDIUM: Missing Hover/Focus States for Accessibility

**Severity:** Medium
**Location:** Lines 78-108
**Issue:**
The terminal component is not interactive but has no accessibility attributes. If it ever becomes interactive, there are no focus states defined.

**Fix:**
Add `role="complementary"` or appropriate ARIA role if this is purely presentational:
```typescript
<div
  role="complementary"
  aria-label="Terminal demonstration"
  className="w-full rounded-lg overflow-hidden"
>
```

---

#### Finding 4.4 — LOW: Inline Styles Mixed with Tailwind Classes

**Severity:** Low
**Location:** Multiple lines (79, 81, 91, 97, 100, 102)
**Issue:**
Component mixes inline `style` props with Tailwind classes (`className`), making styles harder to maintain and CSS not centralized.

**Fix:**
Extract all inline styles to globals.css or a scoped component CSS module:
```css
.typed-terminal {
  background-color: var(--terminal-bg);
  border: 1px solid var(--line);
}

.typed-terminal__header {
  background-color: var(--terminal-bg);
  border-bottom: 1px solid rgba(255, 128, 112, 0.2);
}
```

---

### File: `landing/components/SectionDivider.tsx`

#### Finding 5.1 — CRITICAL: Wave Colors Not Aligned with Red-Forward Branding

**Severity:** Critical
**Location:** Lines 13-14, 17-18
**Issue:**
```jsx
<path d="..." fill="rgba(74, 95, 59, 0.06)" />  {/* Green-based */}
<path d="..." fill="rgba(184, 111, 76, 0.04)" /> {/* Tan-based */}
```

Both wave colors use green and tan hues, completely disconnected from the red-forward palette. This section divider visually breaks the design continuity.

**Fix:**
Update to red-forward colors:
```jsx
<path d="..." fill="rgba(255, 91, 79, 0.08)" />  {/* Red from --red */}
<path d="..." fill="rgba(255, 197, 135, 0.06)" /> {/* Amber from --amber */}
```

Or better, use CSS variables:
```jsx
<path
  d="..."
  fill="rgba(255, 91, 79, 0.08)"
  // Computed from CSS var(--red) and var(--amber)
/>
```

---

#### Finding 5.2 — MEDIUM: Background Color Doesn't Match Body Gradient

**Severity:** Medium
**Location:** Line 3
**Issue:**
```jsx
<div className="..." style={{ backgroundColor: '#faf8f5' }}>
```

Hardcoded light background `#faf8f5` (off-white) clashes with the dark red-forward body gradient defined in `globals.css`. Creates jarring visual transition.

**Fix:**
Either:
1. Remove the background fill and let the wave blend with the body gradient
2. Use a dark background consistent with the design system:
```jsx
style={{ backgroundColor: 'var(--bg)' }}
```

---

### File: `landing/app/globals.css`

#### Finding 6.1 — MEDIUM: Unused or Orphaned Color Variables

**Severity:** Medium
**Location:** Lines 3-16
**Issue:**
Design system defines complete color palette with `--red`, `--red-strong`, `--rose`, `--amber`, but components (StickyNav, TypedTerminal, SectionDivider) don't use them. Instead they hardcode incompatible colors.

This suggests either:
- Components were built before the design system was finalized
- Components were not updated when the design system changed to red-forward

**Fix:**
Audit all components and enforce use of CSS variables:
- StickyNav: Map green colors to `--red`, `--red-strong`
- TypedTerminal: Map amber/tan to `--amber`, define terminal-specific variables
- SectionDivider: Map green/tan to `--red`, `--amber`

---

#### Finding 6.2 — LOW: CSS Variable Naming Could Be More Specific

**Severity:** Low
**Location:** Lines 3-16
**Issue:**
Variable names like `--card`, `--card-strong`, `--line` are generic. As the design system grows, specificity helps:
```css
--bg: #17090b;              /* Good */
--card: rgba(48, 18, 22, 0.8); /* Generic — could be --card-bg or --surface-default */
--line: rgba(255, 128, 112, 0.28); /* Generic — could be --border-default or --border-red-light */
```

**Fix:**
Not urgent but consider renaming for clarity in future updates:
- `--card` → `--surface-card` or `--bg-card`
- `--card-strong` → `--surface-card-strong` or `--bg-card-elevated`
- `--line` → `--border-default` or `--border-red`

---

### File: `landing/next.config.ts`

#### Finding 7.1 — LOW: Export Configuration Missing Image Optimization

**Severity:** Low
**Location:** Lines 3-5
**Issue:**
```typescript
const nextConfig: NextConfig = {
  output: 'export',  // Static export
};
```

Static export disables Next.js image optimization (`next/image` with automatic optimization). The logo in StickyNav uses a raw `<img>` tag instead of `next/image`, which means no automatic optimization or format conversion.

**Fix:**
For optimal performance, consider:
1. Using `next/image` with `unoptimized={true}` for static export:
```typescript
import Image from 'next/image';

<Image
  src="/turtle-logo.png"
  alt="Super Turtle"
  width={32}
  height={32}
  unoptimized
/>
```

2. Or keep the current setup but add explicit `width`/`height` to prevent layout shift.

---

### File: `landing/tsconfig.json`

#### Finding 8.1 — LOW: Path Alias Configured But Unused

**Severity:** Low
**Location:** Lines 21-23
**Issue:**
```json
"paths": {
  "@/*": ["./*"]
}
```

Path alias is configured but not used in any imports. Components import relatively: `import { useEffect, useState } from 'react'` rather than using `@/components/...`.

**Fix:**
Either use the alias consistently:
```typescript
import { StickyNav } from '@/components/StickyNav';
```

Or remove the unused path alias from tsconfig.json.

---

## Meta Agent Protocols Review

### File: `super_turtle/meta/META_SHARED.md`

#### Finding 9.1 — LOW: Cron Check-In Notification Format Could Include Timestamps

**Severity:** Low
**Location:** Lines 245-272
**Issue:**
The notification templates show what to send but don't include timestamp information. Long-running SubTurtles benefit from "last active" timestamps for debugging.

**Example improvement:**
```
🎉 Finished: <name> [completed at 14:32 UTC]
✓ <item 1>
```

**Fix:** Optional enhancement to notification format docs.

---

#### Finding 9.2 — MEDIUM: Unclear Handoff Between Silent and Non-Silent Check-Ins

**Severity:** Medium
**Location:** Lines 227-244
**Issue:**
The protocol says:
- "If a silent check-in finds no notable event, do the supervision work and respond with exactly `[SILENT]`"

But it's unclear:
1. Who reads `[SILENT]` responses? (The bot? The scheduler?)
2. What if silent supervision uncovers a stuck SubTurtle — does the meta agent switch to non-silent?
3. How does the decision matrix at lines 308-315 apply to silent check-ins?

**Fix:**
Clarify the handoff:
```markdown
**Silent Check-In Handoff:**
- If no news (on-track), respond with `[SILENT]` only
- If notable event detected (milestone, stuck, error):
  - Switch to non-silent notification
  - Use full notification format (lines 245-272)
  - The bot will forward to user regardless of `silent: true`
```

---

#### Finding 9.3 — LOW: Decomposition Limits Not Cross-Referenced

**Severity:** Low
**Location:** Lines 117-133 (in META_SHARED.md), also in DECOMPOSITION_PROMPT.md
**Issue:**
META_SHARED.md line 120 says "use `super_turtle/meta/DECOMPOSITION_PROMPT.md` as the canonical decomposition protocol" but doesn't repeat the hard constraints (max 5 SubTurtles, 3-7 backlog items per SubTurtle).

If a meta agent reads only META_SHARED.md in a session, they may forget the limits.

**Fix:**
Add a note in META_SHARED.md:
```markdown
See DECOMPOSITION_PROMPT.md for hard constraints:
- Maximum 5 SubTurtles per user request
- Each SubTurtle should have 3-7 backlog items
```

---

### File: `super_turtle/meta/DECOMPOSITION_PROMPT.md`

#### Finding 10.1 — LOW: Example Naming Inconsistency

**Severity:** Low
**Location:** Line 31, 44, 57, 63, 72, 89
**Issue:**
Naming format is specified as lowercase hyphenated (line 30: `<project>-<feature>`), but example on line 62 shows:
```
- `dashboard-search`
- `dashboard-filters`
- `dashboard-export` (queued, depends on `dashboard-search`)
```

All examples follow the format correctly, so this is consistent. No issue found.

**Status:** CLEARED — naming examples are correct.

---

### File: `CLAUDE.md` (root project)

#### Finding 11.1 — MEDIUM: Backlog Item Text Doesn't Match Task Context

**Severity:** Medium
**Location:** Line 108
**Issue:**
```
- [ ] Update landing page palette to Epify Puzlo red-forward brand direction and verify mobile/desktop contrast/accessibility <- current
```

This backlog item is in the root CLAUDE.md but currently assigned to a SubTurtle (`review-landing`). The task description says "Update landing page palette" (implies implementation) but the SubTurtle task is to write a code **review** report.

There's a semantic gap: the root CLAUDE.md treats this as an implementation task, but the SubTurtle is doing a review first.

**Fix:**
Update root CLAUDE.md to clarify the two-phase approach:
```
- [ ] Review landing page (code quality, branding, accessibility) <- current
- [ ] Implement landing page palette refresh based on review findings
```

Or update SubTurtle CLAUDE.md title to match the review scope more explicitly.

---

### File: `.subturtles/review-landing/CLAUDE.md`

#### Finding 12.1 — MEDIUM: Scope Includes Config Files But Not Other Pages

**Severity:** Medium
**Location:** Lines 23-31
**Issue:**
Review scope explicitly includes `landing/next.config.ts` and `landing/tsconfig.json` but doesn't mention whether other pages in the `landing/app/` directory should be reviewed (e.g., if there are `/api` routes, `/about` pages, etc.).

**Fix:**
Clarify scope: Is this review landing-page-only (`landing/app/page.tsx` + components + globals.css) or the entire landing app?

Current scope seems correct (page.tsx + components + config), so this is more of a documentation note for future reviews.

---

## Accessibility Analysis

### Overall WCAG 2.1 Compliance Issues

#### Finding 13.1 — CRITICAL: Color Contrast Insufficient in Multiple Components

**Severity:** Critical
**Location:** StickyNav (line 36), TypedTerminal (line 87), SectionDivider (line 3)
**Issue:**
- StickyNav dark text (`#1a1815`) on light background: likely passes
- TypedTerminal light text on dark background: depends on undefined colors — cannot assess
- SectionDivider light wave on light background: likely fails WCAG AA contrast ratio

**Fix:**
Once components use design system colors, audit contrast using WCAG Color Contrast Checker:
- Dark text on light: minimum 4.5:1 ratio
- Light text on dark: minimum 4.5:1 ratio

Test with the red-forward palette to ensure all text is legible.

---

## Summary Table

| Finding | File | Severity | Category | Status |
|---------|------|----------|----------|--------|
| 1.1 | layout.tsx | CRITICAL | Metadata | Needs fix |
| 2.1 | page.tsx | MEDIUM | Branding | Depends on 1.1 |
| 2.2 | page.tsx | LOW | Semantics | Cleanup |
| 3.1 | StickyNav.tsx | CRITICAL | Color Palette | Needs immediate fix |
| 3.2 | StickyNav.tsx | MEDIUM | Accessibility | Minor improvement |
| 3.3 | StickyNav.tsx | MEDIUM | Design System | Needs fix |
| 3.4 | StickyNav.tsx | LOW | Accessibility | Enhancement |
| 4.1 | TypedTerminal.tsx | CRITICAL | Styling | Needs immediate fix |
| 4.2 | TypedTerminal.tsx | CRITICAL | Color Palette | Needs immediate fix |
| 4.3 | TypedTerminal.tsx | MEDIUM | Accessibility | Enhancement |
| 4.4 | TypedTerminal.tsx | LOW | Code Organization | Refactoring |
| 5.1 | SectionDivider.tsx | CRITICAL | Color Palette | Needs immediate fix |
| 5.2 | SectionDivider.tsx | MEDIUM | Design Consistency | Needs fix |
| 6.1 | globals.css | MEDIUM | Design System | Audit & enforce |
| 6.2 | globals.css | LOW | Naming | Future enhancement |
| 7.1 | next.config.ts | LOW | Performance | Optional optimization |
| 8.1 | tsconfig.json | LOW | Code Organization | Cleanup |
| 9.1 | META_SHARED.md | LOW | Documentation | Optional enhancement |
| 9.2 | META_SHARED.md | MEDIUM | Protocol Clarity | Needs clarification |
| 9.3 | META_SHARED.md | LOW | Cross-Reference | Documentation |
| 11.1 | CLAUDE.md (root) | MEDIUM | Task Definition | Clarification |
| 13.1 | Multiple | CRITICAL | WCAG 2.1 | Pending design system adoption |

---

## Recommendations

### Priority 1 (Critical — Do These First)
1. **Fix outdated metadata** (Finding 1.1) — blocks user understanding
2. **Align StickyNav colors** (Finding 3.1) — primary navigation breaks branding
3. **Define terminal CSS variables** (Finding 4.1) — component non-functional
4. **Align terminal colors with red-forward** (Finding 4.2) — visual consistency
5. **Update SectionDivider wave colors** (Finding 5.1) — visual consistency

### Priority 2 (Medium — Do These Next)
6. Clarify silent vs. non-silent check-in handoff (Finding 9.2)
7. Enforce design system variable usage across all components (Finding 6.1)
8. Test WCAG color contrast with red-forward palette (Finding 13.1)
9. Add missing alt text and ARIA labels (Findings 3.2, 4.3)

### Priority 3 (Low — Nice-to-Have)
10. Rename CSS variables for specificity (Finding 6.2)
11. Implement next/image optimization (Finding 7.1)
12. Remove unused path alias or use consistently (Finding 8.1)
13. Add timestamps to check-in notifications (Finding 9.1)

---

## Conclusion

The landing page has **good foundational structure** (responsive grid, proper semantic HTML, working game mechanics) but **weak design system alignment**. Components use hardcoded colors that don't match the red-forward brand palette defined in globals.css.

**Meta agent protocols are solid** — no architectural issues, clear task decomposition, well-documented supervision patterns. One medium clarity issue around silent vs. non-silent handoffs.

**Immediate action:** Refactor components to use design system variables instead of hardcoded colors. This is the fastest path to visual consistency and brand alignment.
