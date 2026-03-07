#!/usr/bin/env bash
set -euo pipefail

# Redeploy Super Turtle locally: install deps + reinstall global CLI
# Usage: ./redeploy.sh

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "==> Installing bot dependencies..."
cd "$REPO_ROOT/super_turtle/claude-telegram-bot"
bun install

echo "==> Installing superturtle globally..."
npm install -g "$REPO_ROOT/super_turtle"

echo ""
echo "Done. Verify with:"
echo "  superturtle --version"
