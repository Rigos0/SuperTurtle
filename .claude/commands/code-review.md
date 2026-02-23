Run a code review. User input: `$ARGUMENTS`

## What this does

Launches **two** review agents in parallel: `code-reviewer` (bugs, security, correctness) and `arch-reviewer` (structure, duplication, bloat). No browser, no UX — code only.

## Step 1: Determine scope

- If `$ARGUMENTS` is empty → review unstaged changes. If no unstaged changes, review the last commit (`HEAD~1..HEAD`).
- If `$ARGUMENTS` contains a scope (e.g., "staged changes", "commits since main", a commit range) → use that scope.

## Step 2: Check scope size

Run `git diff --stat` (or `git diff <range> --stat`) to count files in scope.

- **≤10 files** → launch one `code-reviewer` + one `arch-reviewer`, both with full scope, in parallel.
- **>10 files** → split changed files into chunks of ~5-7 files. Launch one `code-reviewer` per chunk + one `arch-reviewer` for the full scope, all in parallel.

The arch-reviewer always gets the full scope — it needs the big picture.

## Step 3: Present results

Merge all reports into one. Deduplicate findings across agents. Order by severity (critical first).

```
## Code Review

**Scope:** {range} ({N files}, +X -Y)
**Verdict:** CLEAN | ISSUES FOUND

### Critical
...

### Warning
...

### Nit
...

### Architecture
...
```
