## Current Task
Current backlog is complete. Verified again on February 25, 2026. Waiting for next task assignment.

## End Goal with Specs
The `/usage` Telegram command should display real Codex quota data using `codex app-server` JSON-RPC. The implementation is ALREADY WRITTEN in `commands.ts` — it just needs testing, possible fixes, and a clean commit.

**What's already done:**
- `getCodexQuotaLines()` in `commands.ts` (line ~678) has been rewritten to use `codex app-server` JSON-RPC
- `parseCodexPercentage()` updated to match new format
- Test file `commands.usage.test.ts` updated with mock for `Bun.spawn` app-server

**What still needs doing:**
1. Run the test: `cd super_turtle/claude-telegram-bot && bun test src/handlers/commands.usage.test.ts`
2. If tests fail, fix the issues
3. Verify the code compiles: `cd super_turtle/claude-telegram-bot && bun build src/handlers/commands.ts --no-bundle`
4. Commit all changes with a descriptive message

**Key files:**
- `super_turtle/claude-telegram-bot/src/handlers/commands.ts` — main implementation
- `super_turtle/claude-telegram-bot/src/handlers/commands.usage.test.ts` — test file

## Backlog
- [x] Create `getCodexQuotaLines()` replacement using `codex app-server` JSON-RPC
- [x] Update `formatUnifiedUsage()` to handle new Codex data format (bars + plan type)
- [x] Update `parseCodexPercentage()` to work with new format
- [x] Update test file to mock new approach
- [x] Run tests and fix any failures
- [x] Commit all changes

## Notes
- Do NOT rewrite the implementation — it's already done and correct
- Focus on: test, fix if needed, commit
- The commit message should be: "feat(usage): replace pexpect Codex quota with app-server JSON-RPC"
- Verification on February 25, 2026: `bun test src/handlers/commands.usage.test.ts` and `bun build src/handlers/commands.ts --no-bundle` both pass.
- Re-verification on February 25, 2026: same commands pass after state restore check.
