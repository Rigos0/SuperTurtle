#!/usr/bin/env bash
set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat <<'EOF'
Usage: bash super_turtle/e2b/remote.sh <command> [args...]

Commands:
  up                 Create/reuse sandbox, sync code, and start remote runtime
  status             Show sandbox lifecycle status
  pause              Pause sandbox
  resume             Resume paused sandbox
  stop               Kill sandbox
  sync               Sync local repo into remote sandbox
  reconcile-cron     Reconcile cron jobs after pause/resume windows

Examples:
  bash super_turtle/e2b/remote.sh up
  bash super_turtle/e2b/remote.sh status
  bash super_turtle/e2b/remote.sh sync
  bash super_turtle/e2b/remote.sh reconcile-cron --dry-run
EOF
}

die() {
  local msg="${1:?message required}"
  echo "[e2b-remote] ERROR: ${msg}" >&2
  exit 1
}

dispatch_handler() {
  local handler_rel="${1:?handler required}"
  shift || true

  local handler="${SCRIPT_DIR}/${handler_rel}"
  if [[ ! -f "${handler}" ]]; then
    die "command handler not found: ${handler}. Implement this script to enable the command."
  fi
  if [[ ! -r "${handler}" ]]; then
    die "command handler is not readable: ${handler}"
  fi

  exec bash "${handler}" "$@"
}

main() {
  if [[ $# -lt 1 ]]; then
    usage >&2
    exit 1
  fi

  local cmd="$1"
  shift || true

  case "${cmd}" in
    help|--help|-h)
      usage
      ;;
    up)
      dispatch_handler "up.sh" "$@"
      ;;
    status|pause|resume|stop)
      dispatch_handler "lifecycle.sh" "${cmd}" "$@"
      ;;
    sync)
      dispatch_handler "up.sh" --sync "$@"
      ;;
    reconcile-cron)
      dispatch_handler "reconcile-cron.sh" "$@"
      ;;
    *)
      usage >&2
      die "unknown command '${cmd}'"
      ;;
  esac
}

main "$@"
