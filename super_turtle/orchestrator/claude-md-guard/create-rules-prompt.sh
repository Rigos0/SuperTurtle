#!/bin/bash
# Generate natural-language CLAUDE.md rules from config.sh.
# Usage: super_turtle/orchestrator/claude-md-guard/create-rules-prompt.sh
# Outputs a plain-text instructions string to stdout.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/config.sh"

# Build heading list
HEADING_LIST=""
while IFS= read -r h; do
  HEADING_LIST+="  $h"$'\n'
done <<< "$ALLOWED_HEADINGS"

# Build sections-requiring-items list
ITEM_SECTIONS=""
while IFS= read -r s; do
  ITEM_SECTIONS+="- $s must contain at least one item (lines starting with -)."$'\n'
done <<< "$SECTIONS_REQUIRING_ITEMS"

cat <<EOF
CLAUDE.md and AGENTS.md must follow this structure. Any write that violates these rules will be rejected.

Allowed top-level headings (# level), in order:
${HEADING_LIST}
No other top-level headings are allowed.

Section rules:
- Backlog must contain at least $MIN_BACKLOG_ITEMS items. Items are lines starting with \`- [ ]\` or \`- [x]\`.
- One or more backlog item must be marked with \`<- current\`.
${ITEM_SECTIONS}- Current task is a summary describing what is being worked on right now.
- End goal with specs is static reference material — do not rewrite it.
- Maximum $MAX_LINES lines total.
EOF
