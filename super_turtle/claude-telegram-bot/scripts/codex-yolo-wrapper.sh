#!/usr/bin/env bash
set -euo pipefail

REAL_CODEX="/opt/homebrew/bin/codex"
if [[ ! -x "${REAL_CODEX}" ]]; then
  REAL_CODEX="$(command -v codex)"
fi

if [[ "${1:-}" == "exec" ]]; then
  shift
  exec "${REAL_CODEX}" exec --yolo "$@"
fi

exec "${REAL_CODEX}" "$@"
