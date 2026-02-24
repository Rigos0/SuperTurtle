#!/bin/bash
set -euo pipefail

# start-tunnel.sh — Start dev server + cloudflared tunnel, write URL to .tunnel-url
#
# Usage:
#   ./start-tunnel.sh <project-dir> [port] [workspace-dir]
#
# Args:
#   project-dir    — Root of the project (where npm run dev runs)
#   port           — Dev server port (default: 3000)
#   workspace-dir  — SubTurtle workspace (where .tunnel-url is written). If not provided,
#                    uses cwd as the workspace directory
#
# Output:
#   Prints the tunnel URL to stdout
#   Writes the URL to workspace-dir/.tunnel-url
#   Keeps tunnel + dev server running in the background

PROJECT_DIR="${1:?project-dir required}"
PORT="${2:-3000}"
WORKSPACE_DIR="${3:-.}"

# Resolve to absolute paths
PROJECT_DIR="$(cd "$PROJECT_DIR" && pwd)"
WORKSPACE_DIR="$(cd "$WORKSPACE_DIR" && pwd)"

TUNNEL_URL_FILE="${WORKSPACE_DIR}/.tunnel-url"

echo "[start-tunnel] Starting npm dev server in ${PROJECT_DIR}:${PORT}..."
cd "$PROJECT_DIR"
npm run dev > /dev/null 2>&1 &
DEV_PID=$!

# Wait for dev server to be ready (poll with timeout)
echo "[start-tunnel] Waiting for dev server to be ready at http://localhost:${PORT}..."
WAIT_TIMEOUT=30
WAIT_ELAPSED=0
while ! curl -s "http://localhost:${PORT}" > /dev/null 2>&1; do
  if (( WAIT_ELAPSED >= WAIT_TIMEOUT )); then
    kill $DEV_PID 2>/dev/null || true
    echo "[start-tunnel] ERROR: dev server did not respond after ${WAIT_TIMEOUT}s" >&2
    exit 1
  fi
  sleep 0.5
  WAIT_ELAPSED=$((WAIT_ELAPSED + 1))
done
echo "[start-tunnel] Dev server ready!"

# Start cloudflared tunnel, capture URL from stderr
echo "[start-tunnel] Starting cloudflared tunnel..."
TUNNEL_OUTPUT=$(mktemp)
trap "rm -f $TUNNEL_OUTPUT" EXIT

cloudflared tunnel --url "http://localhost:${PORT}" > /dev/null 2> "$TUNNEL_OUTPUT" &
TUNNEL_PID=$!

# Wait for tunnel to be ready and extract URL from stderr
# cloudflared outputs: "Your quick tunnel has been created! Opening browser to ... https://xxx.trycloudflare.com"
TUNNEL_WAIT_TIMEOUT=10
TUNNEL_WAIT_ELAPSED=0
TUNNEL_URL=""
while [[ -z "$TUNNEL_URL" ]] && kill -0 $TUNNEL_PID 2>/dev/null; do
  if (( TUNNEL_WAIT_ELAPSED >= TUNNEL_WAIT_TIMEOUT )); then
    kill $DEV_PID 2>/dev/null || true
    kill $TUNNEL_PID 2>/dev/null || true
    echo "[start-tunnel] ERROR: cloudflared did not produce URL after ${TUNNEL_WAIT_TIMEOUT}s" >&2
    exit 1
  fi
  # Extract URL from the output file (cloudflared writes to stderr)
  # Pattern: https://xxxx.trycloudflare.com
  TUNNEL_URL=$(grep -oE 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com' "$TUNNEL_OUTPUT" | head -1 || echo "")
  if [[ -z "$TUNNEL_URL" ]]; then
    sleep 0.2
    TUNNEL_WAIT_ELAPSED=$((TUNNEL_WAIT_ELAPSED + 1))
  fi
done

if [[ -z "$TUNNEL_URL" ]]; then
  kill $DEV_PID 2>/dev/null || true
  kill $TUNNEL_PID 2>/dev/null || true
  echo "[start-tunnel] ERROR: failed to extract tunnel URL" >&2
  exit 1
fi

# Write URL to workspace file and stdout
echo "$TUNNEL_URL" > "$TUNNEL_URL_FILE"
echo "[start-tunnel] Tunnel started! URL written to ${TUNNEL_URL_FILE}"
echo "$TUNNEL_URL"

# Exit and let processes continue in the background (part of the SubTurtle process group)
# They will be cleaned up when the SubTurtle process group is killed
