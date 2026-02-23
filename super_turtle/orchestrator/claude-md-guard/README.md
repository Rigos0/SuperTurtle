# claude-md-guard

Validates CLAUDE.md / AGENTS.md structure against configurable rules. Two scripts, one config.

## Usage

```bash
# Print section stats and warnings
super_turtle/orchestrator/claude-md-guard/stats.sh CLAUDE.md

# Validate (silent on success, exit 2 on failure)
echo '{"tool_name":"Write","tool_input":{"file_path":"AGENTS.md","content":"..."}}' | super_turtle/orchestrator/claude-md-guard/validate.sh
```

## Files

- `config.sh` — all rules and thresholds (single source of truth)
- `stats.sh` — human-readable section analysis with warnings
- `validate.sh` — Claude Code PreToolUse hook, blocks invalid writes to `CLAUDE.md` and `AGENTS.md`

## Config variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ALLOWED_HEADINGS` | 5 headings | Allowed `#` top-level headings |
| `SECTIONS_REQUIRING_ITEMS` | Backlog, both Roadmaps | Sections that must have `- ` lines |
| `MAX_LINES` | 500 | Maximum total lines |
| `MIN_BACKLOG_ITEMS` | 5 | Minimum `- [ ]` / `- [x]` items in Backlog |
| `MIN_CURRENT_MARKERS` | 1 | Minimum `<- current` occurrences |

## Hook setup

In `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/super_turtle/orchestrator/claude-md-guard/validate.sh",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```
