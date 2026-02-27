#!/usr/bin/env bash
set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly STATE_SCRIPT="${SCRIPT_DIR}/state.sh"
readonly E2B_BIN="${E2B_BIN:-e2b}"

LIFECYCLE_CMD=""
SANDBOX_ID_OVERRIDE=""

usage() {
  cat <<'EOF'
Usage: bash super_turtle/e2b/lifecycle.sh <status|pause|resume|stop> [options]

Commands:
  status              Show sandbox lifecycle status from local state + E2B
  pause               Pause sandbox (idempotent)
  resume              Resume sandbox via connect (idempotent)
  stop                Kill sandbox (idempotent)

Options:
  --sandbox-id <id>   Operate on explicit sandbox id instead of local state
  -h, --help          Show this help

Environment:
  E2B_API_KEY               API key used by E2B CLI auth
  E2B_SKIP_AUTH_CHECK=1     Skip 'e2b auth info' preflight
EOF
}

log() {
  local msg="${1:?message required}"
  echo "[e2b-lifecycle] ${msg}"
}

die() {
  local msg="${1:?message required}"
  echo "[e2b-lifecycle] ERROR: ${msg}" >&2
  exit 1
}

choose_python() {
  if command -v python3 >/dev/null 2>&1; then
    echo "python3"
    return
  fi
  if command -v python >/dev/null 2>&1; then
    echo "python"
    return
  fi
  echo ""
}

readonly PYTHON_BIN="$(choose_python)"

require_cmd() {
  local cmd="${1:?command required}"
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    die "required command not found: ${cmd}"
  fi
}

state_cmd() {
  bash "${STATE_SCRIPT}" "$@"
}

now_utc() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

parse_args() {
  if [[ $# -lt 1 ]]; then
    usage >&2
    exit 1
  fi

  LIFECYCLE_CMD="$1"
  shift || true

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --sandbox-id)
        SANDBOX_ID_OVERRIDE="${2:-}"
        [[ -n "${SANDBOX_ID_OVERRIDE}" ]] || die "--sandbox-id requires a value"
        shift 2
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        usage >&2
        die "unknown option: $1"
        ;;
    esac
  done
}

require_common_preflight() {
  [[ -n "${PYTHON_BIN}" ]] || die "python3/python is required"
  [[ -f "${STATE_SCRIPT}" ]] || die "missing state helper: ${STATE_SCRIPT}"
  state_cmd init
}

auth_check_soft() {
  if [[ "${E2B_SKIP_AUTH_CHECK:-0}" == "1" ]]; then
    return 0
  fi
  "${E2B_BIN}" auth info >/dev/null 2>&1
}

require_remote_access() {
  require_cmd "${E2B_BIN}"
  if ! auth_check_soft; then
    die "E2B auth missing. Export E2B_API_KEY or run 'e2b auth login' first."
  fi
}

resolve_target_sandbox_id() {
  local from_state
  from_state="$(state_cmd get sandbox_id || true)"

  if [[ -n "${SANDBOX_ID_OVERRIDE}" ]]; then
    echo "${SANDBOX_ID_OVERRIDE}"
    return
  fi

  echo "${from_state}"
}

tracked_state_matches() {
  local target_id="${1:?target sandbox id required}"
  local tracked_id
  tracked_id="$(state_cmd get sandbox_id || true)"

  [[ -n "${tracked_id}" && "${tracked_id}" == "${target_id}" ]]
}

update_local_status_if_tracked() {
  local target_id="${1:?target sandbox id required}"
  local new_status="${2:?new status required}"
  local bump_resumed_at="${3:-0}"

  if ! tracked_state_matches "${target_id}"; then
    return 0
  fi

  case "${new_status}" in
    running|paused|killed|unknown)
      ;;
    *)
      die "invalid local status transition: ${new_status}"
      ;;
  esac

  if [[ "${new_status}" == "running" && "${bump_resumed_at}" == "1" ]]; then
    state_cmd update status "${new_status}" resumed_at "$(now_utc)" >/dev/null
    return 0
  fi

  state_cmd update status "${new_status}" >/dev/null
}

list_sandboxes_json() {
  local output

  if output="$("${E2B_BIN}" sandbox list --json 2>/dev/null)"; then
    printf '%s' "${output}"
    return 0
  fi

  if output="$("${E2B_BIN}" sandbox list -f json 2>/dev/null)"; then
    printf '%s' "${output}"
    return 0
  fi

  if output="$("${E2B_BIN}" sandbox list --format json 2>/dev/null)"; then
    printf '%s' "${output}"
    return 0
  fi

  return 1
}

