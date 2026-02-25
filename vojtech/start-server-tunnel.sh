#!/bin/bash
set -euo pipefail

# start-server-tunnel.sh — Start Python HTTP server + cloudflared tunnel, write URL to .tunnel-url
#
# Usage:
#   ./start-server-tunnel.sh [port] [workspace-dir]
#
# Args:
#   port           — HTTP server port (default: 3001)
#   workspace-dir  — SubTurtle workspace (where .tunnel-url is written). Default: .
#
# Output:
#   Prints the tunnel URL to stdout
#   Writes the URL to workspace-dir/.tunnel-url
#   Keeps tunnel + HTTP server running in the background

PORT="${1:-3001}"
WORKSPACE_DIR="${2:-.}"

# Resolve to absolute paths
WORKSPACE_DIR="$(cd "$WORKSPACE_DIR" && pwd)"

TUNNEL_URL_FILE="${WORKSPACE_DIR}/.tunnel-url"
SERVER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# PIDs to track for cleanup
SERVER_PID=""
TUNNEL_PID=""
TUNNEL_OUTPUT=""

# Cleanup function: kill tracked processes
cleanup() {
  local exit_code=$?
  if [[ -n "$TUNNEL_OUTPUT" ]] && [[ -f "$TUNNEL_OUTPUT" ]]; then
    rm -f "$TUNNEL_OUTPUT"
  fi
  if [[ -n "$SERVER_PID" ]]; then
    kill -TERM "$SERVER_PID" 2>/dev/null || true
    sleep 0.2
    kill -9 "$SERVER_PID" 2>/dev/null || true
  fi
  if [[ -n "$TUNNEL_PID" ]]; then
    kill -TERM "$TUNNEL_PID" 2>/dev/null || true
    sleep 0.2
    kill -9 "$TUNNEL_PID" 2>/dev/null || true
  fi
  exit $exit_code
}

# Set trap to run cleanup on EXIT, INT, TERM
trap cleanup EXIT INT TERM

echo "[start-server-tunnel] Starting Python HTTP server in ${SERVER_DIR}:${PORT}..."
cd "$SERVER_DIR"
python3 -m http.server "$PORT" > /tmp/python_server.log 2>&1 &
SERVER_PID=$!

# Wait for server to be ready (poll with timeout)
echo "[start-server-tunnel] Waiting for HTTP server to be ready at http://localhost:${PORT}..."
WAIT_TIMEOUT=30
WAIT_START=$(date +%s)
while ! curl -s "http://localhost:${PORT}" > /dev/null 2>&1; do
  WAIT_ELAPSED=$(($(date +%s) - WAIT_START))
  if (( WAIT_ELAPSED >= WAIT_TIMEOUT )); then
    echo "[start-server-tunnel] ERROR: HTTP server did not respond after ${WAIT_TIMEOUT}s" >&2
    exit 1
  fi
  sleep 0.5
done
echo "[start-server-tunnel] HTTP server ready!"

# Start cloudflared tunnel, capture URL from stderr
echo "[start-server-tunnel] Starting cloudflared tunnel..."
TUNNEL_OUTPUT=$(mktemp)

cloudflared tunnel --url "http://localhost:${PORT}" > /dev/null 2> "$TUNNEL_OUTPUT" &
TUNNEL_PID=$!

# Wait for tunnel to be ready and extract URL from stderr
# cloudflared outputs: "Your quick tunnel has been created! Opening browser to ... https://xxx.trycloudflare.com"
TUNNEL_WAIT_TIMEOUT=10
TUNNEL_WAIT_START=$(date +%s)
TUNNEL_URL=""
while [[ -z "$TUNNEL_URL" ]] && kill -0 $TUNNEL_PID 2>/dev/null; do
  TUNNEL_WAIT_ELAPSED=$(($(date +%s) - TUNNEL_WAIT_START))
  if (( TUNNEL_WAIT_ELAPSED >= TUNNEL_WAIT_TIMEOUT )); then
    echo "[start-server-tunnel] ERROR: cloudflared did not produce URL after ${TUNNEL_WAIT_TIMEOUT}s" >&2
    exit 1
  fi
  # Extract URL from the output file (cloudflared writes to stderr)
  # Pattern: https://xxxx.trycloudflare.com
  TUNNEL_URL=$(grep -oE 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com' "$TUNNEL_OUTPUT" | head -1 || echo "")
  if [[ -z "$TUNNEL_URL" ]]; then
    sleep 0.2
  fi
done

if [[ -z "$TUNNEL_URL" ]]; then
  echo "[start-server-tunnel] ERROR: failed to extract tunnel URL" >&2
  exit 1
fi

# Write URL to workspace file and stdout
echo "$TUNNEL_URL" > "$TUNNEL_URL_FILE"
echo "[start-server-tunnel] Tunnel started! URL written to ${TUNNEL_URL_FILE}"
echo "$TUNNEL_URL"

# Keep the script running to maintain the trap handler
# The processes will be cleaned up when this script is killed
# Use wait to block on child processes so signals are properly handled
(
  wait $SERVER_PID 2>/dev/null
  SERVER_EXIT=$?
) &
SERVER_WAIT_PID=$!

(
  wait $TUNNEL_PID 2>/dev/null
  TUNNEL_EXIT=$?
) &
TUNNEL_WAIT_PID=$!

# Wait for either child process to exit
while kill -0 "$SERVER_PID" 2>/dev/null && kill -0 "$TUNNEL_PID" 2>/dev/null; do
  sleep 1
done

# If we get here, one of the processes died unexpectedly
if ! kill -0 "$SERVER_PID" 2>/dev/null; then
  echo "[start-server-tunnel] HTTP server died unexpectedly" >&2
  exit 1
fi
if ! kill -0 "$TUNNEL_PID" 2>/dev/null; then
  echo "[start-server-tunnel] Tunnel died unexpectedly" >&2
  exit 1
fi
