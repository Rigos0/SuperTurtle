# Current Task

Write review findings to `.subturtles/usage-review/REVIEW.md`.

# End Goal with Specs

Review the /usage command implementation for code quality, correctness, and maintainability. The feature shows unified Claude + Codex quota/usage data with status badges in Telegram.

**Key files to review:**
- `super_turtle/claude-telegram-bot/src/handlers/commands.ts` — main implementation (handleUsage, formatUnifiedUsage, getCodexQuotaLines, JSON-RPC Codex fetcher)
- `super_turtle/claude-telegram-bot/src/handlers/commands.usage.test.ts` — test coverage

**Review criteria:**
1. **Correctness** — Does the code handle all edge cases? Error handling for failed API calls, missing data, timeouts?
2. **Code quality** — Clean abstractions, no duplication, good naming, reasonable function sizes?
3. **Security** — No secrets leaked, safe subprocess/network calls?
4. **Testing** — Are tests meaningful? Do they cover error paths?
5. **Performance** — Are Claude + Codex fetched in parallel? No unnecessary blocking?
6. **Type safety** — Proper TypeScript types, no unsafe `any` casts?

**Output format:**
Write your review findings to `.subturtles/usage-review/REVIEW.md` with sections for each criteria above. Use this format:
- Rating per section: PASS / MINOR / NEEDS FIX
- Specific line references for any issues
- Overall verdict at the top

# Backlog

- [x] Read commands.ts — focus on handleUsage(), formatUnifiedUsage(), getCodexQuotaLines(), Codex JSON-RPC logic
- [x] Read commands.usage.test.ts — check test coverage and quality
- [ ] Write review findings to .subturtles/usage-review/REVIEW.md <- current
- [ ] Commit the review file
