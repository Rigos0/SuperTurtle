#!/usr/bin/env bash
set -euo pipefail

readonly E2B_STATE_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly E2B_STATE_SCHEMA_VERSION=1
readonly E2B_STATE_DEFAULT_FILE="${E2B_STATE_SCRIPT_DIR}/.state.json"
readonly E2B_STATE_FILE="${E2B_STATE_FILE:-${E2B_STATE_DEFAULT_FILE}}"

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

readonly E2B_STATE_PYTHON="$(choose_python)"

state_usage() {
  cat <<'EOF_USAGE'
Usage: bash super_turtle/e2b/state.sh <command> [args...]

Commands:
  path                              Print the state file path
  init                              Create default state file when missing
  show                              Print current state JSON
  get <field>                       Print one field value
  update <key> <value> [...]        Upsert one or more state fields
  clear                             Reset state to default empty values
  validate                          Validate state schema/content
  recover-stale [--skip-remote]     Recover invalid/stale state entries

State fields:
  sandbox_id, template, status, created_at, resumed_at, updated_at

Status values:
  uninitialized, running, paused, killed, unknown
EOF_USAGE
}

state_die() {
  local msg="${1:?message required}"
  echo "[e2b-state] ERROR: ${msg}" >&2
  exit 1
}

state_require_python() {
  if [[ -z "${E2B_STATE_PYTHON}" ]]; then
    state_die "python3/python is required for JSON state handling"
  fi
}

state_file_dir() {
  dirname "${E2B_STATE_FILE}"
}

state_now_utc() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

state_write_json_atomically() {
  local json_payload="${1:?json payload required}"
  mkdir -p "$(state_file_dir)"

  local tmp_file="${E2B_STATE_FILE}.tmp.$$"
  umask 077
  printf '%s\n' "${json_payload}" > "${tmp_file}"
  mv "${tmp_file}" "${E2B_STATE_FILE}"
}

state_default_json() {
  state_require_python
  "${E2B_STATE_PYTHON}" - "$(state_now_utc)" "${E2B_STATE_SCHEMA_VERSION}" <<'PY'
import json
import sys

updated_at = sys.argv[1]
version = int(sys.argv[2])

state = {
    "version": version,
    "sandbox_id": "",
    "template": "",
    "status": "uninitialized",
    "created_at": "",
    "resumed_at": "",
    "updated_at": updated_at,
}

print(json.dumps(state, indent=2))
PY
}

state_init() {
  if [[ -f "${E2B_STATE_FILE}" ]]; then
    return 0
  fi
  state_write_json_atomically "$(state_default_json)"
}

state_read_json() {
  state_init
  cat "${E2B_STATE_FILE}"
}