extract_remote_state_from_list_json() {
  local target_id="${1:?target sandbox id required}"
  local list_json="${2:-}"

  E2B_LIST_JSON="${list_json}" "${PYTHON_BIN}" - "${target_id}" <<'PY'
import json
import re
import sys
import os

sandbox_id = sys.argv[1]
raw = os.environ.get("E2B_LIST_JSON", "")
if not raw:
    sys.exit(2)

clean = re.sub(r"\x1b\[[0-9;]*[A-Za-z]", "", raw)

try:
    parsed = json.loads(clean)
except json.JSONDecodeError:
    sys.exit(2)

items = []
if isinstance(parsed, list):
    items = parsed
elif isinstance(parsed, dict):
    for key in ("sandboxes", "items", "data"):
        value = parsed.get(key)
        if isinstance(value, list):
            items = value
            break

matched = None
for item in items:
    if not isinstance(item, dict):
        continue

    candidate = item.get("sandboxId") or item.get("sandbox_id") or item.get("id")
    if not isinstance(candidate, str):
        continue
    if candidate.strip() == sandbox_id:
        matched = item
        break

if matched is None:
    sys.exit(1)

raw_state = ""
for key in ("state", "status", "lifecycleState", "sandboxState"):
    value = matched.get(key)
    if isinstance(value, str) and value.strip():
        raw_state = value.strip().lower()
        break

if "pause" in raw_state:
    print("paused")
    sys.exit(0)
if any(token in raw_state for token in ("kill", "stop", "dead", "destroy", "terminat")):
    print("killed")
    sys.exit(0)
if any(token in raw_state for token in ("run", "ready", "active", "resume")):
    print("running")
    sys.exit(0)

print("unknown")
sys.exit(0)
PY
}

remote_state_for_sandbox() {
  local sandbox_id="${1:?sandbox id required}"

  if ! command -v "${E2B_BIN}" >/dev/null 2>&1; then
    return 10
  fi
  if ! auth_check_soft; then
    return 11
  fi

  local list_json
  if ! list_json="$(list_sandboxes_json)"; then
    return 12
  fi

  local parsed_state
  if parsed_state="$(extract_remote_state_from_list_json "${sandbox_id}" "${list_json}")"; then
    printf '%s\n' "${parsed_state}"
    return 0
  fi

  case "$?" in
    1)
      return 3
      ;;
    *)
      return 4
      ;;
  esac
}

status_lines() {
  local sandbox_id="${1:-}"
  local local_status="${2:-unknown}"
  local remote_status="${3:-unavailable}"
  local effective_status="${4:-unknown}"
  local template="${5:-}"
  local created_at="${6:-}"
  local resumed_at="${7:-}"
  local updated_at="${8:-}"

  printf 'sandbox_id=%s\n' "${sandbox_id}"
  printf 'template=%s\n' "${template}"
  printf 'local_status=%s\n' "${local_status}"
  printf 'remote_status=%s\n' "${remote_status}"
  printf 'effective_status=%s\n' "${effective_status}"
  printf 'created_at=%s\n' "${created_at}"
  printf 'resumed_at=%s\n' "${resumed_at}"
  printf 'updated_at=%s\n' "${updated_at}"
}

cmd_status() {
  local tracked_id
  tracked_id="$(state_cmd get sandbox_id || true)"

  local sandbox_id
  sandbox_id="$(resolve_target_sandbox_id)"

  local template local_status created_at resumed_at updated_at
  template="$(state_cmd get template || true)"
  local_status="$(state_cmd get status || true)"
  created_at="$(state_cmd get created_at || true)"
  resumed_at="$(state_cmd get resumed_at || true)"
  updated_at="$(state_cmd get updated_at || true)"

  if [[ -z "${sandbox_id}" ]]; then
    status_lines "" "uninitialized" "unavailable" "uninitialized" "${template}" "${created_at}" "${resumed_at}" "${updated_at}"
    return 0
  fi

  local remote_status="unavailable"
  local effective_status="${local_status:-unknown}"

  if remote_status="$(remote_state_for_sandbox "${sandbox_id}")"; then
    effective_status="${remote_status}"
  else
    case "$?" in
      3)
        remote_status="missing"
        effective_status="killed"
        ;;
      10|11|12)
        remote_status="unavailable"
        effective_status="${local_status:-unknown}"
        ;;
      *)
        remote_status="unknown"
        effective_status="unknown"
        ;;
    esac
  fi

  case "${effective_status}" in
    running|paused|killed|unknown|uninitialized)
      ;;
    *)
      effective_status="unknown"
      ;;
  esac

  if [[ -z "${SANDBOX_ID_OVERRIDE}" && -n "${tracked_id}" && "${tracked_id}" == "${sandbox_id}" ]]; then
    if [[ "${effective_status}" != "${local_status}" && "${effective_status}" != "uninitialized" ]]; then
      update_local_status_if_tracked "${sandbox_id}" "${effective_status}" 0
      local_status="${effective_status}"
      updated_at="$(state_cmd get updated_at || true)"
    fi
  fi

  status_lines "${sandbox_id}" "${local_status:-unknown}" "${remote_status}" "${effective_status}" "${template}" "${created_at}" "${resumed_at}" "${updated_at}"
}

