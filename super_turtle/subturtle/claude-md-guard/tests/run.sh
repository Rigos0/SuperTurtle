#!/bin/bash
# claude-md-guard test suite
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
GUARD_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
FIXTURES="$SCRIPT_DIR/fixtures"

pass=0
fail=0
total=0

# --- Helpers ---

assert_exit() {
  local label="$1" expected="$2" actual="$3"
  total=$((total + 1))
  if [ "$actual" -eq "$expected" ]; then
    echo "  PASS: $label"
    pass=$((pass + 1))
  else
    echo "  FAIL: $label (expected exit $expected, got $actual)"
    fail=$((fail + 1))
  fi
}

assert_contains() {
  local label="$1" needle="$2" haystack="$3"
  total=$((total + 1))
  if echo "$haystack" | grep -q "$needle"; then
    echo "  PASS: $label"
    pass=$((pass + 1))
  else
    echo "  FAIL: $label (expected output to contain '$needle')"
    fail=$((fail + 1))
  fi
}

assert_not_contains() {
  local label="$1" needle="$2" haystack="$3"
  total=$((total + 1))
  if echo "$haystack" | grep -q "$needle"; then
    echo "  FAIL: $label (output should NOT contain '$needle')"
    fail=$((fail + 1))
  else
    echo "  PASS: $label"
    pass=$((pass + 1))
  fi
}

# Build a Write JSON payload for validate.sh
write_json() {
  local file_path="$1"
  local content
  content=$(cat "$2")
  jq -n --arg fp "$file_path" --arg c "$content" \
    '{tool_name: "Write", tool_input: {file_path: $fp, content: $c}}'
}

# Build an Edit JSON payload for validate.sh
edit_json() {
  local file_path="$1" old_string="$2" new_string="$3" replace_all="${4:-false}"
  jq -n --arg fp "$file_path" --arg old "$old_string" --arg new "$new_string" --arg ra "$replace_all" \
    '{tool_name: "Edit", tool_input: {file_path: $fp, old_string: $old, new_string: $new, replace_all: ($ra | test("true"))}}'
}

# ============================================================
#  stats.sh tests
# ============================================================
echo ""
echo "=== stats.sh ==="

# 1. Valid file -> no warnings
echo "[1] Valid file has no warnings"
OUT=$("$GUARD_DIR/stats.sh" "$FIXTURES/valid.md" 2>&1)
assert_not_contains "no WARNINGS header" "WARNINGS:" "$OUT"
assert_not_contains "no WARN lines" "WARN:" "$OUT"

# 2. Valid file -> correct section names in output
echo "[2] Valid file shows section stats"
assert_contains "Current task section" "# Current task" "$OUT"
assert_contains "End goal section" "# End goal with specs" "$OUT"
assert_contains "Roadmap Completed section" "# Roadmap (Completed)" "$OUT"
assert_contains "Roadmap Upcoming section" "# Roadmap (Upcoming)" "$OUT"
assert_contains "Backlog section" "# Backlog" "$OUT"
assert_contains "words in output" "words" "$OUT"
assert_contains "lines in output" "lines" "$OUT"

# 3. Valid file -> correct item counts
echo "[3] Valid file has correct item counts"
assert_contains "Backlog 6 items" "6 items" "$OUT"
assert_contains "Backlog done/open" "3 done, 3 open" "$OUT"
assert_contains "Roadmap Completed 2 items" "2 items" "$OUT"
assert_contains "Roadmap Upcoming 1 items" "1 items" "$OUT"

# 4. Unknown heading -> warning
echo "[4] Unknown heading produces warning"
OUT=$("$GUARD_DIR/stats.sh" "$FIXTURES/unknown-heading.md" 2>&1)
assert_contains "unknown heading warning" "Unknown heading" "$OUT"
assert_contains "shows heading name" "Random heading" "$OUT"