state_validate() {
  state_require_python
  state_init

  "${E2B_STATE_PYTHON}" - "${E2B_STATE_FILE}" "${E2B_STATE_SCHEMA_VERSION}" <<'PY'
import datetime as dt
import json
import re
import sys
from pathlib import Path

state_path = Path(sys.argv[1])
expected_version = int(sys.argv[2])

required_fields = (
    "version",
    "sandbox_id",
    "template",
    "status",
    "created_at",
    "resumed_at",
    "updated_at",
)

valid_statuses = {"uninitialized", "running", "paused", "killed", "unknown"}
timestamp_re = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")

errors: list[str] = []

try:
    raw = state_path.read_text(encoding="utf-8")
except OSError as exc:
    print(f"failed to read state file: {exc}", file=sys.stderr)
    sys.exit(1)

try:
    parsed = json.loads(raw)
except json.JSONDecodeError as exc:
    print(f"state file is not valid JSON: {exc}", file=sys.stderr)
    sys.exit(1)

if not isinstance(parsed, dict):
    print("state must be a JSON object", file=sys.stderr)
    sys.exit(1)

for field in required_fields:
    if field not in parsed:
        errors.append(f"missing required field: {field}")

if errors:
    for err in errors:
        print(err, file=sys.stderr)
    sys.exit(1)

if parsed["version"] != expected_version:
    errors.append(
        f"unsupported version {parsed['version']} (expected {expected_version})"
    )

for field in ("sandbox_id", "template", "status", "created_at", "resumed_at", "updated_at"):
    if not isinstance(parsed[field], str):
        errors.append(f"{field} must be a string")

status = parsed["status"]
if isinstance(status, str) and status not in valid_statuses:
    errors.append(
        "status must be one of: " + ", ".join(sorted(valid_statuses))
    )

for field in ("created_at", "resumed_at", "updated_at"):
    value = parsed[field]
    if isinstance(value, str) and value:
        if not timestamp_re.match(value):
            errors.append(f"{field} must use RFC3339 UTC format (YYYY-MM-DDTHH:MM:SSZ)")
        else:
            try:
                dt.datetime.strptime(value, "%Y-%m-%dT%H:%M:%SZ")
            except ValueError:
                errors.append(f"{field} is not a valid UTC timestamp")

sandbox_id = parsed["sandbox_id"]
template = parsed["template"]
if isinstance(sandbox_id, str) and sandbox_id and isinstance(template, str) and not template:
    errors.append("template is required when sandbox_id is set")

if isinstance(status, str) and status == "uninitialized":
    if isinstance(sandbox_id, str) and sandbox_id:
        errors.append("status cannot be 'uninitialized' when sandbox_id is set")

if errors:
    for err in errors:
        print(err, file=sys.stderr)
    sys.exit(1)
PY
}

state_backup_current() {
  local reason="${1:-stale}"
  if [[ ! -f "${E2B_STATE_FILE}" ]]; then
    return 1
  fi

  local ts
  ts="$(date -u +"%Y%m%dT%H%M%SZ")"
  local base="${E2B_STATE_FILE}.${reason}.${ts}"
  local backup_path="${base}"
  local n=0

  while [[ -e "${backup_path}" ]]; do
    n=$((n + 1))
    backup_path="${base}.${n}"
  done

  mv "${E2B_STATE_FILE}" "${backup_path}"
  echo "${backup_path}"
}

state_clear() {
  state_write_json_atomically "$(state_default_json)"
}

state_get() {
  state_require_python
  state_init

  local key="${1:?field required}"
  "${E2B_STATE_PYTHON}" - "${E2B_STATE_FILE}" "${key}" <<'PY'
import json
import sys
from pathlib import Path

state_path = Path(sys.argv[1])
key = sys.argv[2]

allowed = {
    "version",
    "sandbox_id",
    "template",
    "status",
    "created_at",
    "resumed_at",
    "updated_at",
}
if key not in allowed:
    print(f"unknown field: {key}", file=sys.stderr)
    sys.exit(1)

parsed = json.loads(state_path.read_text(encoding="utf-8"))
value = parsed.get(key, "")
if isinstance(value, str):
    print(value)
else:
    print(value)
PY
}

