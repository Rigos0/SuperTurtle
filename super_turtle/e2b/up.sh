#!/usr/bin/env bash
set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
readonly STATE_SCRIPT="${SCRIPT_DIR}/state.sh"
readonly E2B_BIN="${E2B_BIN:-e2b}"

readonly DEFAULT_TEMPLATE="${E2B_TEMPLATE:-base}"
readonly DEFAULT_REMOTE_PROJECT_DIR="${E2B_REMOTE_PROJECT_DIR:-/home/user/agentic}"
readonly DEFAULT_REMOTE_LOG_PATH="${E2B_REMOTE_LOG_PATH:-/tmp/superturtle-remote.log}"
readonly REMOTE_PID_FILE_REL="${E2B_REMOTE_PID_FILE_REL:-.superturtle/bot.pid}"

SYNC_ONLY=0
SKIP_INSTALL=0
SKIP_START=0
TEMPLATE_OVERRIDE=""
SANDBOX_ID_OVERRIDE=""
REMOTE_PROJECT_DIR="${DEFAULT_REMOTE_PROJECT_DIR}"

usage() {
  cat <<'EOF'
Usage: bash super_turtle/e2b/up.sh [options]

Options:
  --sync                    Sync repo only (skip install/start)
  --skip-install            Skip dependency install step
  --skip-start              Skip remote bot startup step
  --template <name>         Sandbox template (default: $E2B_TEMPLATE or "base")
  --sandbox-id <id>         Force use of this sandbox id
  --remote-project-dir <p>  Remote project directory path
  -h, --help                Show this help

Environment:
  E2B_API_KEY               API key used by E2B CLI auth
  E2B_TEMPLATE              Default template when --template is omitted
  E2B_REMOTE_PROJECT_DIR    Default remote project directory
  E2B_REMOTE_LOG_PATH       Remote log file for run-loop output
  E2B_SKIP_AUTH_CHECK=1     Skip 'e2b auth info' preflight
EOF
}

log() {
  local msg="${1:?message required}"
  echo "[e2b-up] ${msg}"
}

die() {
  local msg="${1:?message required}"
  echo "[e2b-up] ERROR: ${msg}" >&2
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

shell_quote() {
  local value="${1:-}"
  printf "'%s'" "${value//\'/\'\"\'\"\'}"
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --sync)
        SYNC_ONLY=1
        shift
        ;;
      --skip-install)
        SKIP_INSTALL=1
        shift
        ;;
      --skip-start)
        SKIP_START=1
        shift
        ;;
      --template)
        TEMPLATE_OVERRIDE="${2:-}"
        [[ -n "${TEMPLATE_OVERRIDE}" ]] || die "--template requires a value"
        shift 2
        ;;
      --sandbox-id)
        SANDBOX_ID_OVERRIDE="${2:-}"
        [[ -n "${SANDBOX_ID_OVERRIDE}" ]] || die "--sandbox-id requires a value"
        shift 2
        ;;
      --remote-project-dir)
        REMOTE_PROJECT_DIR="${2:-}"
        [[ -n "${REMOTE_PROJECT_DIR}" ]] || die "--remote-project-dir requires a value"
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

require_preflight() {
  [[ -n "${PYTHON_BIN}" ]] || die "python3/python is required"
  [[ -f "${STATE_SCRIPT}" ]] || die "missing state helper: ${STATE_SCRIPT}"
  [[ -f "${ROOT_DIR}/AGENTS.md" ]] || die "run from repo context with AGENTS.md present"

  require_cmd "${E2B_BIN}"
  require_cmd tar
  require_cmd base64

  if [[ "${E2B_SKIP_AUTH_CHECK:-0}" != "1" ]]; then
    if ! "${E2B_BIN}" auth info >/dev/null 2>&1; then
      die "E2B auth missing. Export E2B_API_KEY or run 'e2b auth login' first."
    fi
  fi
}

