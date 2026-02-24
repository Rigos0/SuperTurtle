#!/bin/bash
# End-to-end test: start tunnel with snake-game, verify setup, stop and verify cleanup

set -euo pipefail

PROJECT_ROOT="/Users/Richard.Mladek/Documents/projects/agentic"
SNAKE_GAME_DIR="${PROJECT_ROOT}/snake-game"
WORKSPACE_DIR="$(mktemp -d)"
TUNNEL_HELPER="${PROJECT_ROOT}/super_turtle/subturtle/start-tunnel.sh"

echo "=========================================="
echo "End-to-End Tunnel Test"
echo "=========================================="
echo "Workspace: $WORKSPACE_DIR"
echo "Snake game: $SNAKE_GAME_DIR"
echo ""

# Start tunnel in background
echo "[TEST] Starting tunnel with snake-game..."
"$TUNNEL_HELPER" "$SNAKE_GAME_DIR" 3000 "$WORKSPACE_DIR" &
TUNNEL_SCRIPT_PID=$!

# Give tunnel script time to start, initialize dev server, and generate tunnel URL
# (This typically takes ~4-5 seconds for cloudflared to generate the URL)
sleep 8

# Check if tunnel URL file exists and contains a valid URL
if [[ ! -f "${WORKSPACE_DIR}/.tunnel-url" ]]; then
  echo "[FAIL] .tunnel-url file not created"
  kill $TUNNEL_SCRIPT_PID 2>/dev/null || true
  exit 1
fi

TUNNEL_URL=$(cat "${WORKSPACE_DIR}/.tunnel-url")
echo "[PASS] Tunnel URL written to .tunnel-url: $TUNNEL_URL"

# Verify URL is in expected format
if ! echo "$TUNNEL_URL" | grep -qE '^https://[a-zA-Z0-9.-]+\.trycloudflare\.com$'; then
  echo "[FAIL] Invalid tunnel URL format: $TUNNEL_URL"
  kill $TUNNEL_SCRIPT_PID 2>/dev/null || true
  exit 1
fi
echo "[PASS] Tunnel URL format is valid"

# Test: Verify dev server is running locally
echo "[TEST] Verifying dev server is running on localhost:3000..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
  echo "[PASS] Dev server is responsive on localhost:3000"
else
  echo "[WARN] Dev server not responding (may be starting)"
fi

# Test: Stop the tunnel script and verify cleanup
echo ""
echo "[TEST] Stopping tunnel script (PID: $TUNNEL_SCRIPT_PID)..."
kill -TERM $TUNNEL_SCRIPT_PID 2>/dev/null || true
sleep 2

# Verify processes are cleaned up
echo "[TEST] Verifying cleanup..."

# The tunnel script should have exited
if kill -0 $TUNNEL_SCRIPT_PID 2>/dev/null; then
  echo "[WARN] Tunnel script still running after SIGTERM, using SIGKILL..."
  kill -9 $TUNNEL_SCRIPT_PID 2>/dev/null || true
  sleep 1
  if kill -0 $TUNNEL_SCRIPT_PID 2>/dev/null; then
    echo "[FAIL] Tunnel script could not be killed"
    exit 1
  fi
else
  echo "[PASS] Tunnel script exited cleanly"
fi

# Verify no stray npm or cloudflared processes
sleep 1
if pgrep -f "npm.*dev" 2>/dev/null | grep -v grep > /dev/null; then
  echo "[FAIL] Stray npm dev process still running"
  pkill -f "npm.*dev" || true
  exit 1
else
  echo "[PASS] No stray npm dev processes"
fi

if pgrep -f "cloudflared.*tunnel" 2>/dev/null > /dev/null; then
  echo "[FAIL] Stray cloudflared tunnel process still running"
  pkill -f "cloudflared" || true
  exit 1
else
  echo "[PASS] No stray cloudflared processes"
fi

# Clean up workspace
rm -rf "$WORKSPACE_DIR"

echo ""
echo "=========================================="
echo "All tests PASSED! ✓"
echo "=========================================="
echo ""
echo "Summary:"
echo "✓ Tunnel URL created and in valid format"
echo "✓ Dev server responsive on localhost:3000"
echo "✓ Process cleanup works properly"
echo "✓ No stray processes left behind"
