#!/bin/bash
# claude-md-guard: print section-level stats and warnings for CLAUDE.md.
# Usage: claude-md-guard/stats.sh [path-to-claude-md]

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/config.sh"

FILE="${1:-CLAUDE.md}"

if [ ! -f "$FILE" ]; then
  echo "ERROR: $FILE not found"
  exit 1
fi

# --- Collect headings and check for unknowns ---
HEADING_WARNINGS=()
while IFS= read -r heading; do
  if ! echo "$ALLOWED_HEADINGS" | grep -qxF "$heading"; then
    HEADING_WARNINGS+=("$heading")
  fi
done < <(grep '^# ' "$FILE" | grep -v '^## ')

SECTION_WARNINGS=()

# --- Parse sections by line number ---
declare -a SECTION_NAMES=()
declare -a SECTION_STARTS=()

while IFS=: read -r lineno heading; do
  SECTION_NAMES+=("$heading")
  SECTION_STARTS+=("$lineno")
done < <(grep -n '^# ' "$FILE" | grep -v '^[0-9]*:## ')

TOTAL_LINES=$(wc -l < "$FILE")

# --- Print stats ---
echo "=============================="
echo "  CLAUDE.md Section Analysis"
echo "=============================="
echo ""

TOTAL_WORDS=0

for i in "${!SECTION_NAMES[@]}"; do
  START="${SECTION_STARTS[$i]}"
  if [ $((i + 1)) -lt ${#SECTION_STARTS[@]} ]; then
    END=$(( SECTION_STARTS[$((i + 1))] - 1 ))
  else
    END="$TOTAL_LINES"
  fi

  CONTENT=$(sed -n "$(( START + 1 )),${END}p" "$FILE")
  WORDS=$(echo "$CONTENT" | wc -w | tr -d ' ')
  LINES=$(echo "$CONTENT" | grep -c '.' || true)
  TOTAL_WORDS=$((TOTAL_WORDS + WORDS))

  NAME="${SECTION_NAMES[$i]}"
  printf "%-30s %4d words, %3d lines" "$NAME" "$WORDS" "$LINES"

  # Item counts for sections that require them
  if echo "$SECTIONS_REQUIRING_ITEMS" | grep -qxF "$NAME"; then
    ITEMS=$(echo "$CONTENT" | grep -c '^- ' || true)
    CHECKED=$(echo "$CONTENT" | grep -c '^- \[x\]' || true)
    UNCHECKED=$(echo "$CONTENT" | grep -c '^- \[ \]' || true)
    printf ", %2d items" "$ITEMS"
    if [ "$CHECKED" -gt 0 ] || [ "$UNCHECKED" -gt 0 ]; then
      printf " (%d done, %d open)" "$CHECKED" "$UNCHECKED"
    fi
    if [ "$ITEMS" -eq 0 ]; then
      SECTION_WARNINGS+=("$NAME has 0 items (expected lines starting with -)")
    fi
  fi

  echo ""
done

echo ""
echo "------------------------------"
printf "%-30s %4d words, %3d lines\n" "TOTAL" "$TOTAL_WORDS" "$TOTAL_LINES"
echo ""

# --- Warnings ---
if [ ${#HEADING_WARNINGS[@]} -gt 0 ] || [ ${#SECTION_WARNINGS[@]} -gt 0 ]; then
  echo "WARNINGS:"
  for w in "${HEADING_WARNINGS[@]}"; do
    echo "  ! Unknown heading: \"$w\""
  done
  for w in "${SECTION_WARNINGS[@]}"; do
    echo "  ! $w"
  done
  echo ""
fi

# --- Validation warnings ---
HAS_CURRENT=$(grep -c '<- current' "$FILE" || true)
BACKLOG_ITEMS=$(sed -n '/^# Backlog/,/^# /p' "$FILE" | grep -c '^- ' || true)

if [ "$TOTAL_LINES" -gt "$MAX_LINES" ]; then
  echo "WARN: File has $TOTAL_LINES lines (maximum $MAX_LINES)"
fi
if [ "$HAS_CURRENT" -lt "$MIN_CURRENT_MARKERS" ]; then
  echo "WARN: Missing '<- current' marker"
fi
if [ "$BACKLOG_ITEMS" -lt "$MIN_BACKLOG_ITEMS" ]; then
  echo "WARN: Backlog has $BACKLOG_ITEMS items (minimum $MIN_BACKLOG_ITEMS)"
fi