extract_sandbox_id() {
  local payload="${1:-}"
  if [[ -z "${payload}" ]]; then
    return 1
  fi

  "${PYTHON_BIN}" -c '
import json
import re
import sys

raw = sys.stdin.read()
if not raw:
    sys.exit(1)

clean = re.sub(r"\x1b\[[0-9;]*[A-Za-z]", "", raw)

def pick_from_obj(value):
    if isinstance(value, dict):
        for key in ("sandboxId", "sandbox_id", "id"):
            candidate = value.get(key)
            if isinstance(candidate, str) and candidate.strip():
                return candidate.strip()
        for nested in value.values():
            picked = pick_from_obj(nested)
            if picked:
                return picked
    elif isinstance(value, list):
        for item in value:
            picked = pick_from_obj(item)
            if picked:
                return picked
    return ""

try:
    parsed = json.loads(clean)
except json.JSONDecodeError:
    parsed = None

if parsed is not None:
    selected = pick_from_obj(parsed)
    if selected:
        print(selected)
        sys.exit(0)

patterns = (
    r"connected to sandbox\s+([A-Za-z0-9._:-]{6,})",
    r"sandbox(?:\s+id)?\s*[:=]\s*([A-Za-z0-9._:-]{6,})",
    r"\b(sbx_[A-Za-z0-9._:-]{4,})\b",
    r"\b([0-9a-f]{8}-[0-9a-f-]{27,})\b",
)

for pattern in patterns:
    match = re.search(pattern, clean, flags=re.IGNORECASE)
    if match:
        print(match.group(1))
        sys.exit(0)

sys.exit(1)
' <<<"${payload}"
}

connect_sandbox_probe() {
  local sandbox_id="${1:?sandbox id required}"
  printf 'exit\n' | "${E2B_BIN}" sandbox connect "${sandbox_id}" >/dev/null 2>&1
}

create_sandbox() {
  local template="${1:?template required}"
  local create_out
  if ! create_out="$(printf 'exit\n' | "${E2B_BIN}" sandbox create "${template}" 2>&1)"; then
    echo "${create_out}" >&2
    return 1
  fi

  local parsed_id=""
  if parsed_id="$(extract_sandbox_id "${create_out}")"; then
    printf '%s\n' "${parsed_id}"
    return 0
  fi

  echo "${create_out}" >&2
  return 1
}

run_remote_script() {
  local sandbox_id="${1:?sandbox id required}"
  local label="${2:?label required}"

  local tmp_script
  tmp_script="$(mktemp)"
  local tmp_output
  tmp_output="$(mktemp)"

  cat > "${tmp_script}"

  if ! {
    cat "${tmp_script}"
    printf '\nexit\n'
  } | "${E2B_BIN}" sandbox connect "${sandbox_id}" >"${tmp_output}" 2>&1; then
    echo "[e2b-up] remote ${label} failed for sandbox ${sandbox_id}" >&2
    cat "${tmp_output}" >&2
    rm -f "${tmp_script}" "${tmp_output}"
    return 1
  fi

  cat "${tmp_output}"
  rm -f "${tmp_script}" "${tmp_output}"
}

