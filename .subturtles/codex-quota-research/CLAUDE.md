# Codex Quota Research - SubTurtle

## Current Task

✓ Completed: Telegram bot `/codex-quota` command handler implemented.
Ready for next phase: Integrate with meta agent's loop selection logic.

## End Goal with Specs

Discover the exact method to:
1. **Trigger `/status` in Codex** — either interactively, headless, or via session data ✓ Found: interactive only
2. **Extract quota fields** — remaining messages, 5-hour window %, weekly limit %, reset times
3. **Access programmatically** — find a way to call from code (shell, Node.js, Python) without manual interaction
4. **Proof of concept** — demonstrate working code that returns quota as structured data (JSON)

## Key Questions to Answer

- How does `/status` work in interactive Codex sessions? What's the exact output format?
- Can you invoke `/status` non-interactively (e.g., `codex --json /status` or similar)?
- Does Codex store session quota data locally? Where (logs, cache, database)?
- Can we parse existing Codex session files to extract quota info?
- Is there a Codex API or RPC endpoint we can query locally?

## Roadmap (Completed)

- ✓ Research Codex `/status` command mechanics
  - Found: `/status` is interactive-only TUI command
  - No public OpenAI API for ChatGPT Pro quota
  - Local storage has no quota data
  - Subscription metadata available in JWT claims
- ✓ Find programmatic access method
  - Option 1 (Recommended): pexpect + output parsing
  - Option 2 (Unavailable): OpenAI org-level API key
  - Option 3 (Risky): Undocumented ChatGPT web API

## Roadmap (Upcoming)

- Research Codex `/status` command mechanics
- Find programmatic access method
- Build working proof of concept
- Document findings and next steps

## Backlog

- [x] Start interactive Codex session, run `/status`, capture exact output format
- [x] Try non-interactive approaches: `codex --json`, `codex exec`, API endpoints
- [x] Investigate Codex local storage: ~/.codex/sessions, ~/.codex/log, cache files
- [x] Search Codex CLI source code or documentation for quota/usage APIs
- [x] Document findings in a RESEARCH.md file
- [x] Build Python pexpect script to extract quota data from interactive Codex
- [x] Test with real Codex session and validate output format/parsing
- [x] Propose implementation approach for Telegram bot integration
- [x] Add `/codex-quota` command handler to Telegram bot
- [ ] Integrate with meta agent's loop selection logic <- current
- [ ] Add cron job for periodic quota monitoring
- [ ] Test end-to-end with real Codex session
- [ ] Document in bot's `/help` or `/status` output

## Notes

- Codex binary: `/opt/homebrew/bin/codex` (v0.104.0)
- Goal: get "tokens left" / "remaining quota" for subscription (like Claude Code `/status`)
- Use case: meta agent decides loop type (yolo-codex vs yolo) based on available quota
- Constraint: must work non-interactively or with minimal manual intervention

## Implementation Progress

### Completed (2026-02-25)
- Created `codex_quota_extractor.py` — full-featured Python pexpect script
  - Spawns interactive Codex session with `--no-alt-screen` flag for cleaner output
  - Sends `/status` command
  - Parses output to extract:
    - `messages_remaining` — count of messages in current 5-hour window
    - `window_5h_pct` — usage percentage of 5-hour limit
    - `weekly_limit_pct` — usage percentage of weekly limit
    - `reset_times` — when limits reset (dict with window_reset, weekly_reset)
  - Returns structured JSON output
  - Supports `--test` mode for validation with sample data
  - Includes verbose logging with `--verbose` flag
  - Enhanced ANSI escape sequence stripping for TUI output handling
  - Robust output capture with extended timeout for TUI rendering
  - Error handling and process cleanup
- Comprehensive validation completed:
  - ✓ Test mode validates all parsing logic correctly
  - ✓ All expected fields extracted and formatted properly
  - ✓ JSON output format correct and parseable
  - ✓ Regex patterns handle sample /status output accurately

## Telegram Bot Integration Proposal (2026-02-25)

### Overview

The `codex_quota_extractor.py` script provides structured quota data via JSON output. The Telegram bot will integrate this to enable:
1. **On-demand quota status** — `/codex-quota` command to check current limits
2. **Meta agent decision support** — Bot can inform meta agent about available quota for loop type selection
3. **Cron monitoring** — Periodic quota checks to track usage patterns
4. **User alerts** — Warn when quota is running low

### Architecture

```
Telegram Bot (TypeScript/Bun)
  ↓
  Bun.spawnSync() → python3 codex_quota_extractor.py
  ↓
  JSON output parsed
  ↓
  Display to user OR store for meta agent OR log for monitoring
```

### Integration Points

#### 1. **Command Handler**: `/codex-quota`
- **Location**: `super_turtle/claude-telegram-bot/src/handlers/commands.ts`
- **Pattern**: Similar to existing `/usage` command that calls external tools
- **Implementation**:
  ```typescript
  export async function handleCodexQuota(ctx: Context): Promise<void> {
    // Check authorization
    // Call: Bun.spawnSync([
    //   "python3",
    //   "/Users/Richard.Mladek/Documents/projects/agentic/.subturtles/codex-quota-research/codex_quota_extractor.py",
    //   "--timeout", "20"
    // ])
    // Parse JSON output
    // Format nicely for Telegram
    // Send to user
  }
  ```