state_update() {
  state_require_python
  state_init

  if [[ $# -lt 2 ]] || (( $# % 2 != 0 )); then
    state_die "update requires key/value pairs"
  fi

  local rendered
  rendered="$(${E2B_STATE_PYTHON} - "${E2B_STATE_FILE}" "$(state_now_utc)" "${E2B_STATE_SCHEMA_VERSION}" "$@" <<'PY'
import json
import sys
from pathlib import Path

state_path = Path(sys.argv[1])
now_utc = sys.argv[2]
expected_version = int(sys.argv[3])
pairs = sys.argv[4:]

allowed_fields = {
    "sandbox_id",
    "template",
    "status",
    "created_at",
    "resumed_at",
    "updated_at",
}
valid_statuses = {"uninitialized", "running", "paused", "killed", "unknown"}

state = json.loads(state_path.read_text(encoding="utf-8"))
if not isinstance(state, dict):
    raise SystemExit("state must be a JSON object")

for i in range(0, len(pairs), 2):
    key = pairs[i]
    value = pairs[i + 1]
    if key not in allowed_fields:
        raise SystemExit(f"unknown update field: {key}")
    state[key] = value

if "updated_at" not in pairs[0::2]:
    state["updated_at"] = now_utc

state["version"] = expected_version

status = state.get("status", "")
if status not in valid_statuses:
    raise SystemExit(
        "status must be one of: " + ", ".join(sorted(valid_statuses))
    )

if state.get("sandbox_id") and not state.get("template"):
    raise SystemExit("template is required when sandbox_id is set")

if state.get("status") == "uninitialized" and state.get("sandbox_id"):
    raise SystemExit("status cannot be 'uninitialized' when sandbox_id is set")

print(json.dumps(state, indent=2))
PY
)"

  state_write_json_atomically "${rendered}"
  state_validate >/dev/null
}

state_remote_contains_id() {
  state_require_python

  local sandbox_id="${1:?sandbox id required}"
  local list_json="${2:-}"

  "${E2B_STATE_PYTHON}" - "${sandbox_id}" <<'PY' <<<"${list_json}"
import json
import sys

sandbox_id = sys.argv[1]
raw = sys.stdin.read().strip()
if not raw:
    sys.exit(2)

try:
    parsed = json.loads(raw)
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

ids = set()
for item in items:
    if not isinstance(item, dict):
        continue
    candidate = item.get("sandboxId") or item.get("sandbox_id") or item.get("id")
    if isinstance(candidate, str) and candidate.strip():
        ids.add(candidate.strip())

if sandbox_id in ids:
    sys.exit(0)
sys.exit(1)
PY
}

state_recover_stale() {
  local skip_remote="0"
  if [[ "${1:-}" == "--skip-remote" ]]; then
    skip_remote="1"
    shift || true
  fi
  if [[ $# -gt 0 ]]; then
    state_die "recover-stale accepts at most one flag: --skip-remote"
  fi

  state_init

  if ! state_validate >/dev/null 2>&1; then
    local backup
    backup="$(state_backup_current "invalid")"
    state_clear
    echo "[e2b-state] recovered invalid state; backup=${backup}" >&2
    return 0
  fi

  local sandbox_id
  sandbox_id="$(state_get sandbox_id)"
  if [[ -z "${sandbox_id}" ]]; then
    return 0
  fi

  if [[ "${skip_remote}" == "1" ]]; then
    return 0
  fi

  if ! command -v e2b >/dev/null 2>&1; then
    echo "[e2b-state] skipping remote stale check (e2b CLI not found)" >&2
    return 0
  fi

  local list_json
  if ! list_json="$(e2b sandbox list --json 2>/dev/null)"; then
    echo "[e2b-state] skipping remote stale check (failed to list sandboxes)" >&2
    return 0
  fi

  local check_rc=0
  state_remote_contains_id "${sandbox_id}" "${list_json}" || check_rc=$?

  case "${check_rc}" in
    0)
      return 0
      ;;
    1)
      local backup
      backup="$(state_backup_current "stale")"
      state_clear
      echo "[e2b-state] recovered stale state for sandbox '${sandbox_id}'; backup=${backup}" >&2
      return 0
      ;;
    2)
      echo "[e2b-state] skipping remote stale check (unrecognized e2b list JSON shape)" >&2
      return 0
      ;;
    *)
      state_die "unexpected remote stale check result: ${check_rc}"
      ;;
  esac
}

state_main() {
  local cmd="${1:-}"
  shift || true

  case "${cmd}" in
    path)
      echo "${E2B_STATE_FILE}"
      ;;
    init)
      state_init
      ;;
    show|read)
      state_read_json
      ;;
    get)
      state_get "$@"
      ;;
    update)
      state_update "$@"
      ;;
    clear)
      state_clear
      ;;
    validate)
      state_validate
      ;;
    recover-stale)
      state_recover_stale "$@"
      ;;
    help|--help|-h)
      state_usage
      ;;
    "")
      state_usage >&2
      exit 1
      ;;
    *)
      state_usage >&2
      state_die "unknown command '${cmd}'"
      ;;
  esac
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  state_main "$@"
fi