sync_repo_to_remote() {
  local sandbox_id="${1:?sandbox id required}"
  local remote_project_dir="${2:?remote project dir required}"

  local local_tar
  local_tar="$(mktemp)"
  local file_list
  file_list="$(mktemp)"
  local raw_file_list
  raw_file_list="$(mktemp)"

  if command -v git >/dev/null 2>&1 && git -C "${ROOT_DIR}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git -C "${ROOT_DIR}" ls-files -z > "${raw_file_list}"
    while IFS= read -r -d '' rel_path; do
      if [[ -e "${ROOT_DIR}/${rel_path}" ]]; then
        printf '%s\0' "${rel_path}" >> "${file_list}"
      fi
    done < "${raw_file_list}"
    if [[ -f "${ROOT_DIR}/super_turtle/claude-telegram-bot/.env" ]]; then
      printf 'super_turtle/claude-telegram-bot/.env\0' >> "${file_list}"
    fi
    tar -C "${ROOT_DIR}" --null -T "${file_list}" -czf "${local_tar}"
  else
    tar -C "${ROOT_DIR}" \
      --exclude='.git' \
      --exclude='.subturtles' \
      --exclude='node_modules' \
      --exclude='*/node_modules/*' \
      --exclude='.venv' \
      --exclude='*/.venv/*' \
      --exclude='__pycache__' \
      --exclude='*/__pycache__/*' \
      --exclude='dist' \
      --exclude='*/dist/*' \
      --exclude='*.pyc' \
      --exclude='*.log' \
      -czf "${local_tar}" .
  fi

  local remote_dir_quoted
  remote_dir_quoted="$(shell_quote "${remote_project_dir}")"
  local tmp_output
  tmp_output="$(mktemp)"

  if ! {
    cat <<EOF
set -euo pipefail
REMOTE_PROJECT_DIR=${remote_dir_quoted}
if [[ -z "\${REMOTE_PROJECT_DIR}" || "\${REMOTE_PROJECT_DIR}" == "/" ]]; then
  echo "__SUPERTURTLE_SYNC_ERROR__ unsafe remote project dir: \${REMOTE_PROJECT_DIR}" >&2
  exit 12
fi
STAGE_DIR="\${REMOTE_PROJECT_DIR}.incoming"
rm -rf "\${STAGE_DIR}"
mkdir -p "\${STAGE_DIR}"
cat > "\${STAGE_DIR}/repo.tar.gz.b64" <<'__SUPERTURTLE_SYNC_B64__'
EOF
    base64 < "${local_tar}"
    cat <<'EOF'
__SUPERTURTLE_SYNC_B64__
if base64 -d "${STAGE_DIR}/repo.tar.gz.b64" > "${STAGE_DIR}/repo.tar.gz" 2>/dev/null; then
  :
elif base64 --decode "${STAGE_DIR}/repo.tar.gz.b64" > "${STAGE_DIR}/repo.tar.gz" 2>/dev/null; then
  :
else
  base64 -D -i "${STAGE_DIR}/repo.tar.gz.b64" -o "${STAGE_DIR}/repo.tar.gz"
fi

mkdir -p "${REMOTE_PROJECT_DIR}"
find "${REMOTE_PROJECT_DIR}" -mindepth 1 -maxdepth 1 ! -name '.superturtle' -exec rm -rf {} +
tar -xzf "${STAGE_DIR}/repo.tar.gz" -C "${REMOTE_PROJECT_DIR}"
rm -rf "${STAGE_DIR}"
echo "__SUPERTURTLE_SYNC_OK__"
EOF
    printf '\nexit\n'
  } | "${E2B_BIN}" sandbox connect "${sandbox_id}" >"${tmp_output}" 2>&1; then
    echo "[e2b-up] sync failed for sandbox ${sandbox_id}" >&2
    cat "${tmp_output}" >&2
    rm -f "${local_tar}" "${file_list}" "${raw_file_list}" "${tmp_output}"
    return 1
  fi

  if ! grep -q "__SUPERTURTLE_SYNC_OK__" "${tmp_output}"; then
    echo "[e2b-up] sync did not confirm success marker" >&2
    cat "${tmp_output}" >&2
    rm -f "${local_tar}" "${file_list}" "${raw_file_list}" "${tmp_output}"
    return 1
  fi

  rm -f "${local_tar}" "${file_list}" "${raw_file_list}" "${tmp_output}"
}

