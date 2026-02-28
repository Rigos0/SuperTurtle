# Current Task
Write mock Context helper and handler tests for handleNew, handleStatus, handleCron.

## End Goal with Specs
Every slash command in `commands.ts` has test coverage. Focus on pure/testable functions first (parsers, formatters), then handler logic that can be tested by mocking the grammY Context.

**File to create:** `super_turtle/claude-telegram-bot/src/handlers/commands.test.ts`

**Test framework:** `bun:test` (import from "bun:test", use describe/it/expect)

**Existing tests to NOT duplicate** (these already exist):
- `commands.usage.test.ts` — usage formatting
- `commands.restart.test.ts` — restart logic
- `commands.subturtle.test.ts` — SubTurtle display
- `commands.looplogs.test.ts` — log reading

**Pure functions to test (no mocking needed):**

1. `getCommandLines()` — returns array of command strings
   - Test: returns array, each entry starts with `/`, includes all known commands

2. `formatModelInfo(model, effort)` — formats model display name + effort
   - Test: known model IDs produce correct display names
   - Test: haiku model has no effort string
   - Test: unknown model falls back to raw model string

3. `parseClaudeBacklogItems(content)` — parses markdown checklist from CLAUDE.md
   - Test: `- [ ] unchecked item` → `{ text, done: false }`
   - Test: `- [x] checked item` → `{ text, done: true }`
   - Test: item with `<- current` marker is detected
   - Test: empty content returns empty array
   - Test: content with no backlog section returns empty array

4. `parseClaudeStateSummary(content)` — extracts current task + end goal from CLAUDE.md
   - Test: well-formed CLAUDE.md returns correct fields
   - Test: missing sections return empty strings
   - Test: real-world CLAUDE.md content

5. `formatBacklogSummary(summary)` — formats summary for display
   - Test: produces readable output with task + progress

6. `parseCtlListOutput(output)` — parses `ctl list` stdout into structured data
   - Test: running SubTurtle line parsed correctly (name, status, type, pid, time_left, task)
   - Test: stopped SubTurtle parsed correctly
   - Test: tunnel URL on next line captured
   - Test: empty output returns empty array
   - Test: header-only output returns empty array

7. `readMainLoopLogTail()` — reads log file tail
   - Test: returns `{ ok: true, text }` when file exists
   - Test: returns `{ ok: false, error }` when file missing

8. `formatUnifiedUsage(usageLines, codexLines, codexEnabled)` — already tested in usage.test.ts, skip

**Handler functions to test (need minimal Context mock):**

Create a helper `mockContext()` that returns a fake grammY Context with:
- `ctx.reply(text, opts)` — captures calls for assertion
- `ctx.from.id` — returns allowed user ID
- `ctx.message.text` — returns command text

9. `handleNew(ctx)` — calls reply with session overview, resets sessions
   - Test: replies with HTML containing command list
   - Test: calls resetAllDriverSessions

10. `handleStatus(ctx)` — replies with status without resetting
    - Test: replies with HTML containing settings overview

11. `handleCron(ctx)` — reads cron-jobs.json and displays jobs
    - Test: no jobs → "No scheduled jobs"
    - Test: with jobs → shows job list with cancel buttons

12. `handleModel(ctx)` — shows model picker
    - Test: replies with inline keyboard buttons for model options

13. `handleSwitch(ctx)` — switches driver
    - Test: when Codex available → shows switch buttons
    - Test: when Codex unavailable → shows error message

**Important patterns from existing tests:**
- Look at `commands.usage.test.ts` and `commands.subturtle.test.ts` for how they mock things
- Tests use `describe()` blocks grouped by function
- Use snapshot-style assertions for formatted output where appropriate

## Backlog
- [x] Read existing command test files to understand mocking patterns
- [x] Write tests for pure functions: getCommandLines, formatModelInfo, parseClaudeBacklogItems, parseClaudeStateSummary, formatBacklogSummary, parseCtlListOutput
- [x] Write tests for parseCtlListOutput with real ctl output samples
- [x] Write tests for readMainLoopLogTail
- [ ] Write mock Context helper and handler tests for handleNew, handleStatus, handleCron <- current
- [ ] Write handler tests for handleModel, handleSwitch
- [ ] Run `bun test` to verify all tests pass
- [ ] Commit
