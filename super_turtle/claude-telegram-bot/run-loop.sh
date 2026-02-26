#!/bin/bash
# Restart loop for the Telegram bot.
# Exit code 0 = intentional restart (e.g. /restart command) → re-launch.
# Any other exit code = real crash or Ctrl+C → stop.

cd "$(dirname "$0")"
RESTART_SELF_MARKER=".restart-self"

# Source environment variables
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

while true; do
    echo "[run-loop] Starting bot..."
    bun run src/index.ts
    EXIT_CODE=$?

    if [ "$EXIT_CODE" -eq 0 ]; then
        if [ -f "$RESTART_SELF_MARKER" ]; then
            echo "[run-loop] Detected self-restart marker — exiting loop."
            rm -f "$RESTART_SELF_MARKER"
            exit 0
        fi
        echo "[run-loop] Bot exited with code 0 — restarting in 1s..."
        sleep 1
    else
        echo "[run-loop] Bot exited with code $EXIT_CODE — stopping."
        exit "$EXIT_CODE"
    fi
done
