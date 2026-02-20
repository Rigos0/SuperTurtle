#!/usr/bin/env bash
set -euo pipefail

PROMPT="${1:?Usage: handoff.sh <prompt>}"

echo "[stage 1] claude planning..."
claude --permission-mode plan --dangerously-skip-permissions -p "$PROMPT" | tee /tmp/handoff_plan.txt

echo ""
echo "[stage 1] plan saved to /tmp/handoff_plan.txt"
echo ""

echo "[stage 2] codex implementing..."
PLAN=$(cat /tmp/handoff_plan.txt)
codex exec --yolo "Implement the following plan.

$PLAN"