install_remote_dependencies() {
  local sandbox_id="${1:?sandbox id required}"
  local remote_project_dir="${2:?remote project dir required}"
  local remote_dir_quoted
  remote_dir_quoted="$(shell_quote "${remote_project_dir}")"

  local output
  output="$(run_remote_script "${sandbox_id}" "install" <<EOF
set -euo pipefail
REMOTE_PROJECT_DIR=${remote_dir_quoted}
BOT_DIR="\${REMOTE_PROJECT_DIR}/super_turtle/claude-telegram-bot"
if [[ ! -d "\${BOT_DIR}" ]]; then
  echo "__SUPERTURTLE_INSTALL_ERROR__ missing bot dir: \${BOT_DIR}" >&2
  exit 21
fi

if ! command -v bun >/dev/null 2>&1; then
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL https://bun.sh/install | bash >/dev/null 2>&1 || true
  fi
  export BUN_INSTALL="\${HOME}/.bun"
  export PATH="\${BUN_INSTALL}/bin:\${PATH}"
fi

if ! command -v bun >/dev/null 2>&1; then
  echo "__SUPERTURTLE_INSTALL_ERROR__ bun is required in sandbox" >&2
  exit 22
fi

cd "\${BOT_DIR}"
bun install >/dev/null
echo "__SUPERTURTLE_INSTALL_OK__"
EOF
)"

  if ! grep -q "__SUPERTURTLE_INSTALL_OK__" <<<"${output}"; then
    echo "${output}" >&2
    return 1
  fi
}

ensure_remote_bot_running() {
  local sandbox_id="${1:?sandbox id required}"
  local remote_project_dir="${2:?remote project dir required}"
  local remote_log_path="${3:?remote log path required}"

  local remote_dir_quoted
  remote_dir_quoted="$(shell_quote "${remote_project_dir}")"
  local remote_log_quoted
  remote_log_quoted="$(shell_quote "${remote_log_path}")"
  local pid_rel_quoted
  pid_rel_quoted="$(shell_quote "${REMOTE_PID_FILE_REL}")"

  local output
  output="$(run_remote_script "${sandbox_id}" "start-bot" <<EOF
set -euo pipefail
REMOTE_PROJECT_DIR=${remote_dir_quoted}
REMOTE_LOG_PATH=${remote_log_quoted}
PID_FILE_REL=${pid_rel_quoted}

BOT_DIR="\${REMOTE_PROJECT_DIR}/super_turtle/claude-telegram-bot"
PID_FILE="\${REMOTE_PROJECT_DIR}/\${PID_FILE_REL}"
PID_DIR="\$(dirname "\${PID_FILE}")"

mkdir -p "\${PID_DIR}"
mkdir -p "\$(dirname "\${REMOTE_LOG_PATH}")"

if [[ -f "\${PID_FILE}" ]]; then
  existing_pid="\$(cat "\${PID_FILE}" 2>/dev/null || true)"
  if [[ "\${existing_pid}" =~ ^[0-9]+$ ]] && kill -0 "\${existing_pid}" >/dev/null 2>&1; then
    echo "__SUPERTURTLE_START_OK__:\${existing_pid}:already-running"
    exit 0
  fi
fi

detected_pid="\$(pgrep -f "\${BOT_DIR}/run-loop.sh" | head -n 1 || true)"
if [[ -n "\${detected_pid}" ]]; then
  echo "\${detected_pid}" > "\${PID_FILE}"
  echo "__SUPERTURTLE_START_OK__:\${detected_pid}:detected-existing"
  exit 0
fi

cd "\${BOT_DIR}"
nohup env SUPERTURTLE_RUN_LOOP=1 ./run-loop.sh >>"\${REMOTE_LOG_PATH}" 2>&1 &
new_pid="\$!"
echo "\${new_pid}" > "\${PID_FILE}"
sleep 1

if ! kill -0 "\${new_pid}" >/dev/null 2>&1; then
  tail -n 40 "\${REMOTE_LOG_PATH}" >&2 || true
  echo "__SUPERTURTLE_START_ERROR__ bot process exited immediately" >&2
  exit 31
fi

echo "__SUPERTURTLE_START_OK__:\${new_pid}:started"
EOF
)"

  if ! grep -q "__SUPERTURTLE_START_OK__" <<<"${output}"; then
    echo "${output}" >&2
    return 1
  fi
}