# 5. Section with 0 items -> warning
echo "[5] Empty required section produces warning"
OUT=$("$GUARD_DIR/stats.sh" "$FIXTURES/empty-items.md" 2>&1)
assert_contains "0 items warning" "has 0 items" "$OUT"

# 6. Over MAX_LINES -> warning
echo "[6] Too-long file produces line count warning"
OUT=$("$GUARD_DIR/stats.sh" "$FIXTURES/too-long.md" 2>&1)
assert_contains "max lines warning" "maximum 500" "$OUT"

# 7. Missing <- current marker -> warning
echo "[7] Missing current marker produces warning"
OUT=$("$GUARD_DIR/stats.sh" "$FIXTURES/missing-current.md" 2>&1)
assert_contains "missing marker warning" "Missing.*current.*marker" "$OUT"

# 8. Few backlog items -> warning
echo "[8] Few backlog items produces warning"
OUT=$("$GUARD_DIR/stats.sh" "$FIXTURES/few-backlog.md" 2>&1)
assert_contains "min backlog warning" "minimum 5" "$OUT"

# 9. File not found -> exit 1
echo "[9] Nonexistent file exits 1"
RC=0; OUT=$("$GUARD_DIR/stats.sh" "/tmp/does-not-exist-$$.md" 2>&1) || RC=$?
assert_exit "exit code 1" 1 "$RC"
assert_contains "not found message" "not found" "$OUT"

# ============================================================
#  validate.sh tests
# ============================================================
echo ""
echo "=== validate.sh ==="

# 10. Valid Write -> exit 0
echo "[10] Valid Write exits 0"
JSON=$(write_json "/tmp/CLAUDE.md" "$FIXTURES/valid.md")
RC=0; OUT=$(echo "$JSON" | "$GUARD_DIR/validate.sh" 2>&1) || RC=$?
assert_exit "exit 0" 0 "$RC"

# 11. Valid AGENTS.md Write -> exit 0
echo "[11] Valid AGENTS.md Write exits 0"
JSON=$(write_json "/tmp/AGENTS.md" "$FIXTURES/valid.md")
RC=0; OUT=$(echo "$JSON" | "$GUARD_DIR/validate.sh" 2>&1) || RC=$?
assert_exit "exit 0 for AGENTS.md" 0 "$RC"

# 12. Non-target file -> exit 0 (skipped)
echo "[12] Non-target file skipped"
JSON=$(jq -n '{tool_name: "Write", tool_input: {file_path: "/tmp/README.md", content: "hello"}}')
RC=0; OUT=$(echo "$JSON" | "$GUARD_DIR/validate.sh" 2>&1) || RC=$?
assert_exit "exit 0 for non-target file" 0 "$RC"

# 13. Unknown heading in Write -> exit 2
echo "[13] Unknown heading blocks Write"
JSON=$(write_json "/tmp/CLAUDE.md" "$FIXTURES/unknown-heading.md")
RC=0; OUT=$(echo "$JSON" | "$GUARD_DIR/validate.sh" 2>&1) || RC=$?
assert_exit "exit 2" 2 "$RC"
assert_contains "unknown heading error" "Unknown heading" "$OUT"

# 14. Over MAX_LINES in Write -> exit 2
echo "[14] Too-long file blocks Write"
JSON=$(write_json "/tmp/CLAUDE.md" "$FIXTURES/too-long.md")
RC=0; OUT=$(echo "$JSON" | "$GUARD_DIR/validate.sh" 2>&1) || RC=$?
assert_exit "exit 2" 2 "$RC"
assert_contains "max lines error" "maximum 500" "$OUT"

# 15. Few backlog items in Write -> exit 2
echo "[15] Few backlog items blocks Write"
JSON=$(write_json "/tmp/CLAUDE.md" "$FIXTURES/few-backlog.md")
RC=0; OUT=$(echo "$JSON" | "$GUARD_DIR/validate.sh" 2>&1) || RC=$?
assert_exit "exit 2" 2 "$RC"
assert_contains "min backlog error" "minimum 5" "$OUT"

