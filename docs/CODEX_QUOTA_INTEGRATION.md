# Codex Quota Integration - Technical Design

## Problem

We need to extract Codex subscription quota info (`/status` command output) programmatically for:
1. **Telegram bot**: `/codex-quota` command to show user remaining quota
2. **Meta agent**: Loop type selection (yolo-codex vs yolo based on available quota)

## Solution Overview

Run Codex interactively, send `/status` command, parse output to extract:
- `credits` — remaining credits (if applicable)
- `5h_percent_left` — % of 5-hour window remaining
- `weekly_percent_left` — % of weekly limit remaining
- `reset_times` — when limits reset

## Implementation Approaches Researched

### Approach 1: pexpect (Python pseudo-terminal library)

**Status:** ✓ Working proof of concept built
**Location:** `.subturtles/codex-quota-research/codex_quota_extractor.py`

**Pros:**
- Works immediately with pexpect library
- Good error handling
- Returns JSON output
- Test mode for validation

**Cons:**
- Missing some production robustness from CodexBar
- No retry logic on parse failures
- Doesn't handle update prompts
- No structured error types

### Approach 2: Direct PTY (os.openpty in Python)

**Status:** Researched (CodexBar uses this in Swift)
**Reference:** `https://github.com/steipete/CodexBar/blob/main/Sources/CodexBarCore/Providers/Codex/CodexCLISession.swift`

**CodexBar implementation details:**
- Uses `openpty()` to create PTY pair
- Runs Codex with args: `-s read-only -a untrusted`
- Detects and auto-skips update prompts
- Retries on parse failures with different PTY dimensions (60x200 → 70x220)
- Cleans up process groups properly
- Strips ANSI codes from terminal output

**Pros:**
- Lower level, more control
- Battle-tested in production
- Handles edge cases (updates, ANSI, cursor queries)
- Structured output types

**Cons:**
- More complex implementation
- Requires PTY knowledge
- Platform-specific (Unix/Linux/macOS only)

### Approach 3: CodexBar CLI Binary

**Status:** Available but requires external dependency
**Reference:** CodexBar includes compiled CLI tool

**Pros:**
- Already fully implemented and tested
- No code needed, just call binary

**Cons:**
- Adds external dependency
- Requires CodexBar installation
- Less portable

## Recommended Implementation

**Use Approach 1 (pexpect) as foundation, enhance with Approach 2 patterns:**

1. ✓ Keep pexpect-based implementation (works, simple)
2. Add error handling from Approach 2:
   - Detect update prompts, auto-skip
   - Structured error types (not installed, timed out, parse failed)
   - Retry on parse failure with different PTY dimensions
3. Adopt Codex CLI args: `-s read-only -a untrusted`
4. Add proper process cleanup

## Parsing Details

### Regex Patterns (from CodexBar)

```python
credits_pattern = r"Credits:\s*([0-9][0-9.,]*)"
five_h_line = r"5h limit[^\n]*"
weekly_line = r"Weekly limit[^\n]*"
percent_pattern = r"(\d+)%"  # Extract % from line
reset_pattern = r"in\s+([\ddhm\s]+)"  # Extract "in 2h 15m" format
```

### Expected Output Structure

```json
{
  "credits": 100.0,
  "window_5h_pct": 45,
  "weekly_percent_left": 60,
  "reset_times": {
    "window_reset": "in 2h 15m",
    "weekly_reset": "in 4d 12h"
  },
  "error": null
}
```

## Integration Points

### 1. Telegram Bot Command Handler

**Location:** `super_turtle/claude-telegram-bot/src/handlers/commands.ts`

```typescript
export async function handleCodexQuota(ctx: Context): Promise<void> {
  // Call: python3 .subturtles/codex-quota-research/codex_quota_extractor.py --timeout 20
  // Parse JSON
  // Format for Telegram
  // Send with emoji, reset times, warnings if low
}
```

### 2. Meta Agent Loop Selection

**Location:** `super_turtle/meta/claude-meta` (or future Python orchestrator)

```bash
# Before spawning SubTurtle with yolo-codex type:
quota=$(python3 .subturtles/codex-quota-research/codex_quota_extractor.py)
messages_left=$(echo $quota | jq .messages_remaining)
if [[ $messages_left -lt 10 ]]; then
  loop_type="yolo"  # Fallback to regular Claude
else
  loop_type="yolo-codex"  # Use cost-optimized Codex
fi
```

### 3. Cron Monitoring Job

**Location:** `super_turtle/claude-telegram-bot/cron-jobs.json`

```json
{
  "id": "codex-quota-monitor",
  "prompt": "Check Codex quota, log results, alert if < 10 messages remaining",
  "type": "recurring",
  "interval_ms": 1800000
}
```

## Error Handling

### Failure Modes

| Error | Cause | Handling |
|-------|-------|----------|
| Codex not installed | Binary not found | Show helpful message, suggest installation |
| Timeout | `/status` takes > 20s | Retry once with longer timeout |
| Parse failed | Output format unrecognized | Log raw output for debugging, retry with different PTY size |
| Update required | Codex asks to update | Auto-skip update prompt and retry (from CodexBar pattern) |
| Login required | User not logged into Codex | Show "Please run: codex login" message |

## File Organization

```
.subturtles/codex-quota-research/
├── codex_quota_extractor.py      # Main quota extraction script
├── CLAUDE.md                      # SubTurtle state & progress
├── CODEXBAR_ANALYSIS.md          # Research notes from CodexBar analysis
└── RESEARCH.md                   # Earlier research findings

docs/
└── CODEX_QUOTA_INTEGRATION.md    # This file

super_turtle/claude-telegram-bot/
├── src/handlers/commands.ts      # Add handleCodexQuota()
├── src/handlers/index.ts         # Export handler
├── src/index.ts                  # Register /codex-quota command
└── cron-jobs.json                # Add monitoring job
```

## Implementation Checklist

- [x] Research how `/status` works
- [x] Build pexpect proof of concept
- [x] Analyze CodexBar production implementation
- [ ] Enhance pexpect script with error handling patterns
- [ ] Add `/codex-quota` command to Telegram bot
- [ ] Integrate with meta agent loop selection
- [ ] Add cron monitoring job
- [ ] Test end-to-end with real Codex sessions
- [ ] Document in `/help` output

## Next Steps

1. **Small improvement cycle:** Enhance current pexpect implementation with:
   - Update prompt detection & auto-skip
   - Structured error types
   - Retry logic
   - Better ANSI code stripping

2. **Telegram bot integration:** Add `/codex-quota` command handler

3. **Meta agent integration:** Hook into SubTurtle spawning logic for loop type selection

4. **Production hardening:** Add cron monitoring, alerting for low quota

## References

- Original research: `.subturtles/codex-quota-research/CLAUDE.md`
- CodexBar source: `https://github.com/steipete/CodexBar`
- Codex CLI docs: https://developers.openai.com/codex/cli/