cmd_pause() {
  local sandbox_id
  sandbox_id="$(resolve_target_sandbox_id)"
  [[ -n "${sandbox_id}" ]] || die "no sandbox id configured. Run 'bash super_turtle/e2b/remote.sh up' first or pass --sandbox-id."

  require_remote_access

  local remote_status="unknown"
  if remote_status="$(remote_state_for_sandbox "${sandbox_id}")"; then
    :
  else
    case "$?" in
      3)
        die "sandbox '${sandbox_id}' not found remotely; cannot pause"
        ;;
      *)
        remote_status="unknown"
        ;;
    esac
  fi

  case "${remote_status}" in
    paused)
      log "sandbox ${sandbox_id} is already paused"
      update_local_status_if_tracked "${sandbox_id}" "paused" 0
      return 0
      ;;
    killed)
      die "sandbox '${sandbox_id}' is already killed; cannot pause"
      ;;
  esac

  local pause_out
  if ! pause_out="$("${E2B_BIN}" sandbox pause "${sandbox_id}" 2>&1)"; then
    echo "${pause_out}" >&2
    die "failed to pause sandbox '${sandbox_id}'"
  fi

  update_local_status_if_tracked "${sandbox_id}" "paused" 0
  log "paused sandbox ${sandbox_id}"
}

cmd_resume() {
  local sandbox_id
  sandbox_id="$(resolve_target_sandbox_id)"
  [[ -n "${sandbox_id}" ]] || die "no sandbox id configured. Run 'bash super_turtle/e2b/remote.sh up' first or pass --sandbox-id."

  require_remote_access

  local remote_status="unknown"
  if remote_status="$(remote_state_for_sandbox "${sandbox_id}")"; then
    :
  else
    case "$?" in
      3)
        die "sandbox '${sandbox_id}' not found remotely; cannot resume"
        ;;
      *)
        remote_status="unknown"
        ;;
    esac
  fi

  if [[ "${remote_status}" == "killed" ]]; then
    die "sandbox '${sandbox_id}' is killed; create a new sandbox with 'up'"
  fi

  if [[ "${remote_status}" == "running" ]]; then
    log "sandbox ${sandbox_id} is already running"
    update_local_status_if_tracked "${sandbox_id}" "running" 0
    return 0
  fi

  if ! printf 'exit\n' | "${E2B_BIN}" sandbox connect "${sandbox_id}" >/dev/null 2>&1; then
    die "failed to resume sandbox '${sandbox_id}' via connect"
  fi

  update_local_status_if_tracked "${sandbox_id}" "running" 1
  log "resumed sandbox ${sandbox_id}"
}

cmd_stop() {
  local sandbox_id
  sandbox_id="$(resolve_target_sandbox_id)"
  [[ -n "${sandbox_id}" ]] || die "no sandbox id configured. Run 'bash super_turtle/e2b/remote.sh up' first or pass --sandbox-id."

  require_remote_access

  local remote_status="unknown"
  if remote_status="$(remote_state_for_sandbox "${sandbox_id}")"; then
    :
  else
    case "$?" in
      3)
        log "sandbox ${sandbox_id} already absent remotely"
        update_local_status_if_tracked "${sandbox_id}" "killed" 0
        return 0
        ;;
      *)
        remote_status="unknown"
        ;;
    esac
  fi

  if [[ "${remote_status}" == "killed" ]]; then
    log "sandbox ${sandbox_id} is already killed"
    update_local_status_if_tracked "${sandbox_id}" "killed" 0
    return 0
  fi

  local kill_out
  if ! kill_out="$("${E2B_BIN}" sandbox kill "${sandbox_id}" 2>&1)"; then
    local normalized
    normalized="${kill_out,,}"
    if [[ "${normalized}" == *"not found"* || "${normalized}" == *"already"* ]]; then
      log "sandbox ${sandbox_id} already stopped"
      update_local_status_if_tracked "${sandbox_id}" "killed" 0
      return 0
    fi
    echo "${kill_out}" >&2
    die "failed to stop sandbox '${sandbox_id}'"
  fi

  update_local_status_if_tracked "${sandbox_id}" "killed" 0
  log "stopped sandbox ${sandbox_id}"
}

main() {
  parse_args "$@"
  require_common_preflight

  case "${LIFECYCLE_CMD}" in
    status)
      cmd_status
      ;;
    pause)
      cmd_pause
      ;;
    resume)
      cmd_resume
      ;;
    stop)
      cmd_stop
      ;;
    *)
      usage >&2
      die "unknown lifecycle command: ${LIFECYCLE_CMD}"
      ;;
  esac
}

main "$@"
