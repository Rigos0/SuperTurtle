#!/bin/bash
set -euo pipefail

# serve.sh — Generate a greeting site from template and serve it via cloudflared tunnel
#
# Usage:
#   ./serve.sh <name> [message] [port]
#
# Args:
#   name     — The person to greet (required)
#   message  — Custom message (default: "Someone wanted to say hello. Hope this brightens your day!")
#   port     — HTTP port (default: 8787)
#
# Output:
#   Prints the tunnel URL to stdout
#   Keeps server + tunnel running until killed (Ctrl+C or SIGTERM)

NAME="${1:?Usage: serve.sh <name> [message] [port]}"
MESSAGE="${2:-Someone wanted to say hello. Hope this brightens your day!}"
PORT="${3:-8787}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE="${SCRIPT_DIR}/template.html"
WORK_DIR=$(mktemp -d)

# PIDs for cleanup
SERVER_PID=""
TUNNEL_PID=""
TUNNEL_OUTPUT=""

cleanup() {
  local exit_code=$?
  [[ -n "$TUNNEL_OUTPUT" ]] && [[ -f "$TUNNEL_OUTPUT" ]] && rm -f "$TUNNEL_OUTPUT"
  [[ -n "$SERVER_PID" ]] && kill -TERM "$SERVER_PID" 2>/dev/null || true
  [[ -n "$TUNNEL_PID" ]] && kill -TERM "$TUNNEL_PID" 2>/dev/null || true
  sleep 0.3
  [[ -n "$SERVER_PID" ]] && kill -9 "$SERVER_PID" 2>/dev/null || true
  [[ -n "$TUNNEL_PID" ]] && kill -9 "$TUNNEL_PID" 2>/dev/null || true
  rm -rf "$WORK_DIR"
  exit $exit_code
}

trap cleanup EXIT INT TERM

# Stamp template
echo "[greeting] Generating site for: ${NAME}"
sed -e "s/{{NAME}}/${NAME}/g" -e "s/{{MESSAGE}}/${MESSAGE}/g" "$TEMPLATE" > "${WORK_DIR}/index.html"

# Start simple HTTP server
echo "[greeting] Starting HTTP server on port ${PORT}..."
python3 -m http.server "$PORT" --directory "$WORK_DIR" > /dev/null 2>&1 &
SERVER_PID=$!

# Wait for server to be ready
sleep 1
if ! kill -0 "$SERVER_PID" 2>/dev/null; then
  echo "[greeting] ERROR: HTTP server failed to start" >&2
  exit 1
fi
echo "[greeting] Server ready at http://localhost:${PORT}"

# Start cloudflared tunnel
echo "[greeting] Starting cloudflared tunnel..."
TUNNEL_OUTPUT=$(mktemp)
cloudflared tunnel --url "http://localhost:${PORT}" > /dev/null 2> "$TUNNEL_OUTPUT" &
TUNNEL_PID=$!

# Wait for tunnel URL
TUNNEL_WAIT_TIMEOUT=15
TUNNEL_WAIT_START=$(date +%s)
TUNNEL_URL=""
while [[ -z "$TUNNEL_URL" ]] && kill -0 "$TUNNEL_PID" 2>/dev/null; do
  TUNNEL_WAIT_ELAPSED=$(($(date +%s) - TUNNEL_WAIT_START))
  if (( TUNNEL_WAIT_ELAPSED >= TUNNEL_WAIT_TIMEOUT )); then
    echo "[greeting] ERROR: cloudflared did not produce URL after ${TUNNEL_WAIT_TIMEOUT}s" >&2
    exit 1
  fi
  TUNNEL_URL=$(grep -oE 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com' "$TUNNEL_OUTPUT" | head -1 || echo "")
  [[ -z "$TUNNEL_URL" ]] && sleep 0.3
done

if [[ -z "$TUNNEL_URL" ]]; then
  echo "[greeting] ERROR: failed to extract tunnel URL" >&2
  exit 1
fi

echo "[greeting] ✅ Live at: ${TUNNEL_URL}"
echo ""
echo "TUNNEL_URL=${TUNNEL_URL}"

# Keep alive
while kill -0 "$SERVER_PID" 2>/dev/null && kill -0 "$TUNNEL_PID" 2>/dev/null; do
  sleep 2
done

if ! kill -0 "$SERVER_PID" 2>/dev/null; then
  echo "[greeting] Server died unexpectedly" >&2
  exit 1
fi
if ! kill -0 "$TUNNEL_PID" 2>/dev/null; then
  echo "[greeting] Tunnel died unexpectedly" >&2
  exit 1
fi