select_template() {
  local stored_template="${1:-}"
  if [[ -n "${TEMPLATE_OVERRIDE}" ]]; then
    echo "${TEMPLATE_OVERRIDE}"
    return
  fi
  if [[ -n "${stored_template}" ]]; then
    echo "${stored_template}"
    return
  fi
  echo "${DEFAULT_TEMPLATE}"
}

main() {
  parse_args "$@"
  require_preflight

  state_cmd init
  state_cmd recover-stale >/dev/null || true

  local stored_sandbox_id=""
  local stored_template=""
  local stored_created_at=""

  stored_sandbox_id="$(state_cmd get sandbox_id || true)"
  stored_template="$(state_cmd get template || true)"
  stored_created_at="$(state_cmd get created_at || true)"

  local template
  template="$(select_template "${stored_template}")"
  [[ -n "${template}" ]] || die "template must not be empty"

  local sandbox_id="${SANDBOX_ID_OVERRIDE:-${stored_sandbox_id}}"
  local created_new=0
  local resumed_existing=0

  if [[ -n "${sandbox_id}" ]]; then
    log "probing sandbox ${sandbox_id}..."
    if connect_sandbox_probe "${sandbox_id}"; then
      resumed_existing=1
      log "reusing sandbox ${sandbox_id}"
    else
      if [[ -n "${SANDBOX_ID_OVERRIDE}" ]]; then
        die "unable to connect to sandbox '${sandbox_id}' from --sandbox-id"
      fi
      log "stored sandbox '${sandbox_id}' unavailable; creating a new one"
      sandbox_id=""
    fi
  fi

  if [[ -z "${sandbox_id}" ]]; then
    log "creating sandbox from template '${template}'..."
    sandbox_id="$(create_sandbox "${template}")" || die "failed to create sandbox from template '${template}'"
    created_new=1
    resumed_existing=0
    log "created sandbox ${sandbox_id}"
  fi

  local created_at="${stored_created_at}"
  local resumed_at=""
  if [[ "${created_new}" -eq 1 ]]; then
    created_at="$(now_utc)"
  elif [[ -z "${created_at}" ]]; then
    created_at="$(now_utc)"
  fi
  if [[ "${resumed_existing}" -eq 1 ]]; then
    resumed_at="$(now_utc)"
  fi

  state_cmd update \
    sandbox_id "${sandbox_id}" \
    template "${template}" \
    status "running" \
    created_at "${created_at}" \
    resumed_at "${resumed_at}"

  log "syncing local repo to sandbox ${sandbox_id} (${REMOTE_PROJECT_DIR})..."
  sync_repo_to_remote "${sandbox_id}" "${REMOTE_PROJECT_DIR}" || die "repo sync failed"

  if [[ "${SYNC_ONLY}" -eq 1 ]]; then
    log "sync-only run complete"
    return 0
  fi

  if [[ "${SKIP_INSTALL}" -eq 0 ]]; then
    log "installing dependencies in sandbox ${sandbox_id}..."
    install_remote_dependencies "${sandbox_id}" "${REMOTE_PROJECT_DIR}" || die "dependency install failed"
  else
    log "skipping dependency install (--skip-install)"
  fi

  if [[ "${SKIP_START}" -eq 0 ]]; then
    log "starting remote bot process in sandbox ${sandbox_id}..."
    ensure_remote_bot_running "${sandbox_id}" "${REMOTE_PROJECT_DIR}" "${DEFAULT_REMOTE_LOG_PATH}" || die "remote start failed"
  else
    log "skipping remote start (--skip-start)"
  fi

  state_cmd update \
    sandbox_id "${sandbox_id}" \
    template "${template}" \
    status "running" \
    created_at "${created_at}" \
    resumed_at "${resumed_at}"

  log "up flow complete (sandbox=${sandbox_id})"
}

main "$@"
