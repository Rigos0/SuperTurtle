# Current Task
All usage-aware resource management documentation updates are complete.

# End Goal with Specs
Update `super_turtle/meta/META_SHARED.md` to add a new section "## Usage-aware resource management" that defines:

1. Usage check behavior:
   - Meta agent checks usage at session start and every ~30 minutes
   - Uses `getUsageLines()` and `getCodexQuotaLines()` data (already available via bot MCP tool `bot_control` action `usage`)

2. Decision matrix (add as a table):
   | Claude Code Usage | Codex Usage | Meta Agent Behavior |
   |-------------------|-------------|---------------------|
   | <50% | <50% | Normal operations, any loop type |
   | 50-80% | <50% | Prefer yolo-codex, reduce cron frequency to 10m |
   | >80% | <50% | Force yolo-codex only, minimal check-ins (15m), shorter responses |
   | Any | >80% | Switch to yolo (Claude) for SubTurtles, warn user |
   | >80% | >80% | Alert user, suggest pausing non-critical work |

3. Default SubTurtle type: yolo-codex (unless task specifically needs Claude reasoning)

4. Smart cron frequency: when Claude Code >80%, space out cron check-ins to 15m

Add this section AFTER the "## Autonomous supervision (cron check-ins)" section and BEFORE the "## Checking progress" section.

File: `super_turtle/meta/META_SHARED.md`

Acceptance criteria:
- New section exists with clear rules
- Decision matrix is a proper markdown table
- Instructions are actionable (meta agent can follow them)
- Fits naturally in the document flow

# Backlog
- [x] Read META_SHARED.md to find exact insertion point
- [x] Write the "## Usage-aware resource management" section
- [x] Insert it after "## Autonomous supervision" and before "## Checking progress"
- [x] Commit with descriptive message

## Loop Control
STOP
