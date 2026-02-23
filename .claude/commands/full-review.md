Run a full review — code, architecture, browser, and UX. User input: `$ARGUMENTS`

## What this does

Launches all four review agents **in parallel**: `code-reviewer`, `arch-reviewer`, `browser-tester`, and `ux-reviewer`.

## Agent prompts

1. **`code-reviewer`** — Review unstaged changes. If there are no unstaged changes, review the last commit instead (`HEAD~1..HEAD`). Pass through any extra context from `$ARGUMENTS`.

2. **`arch-reviewer`** — Same scope as code-reviewer. Review for duplication, bloat, missed reuse, and structural issues. Pass through any extra context.

3. **`browser-tester`** — Navigate to `http://localhost:5174`, take a screenshot, check that the page renders without errors, and report console health. Pass through any extra context as specific checks.

4. **`ux-reviewer`** — Navigate to `http://localhost:5174`, evaluate the current state of the app against UX/UI best practices, and return a design critique. Pass through any extra context to focus the review.

## After agents return

Compile a single summary:

```
## Full Review Summary

### Code Review
**Verdict:** CLEAN | ISSUES FOUND
{Findings}

### Architecture Review
**Verdict:** CLEAN | ISSUES FOUND
{Findings}

### Browser Test
**Verdict:** PASS / FAIL
{Findings}

### UX Review
**Grade:** A / B / C / D
{Key issues}

### Action Items
{Numbered list of things to fix, ordered by severity — critical first}
```

If any agent fails to run (e.g., dev server not running), note it in the summary and still report results from the agents that succeeded.
