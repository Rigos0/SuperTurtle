# Current Task

Usage fixes complete. Waiting for next direction.

# End Goal with Specs

Fix two issues found in code review of `/usage` feature. Both are in `super_turtle/claude-telegram-bot/src/handlers/commands.ts`.

**Bug 1: Missing data shows ✅ instead of ❓ (Correctness)**

When usage/quota fetch returns no data, `formatUnifiedUsage()` shows ✅ green status, misleading users into thinking everything's fine.

Fixes needed:
- Line 562: Change `✅ <b>Claude Code</b>` → `❓ <b>Claude Code</b>` (no-data branch)
- Line 603: Change `✅ <b>Codex</b>` → `❓ <b>Codex</b>` (no-data branch)
- Line 610-620: The summary status line uses `claudeHighestPct` and `codexHighestPct` which default to 0 when no data exists. Add a boolean flag `claudeDataMissing` / `codexDataMissing` to track whether we actually got data vs parsed 0%. If either is missing, summary should say `❓ Status: Partial data — check above` instead of `✅ All services operating normally`.

**Bug 2: Unescaped planType in HTML (Security)**

Line 590: `codexPlanType` from JSON-RPC response is interpolated into `<b>Codex (${codexPlanType})</b>` without HTML escaping.

Fix: Import `escapeHtml` (already exists in `../formatting`) and wrap: `escapeHtml(codexPlanType)`.
Note: `escapeHtml` is already imported at the top of commands.ts — just use it.

**Bug 3: Dead code cleanup**

- Line 673: Remove unused `CodexQuotaData` type alias.
- Lines 594-597: Both if/else branches return the same value. Remove the if/else, just keep `return \`   ${line}\``.

**Testing: Add missing test cases**

File: `super_turtle/claude-telegram-bot/src/handlers/commands.usage.test.ts`

Add tests for:
1. `formatUnifiedUsage` with empty usageLines → should show ❓ not ✅
2. `formatUnifiedUsage` with empty codexLines when codexEnabled=true → should show ❓ not ✅
3. `formatUnifiedUsage` with codexPlanType containing HTML chars like `<script>` → should be escaped
4. Run tests: `cd super_turtle/claude-telegram-bot && npx bun test commands.usage`

# Backlog

- [x] Fix Bug 1: Change ✅ to ❓ for missing data in formatUnifiedUsage (lines 562, 603) and add missing-data flags for summary status (lines 610-620)
- [x] Fix Bug 2: Escape codexPlanType with escapeHtml() at line 590
- [x] Fix Bug 3: Remove dead CodexQuotaData type (line 673) and simplify duplicate branch (lines 594-597)
- [x] Add test cases for empty data, partial data, and HTML escaping in commands.usage.test.ts
- [x] Run tests to verify: `cd super_turtle/claude-telegram-bot && npx bun test commands.usage`
- [x] Commit all fixes together
