#!/usr/bin/env bash
set -uo pipefail

cd "$(dirname "$0")"

SESSION_NAME="${SUPERTURTLE_TMUX_SESSION:-superturtle-bot}"
WINDOW_NAME="${SUPERTURTLE_TMUX_WINDOW:-bot}"
LOOP_LOG_PATH="${SUPERTURTLE_LOOP_LOG_PATH:-/tmp/claude-telegram-bot-ts.log}"
RUN_CMD="cd \"$PWD\" && export SUPERTURTLE_RUN_LOOP=1 && export SUPERTURTLE_LOOP_LOG_PATH=\"$LOOP_LOG_PATH\" && caffeinate -s ./run-loop.sh 2>&1 | tee -a \"$LOOP_LOG_PATH\""

if ! command -v tmux >/dev/null 2>&1; then
  echo "[live] ERROR: tmux is required. Install it with: brew install tmux"
  exit 1
fi

if ! command -v caffeinate >/dev/null 2>&1; then
  echo "[live] ERROR: caffeinate is required on macOS."
  exit 1
fi

if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  echo "[live] Reusing session: $SESSION_NAME"
else
  echo "[live] Creating session: $SESSION_NAME"
  tmux new-session -d -s "$SESSION_NAME" -n "$WINDOW_NAME" "$RUN_CMD"
fi

if [[ -n "${TMUX:-}" ]]; then
  exec tmux switch-client -t "$SESSION_NAME"
fi

exec tmux attach -t "$SESSION_NAME"
