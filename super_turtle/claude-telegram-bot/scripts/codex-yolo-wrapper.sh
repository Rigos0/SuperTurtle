#!/usr/bin/env bash
set -euo pipefail

# Find the real codex binary — platform-aware with multiple fallbacks.
REAL_CODEX=""
if command -v codex >/dev/null 2>&1; then
  REAL_CODEX="$(command -v codex)"
elif [[ "$(uname -s)" == "Darwin" ]]; then
  # macOS: try Homebrew (Apple Silicon, then Intel)
  for p in /opt/homebrew/bin/codex /usr/local/bin/codex; do
    [[ -x "$p" ]] && REAL_CODEX="$p" && break
  done
else
  # Linux: try common install locations
  for p in "${HOME}/.local/bin/codex" /usr/local/bin/codex /usr/bin/codex; do
    [[ -x "$p" ]] && REAL_CODEX="$p" && break
  done
fi

if [[ -z "${REAL_CODEX}" ]]; then
  echo "ERROR: codex binary not found in PATH or standard locations" >&2
  exit 1
fi

if [[ "${1:-}" == "exec" ]]; then
  shift
  exec "${REAL_CODEX}" exec --yolo "$@"
fi

exec "${REAL_CODEX}" "$@"
