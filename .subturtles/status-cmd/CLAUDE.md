# Current Task
All `/status` enhancement backlog items are complete.

# End Goal with Specs
A `/status` command in the Telegram bot that shows:
- All running SubTurtles with: name, type, elapsed time, time remaining, current backlog item
- Last 3 git commits
- Tunnel URL if applicable
- Claude + Codex usage summary (reuse existing `getUsageLines()` and `getCodexQuotaLines()`)

The command should be registered in `super_turtle/claude-telegram-bot/src/index.ts` and implemented in `super_turtle/claude-telegram-bot/src/handlers/commands.ts`.

NOTE: There is already a `/status` command handler (`handleStatus`) that shows bot session status. We need to ENHANCE it (not replace) to also show SubTurtle info. Add a "SubTurtles" section to the existing `/status` output.

File: `super_turtle/claude-telegram-bot/src/handlers/commands.ts`
Function to modify: `handleStatus()` (around line 156)

Acceptance criteria:
- `/status` shows existing bot status AND SubTurtle info
- SubTurtle info comes from running `ctl list` and parsing output
- Format is clean HTML for Telegram
- Shows tunnel URLs when available

# Backlog
- [x] Read `handleStatus()` in commands.ts to understand current implementation
- [x] Read `handleSubturtle()` in same file to understand how ctl list is already parsed
- [x] Add SubTurtle status section to `handleStatus()` by running `ctl list` and formatting output
- [x] Add last 3 git commits section using `git log --oneline -3`
- [x] Commit with descriptive message

## Loop Control
STOP