# 16. Missing marker in Write -> exit 2
echo "[16] Missing current marker blocks Write"
JSON=$(write_json "/tmp/CLAUDE.md" "$FIXTURES/missing-current.md")
RC=0; OUT=$(echo "$JSON" | "$GUARD_DIR/validate.sh" 2>&1) || RC=$?
assert_exit "exit 2" 2 "$RC"
assert_contains "missing marker error" "current.*marker" "$OUT"

# 17. Empty required section in Write -> exit 2
echo "[17] Empty required section blocks Write"
JSON=$(write_json "/tmp/CLAUDE.md" "$FIXTURES/empty-items.md")
RC=0; OUT=$(echo "$JSON" | "$GUARD_DIR/validate.sh" 2>&1) || RC=$?
assert_exit "exit 2" 2 "$RC"
assert_contains "0 items error" "has 0 items" "$OUT"

# 18. Multiple errors -> exit 2, all errors present
echo "[18] Multiple errors all reported"
JSON=$(write_json "/tmp/CLAUDE.md" "$FIXTURES/multiple-errors.md")
RC=0; OUT=$(echo "$JSON" | "$GUARD_DIR/validate.sh" 2>&1) || RC=$?
assert_exit "exit 2" 2 "$RC"
assert_contains "unknown heading" "Unknown heading" "$OUT"
assert_contains "0 items" "has 0 items" "$OUT"
assert_contains "few backlog" "minimum 5" "$OUT"
assert_contains "missing marker" "current.*marker" "$OUT"

# 19. Edit that preserves rules -> exit 0
echo "[19] Safe Edit exits 0"
TMP_DIR=$(mktemp -d)
TMP_CLAUDE="$TMP_DIR/CLAUDE.md"
cp "$FIXTURES/valid.md" "$TMP_CLAUDE"
JSON=$(edit_json "$TMP_CLAUDE" "Working on task six from the backlog." "Working on task seven now.")
RC=0; OUT=$(echo "$JSON" | "$GUARD_DIR/validate.sh" 2>&1) || RC=$?
assert_exit "exit 0 for safe edit" 0 "$RC"
rm -rf "$TMP_DIR"

# 20. Edit that breaks rules -> exit 2
echo "[20] Breaking Edit exits 2"
TMP_DIR=$(mktemp -d)
TMP_CLAUDE="$TMP_DIR/CLAUDE.md"
cp "$FIXTURES/valid.md" "$TMP_CLAUDE"
# Remove the <- current marker
JSON=$(edit_json "$TMP_CLAUDE" "<- current" "")
RC=0; OUT=$(echo "$JSON" | "$GUARD_DIR/validate.sh" 2>&1) || RC=$?
assert_exit "exit 2 for breaking edit" 2 "$RC"
assert_contains "missing marker after edit" "current.*marker" "$OUT"
rm -rf "$TMP_DIR"

# ============================================================
#  rules.sh tests
# ============================================================
echo ""
echo "=== rules.sh ==="

# 21. rules.sh output reflects config values
echo "[21] rules.sh generates rules from config"
OUT=$("$GUARD_DIR/create-rules-prompt.sh" 2>&1)
assert_contains "mentions allowed headings" "# Current task" "$OUT"
assert_contains "mentions backlog minimum" "at least 5 items" "$OUT"
assert_contains "mentions max lines" "Maximum 500 lines" "$OUT"
assert_contains "mentions current marker" "current" "$OUT"
assert_contains "mentions sections needing items" "# Roadmap (Upcoming)" "$OUT"

# ============================================================
#  Summary
# ============================================================
echo ""
echo "=============================="
echo "  Results: $pass passed, $fail failed (out of $total)"
echo "=============================="

if [ "$fail" -gt 0 ]; then
  exit 1
fi
exit 0