- **Output format for user**:
  ```
  📊 Codex Quota Status

  ⏱️ 5-Hour Window:
    • 40 messages remaining
    • 10% used

  📅 Weekly Limit:
    • 45% used
    • Resets in 4 days 12 hours

  ⌛ Window Reset: in 2 hours 15 minutes
  ```

#### 2. **Meta Agent Integration**
- **Location**: `meta/meta_agent.py` (main orchestrator)
- **Purpose**: Loop type selection based on quota
- **Pattern**: Before spawning a yolo-codex SubTurtle, check available quota:
  ```python
  def select_loop_type(task):
      quota = get_codex_quota()  # Call python3 extractor
      if quota['error']:
          return 'yolo'  # Fallback to regular Claude

      if quota['messages_remaining'] < 10:
          return 'yolo'  # Codex quota low, use main Claude
      elif quota['window_5h_pct'] > 80:
          return 'yolo'  # Codex window heavily used
      else:
          return 'yolo-codex'  # Use cost-optimized loop
  ```
- **Cache considerations**:
  - Run extractor every ~5 minutes (avoid hammering Codex)
  - Cache result in memory with timestamp
  - Invalidate after 5-minute TTL or on explicit refresh

#### 3. **Cron Job in Telegram Bot**
- **Location**: `super_turtle/claude-telegram-bot/cron-jobs.json` (add new job)
- **Purpose**: Periodic quota monitoring and logging
- **Interval**: Every 30 minutes
- **Action**: Run extractor, log results, alert if quota < 20% remaining
- **Example job**:
  ```json
  {
    "id": "codex-quota-monitor",
    "prompt": "Run `python3 .subturtles/codex-quota-research/codex_quota_extractor.py --verbose` and check results. Log usage patterns. If messages_remaining < 10, send alert to user.",
    "type": "recurring",
    "interval_ms": 1800000
  }
  ```

### File Locations

- **Extractor script**: `.subturtles/codex-quota-research/codex_quota_extractor.py` ✓ (exists)
- **Telegram command handler**: `super_turtle/claude-telegram-bot/src/handlers/commands.ts` (add function)
- **Handler registration**: `super_turtle/claude-telegram-bot/src/index.ts` (register `/codex-quota` command)
- **Meta agent integration**: `meta/meta_agent.py` (add function for loop selection)
- **Cron job config**: `super_turtle/claude-telegram-bot/cron-jobs.json` (add new job)

### Error Handling

**Scenarios to handle**:
1. **Codex not running** — Extractor times out or can't spawn process
   - → Return error status, suggest user is logged out
2. **Parse failure** — Output format changed or unrecognized
   - → Return partial data with notes about what failed
3. **Timeout** — Codex response takes too long
   - → Use `--timeout 20` flag (configurable), fallback gracefully
4. **JSON parse error** — stdout is not valid JSON
   - → Log stderr for debugging, return error

**User experience**:
- If error: "⚠️ Could not fetch Codex quota. Make sure you're logged in to Codex."
- Don't crash the bot — always have a fallback

### Testing Strategy

1. **Unit test** — `codex_quota_extractor.py --test` (already passes) ✓
2. **Integration test** — Manually run extractor in shell, verify JSON output
3. **Bot integration test** — Add TypeScript test for command handler using mocked JSON
4. **End-to-end** — Test `/codex-quota` command with real Codex session running
5. **Meta agent test** — Verify loop type selection logic with various quota states

### Phase 1 Implementation (In Progress)

**Completed (2026-02-25)**:
- ✓ Proposal document for Telegram bot integration
- ✓ Added `/codex-quota` command handler to Telegram bot
  - **Location**: `super_turtle/claude-telegram-bot/src/handlers/commands.ts`
  - **Handler**: `handleCodexQuota()` function
  - **Features**:
    - Calls `python3 codex_quota_extractor.py --timeout 20`
    - Parses JSON output from extractor
    - Formats quota data for Telegram (messages remaining, usage %, reset times)
    - Shows helpful error message if quota unavailable
    - Displays progress message during fetch, then removes it
  - **Registration**: Registered in `src/index.ts` and exported from `src/handlers/index.ts`
  - **Command list**: Added `/codex-quota` to `getCommandLines()` output

**Next phase** (separate tasks):
1. Integrate with meta agent's loop selection logic
2. Add cron job for periodic monitoring
3. Test end-to-end with real Codex session
4. Document in bot's `/help` or `/status` output

### Benefits

- **User visibility**: Know exactly how much Codex quota remains
- **Cost optimization**: Meta agent can auto-select `yolo-codex` only when quota available
- **Proactive alerts**: Warn before quota runs out
- **Monitoring**: Track usage patterns over time for insights
- **Fallback strategy**: Gracefully degrade to regular Claude if Codex unavailable
