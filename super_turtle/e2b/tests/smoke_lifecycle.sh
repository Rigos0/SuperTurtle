#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
REMOTE_SCRIPT="${ROOT_DIR}/super_turtle/e2b/remote.sh"
STATE_SCRIPT="${ROOT_DIR}/super_turtle/e2b/state.sh"

TMP_DIR="$(mktemp -d)"
FAKE_BIN_DIR="${TMP_DIR}/bin"
FAKE_E2B_STATE_DIR="${TMP_DIR}/fake-e2b"
REMOTE_PROJECT_DIR="${TMP_DIR}/remote-project"
STATE_FILE="${TMP_DIR}/state.json"
PID_FILE="${REMOTE_PROJECT_DIR}/.superturtle/bot.pid"

cleanup() {
  trap - EXIT

  if [[ -f "${PID_FILE}" ]]; then
    pid="$(cat "${PID_FILE}" 2>/dev/null || true)"
    if [[ "${pid}" =~ ^[0-9]+$ ]]; then
      kill "${pid}" >/dev/null 2>&1 || true
    fi
  fi

  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

mkdir -p "${FAKE_BIN_DIR}" "${FAKE_E2B_STATE_DIR}/sandboxes"

cat > "${FAKE_BIN_DIR}/bun" <<'BUN'
#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "install" ]]; then
  exit 0
fi

if [[ "${1:-}" == "run" ]]; then
  # Keep process alive so run-loop remains running for assertions.
  sleep 300
  exit 0
fi

exit 0
BUN
chmod +x "${FAKE_BIN_DIR}/bun"

cat > "${FAKE_BIN_DIR}/e2b" <<'E2B'
#!/usr/bin/env bash
set -euo pipefail

STATE_DIR="${FAKE_E2B_STATE_DIR:?FAKE_E2B_STATE_DIR is required}"
SANDBOX_DIR="${STATE_DIR}/sandboxes"
mkdir -p "${SANDBOX_DIR}"

sandbox_path() {
  local id="${1:?sandbox id required}"
  printf '%s/%s' "${SANDBOX_DIR}" "${id}"
}

sandbox_state_file() {
  local id="${1:?sandbox id required}"
  printf '%s/state' "$(sandbox_path "${id}")"
}

sandbox_get_state() {
  local id="${1:?sandbox id required}"
  local path
  path="$(sandbox_state_file "${id}")"
  if [[ -f "${path}" ]]; then
    cat "${path}"
  else
    echo "running"
  fi
}

sandbox_set_state() {
  local id="${1:?sandbox id required}"
  local state="${2:?state required}"
  local path
  path="$(sandbox_state_file "${id}")"
  mkdir -p "$(dirname "${path}")"
  printf '%s\n' "${state}" > "${path}"
}

json_list() {
  python3 - "${SANDBOX_DIR}" <<'PY'
import json
import os
import sys

root = sys.argv[1]
items = []
if os.path.isdir(root):
    for name in sorted(os.listdir(root)):
        if not name:
            continue
        state_file = os.path.join(root, name, "state")
        state = "running"
        if os.path.isfile(state_file):
            with open(state_file, encoding="utf-8") as fh:
                state = (fh.read() or "running").strip() or "running"
        items.append({"sandboxId": name, "state": state})

print(json.dumps(items))
PY
}

if [[ "${1:-}" == "auth" && "${2:-}" == "info" ]]; then
  echo "fake-user"
  exit 0
fi

if [[ "${1:-}" != "sandbox" ]]; then
  echo "unsupported fake e2b command: $*" >&2
  exit 1
fi

sub="${2:-}"
case "${sub}" in
  create)
    template="${3:-base}"
    id_file="${STATE_DIR}/create-count"
    count=0
    if [[ -f "${id_file}" ]]; then
      count="$(cat "${id_file}")"
    fi
    count=$((count + 1))
    echo "${count}" > "${id_file}"

    sandbox_id="sbx-fake-${count}"
    mkdir -p "$(sandbox_path "${sandbox_id}")"
    sandbox_set_state "${sandbox_id}" "running"

    cat >/dev/null || true
    echo "Connected to sandbox ${sandbox_id} using template ${template}"
    ;;
  connect)
    sandbox_id="${3:-}"
    path="$(sandbox_path "${sandbox_id}")"
    if [[ -z "${sandbox_id}" || ! -d "${path}" ]]; then
      echo "sandbox not found: ${sandbox_id}" >&2
      exit 1
    fi

    # E2B resume-on-connect behavior.
    sandbox_set_state "${sandbox_id}" "running"

    if [ -t 0 ]; then
      exit 0
    fi

    (
      cd "${path}"
      bash -s
    )
    ;;
  list)
    if [[ "$*" == *"--json"* || "$*" == *"-f json"* || "$*" == *"--format json"* ]]; then
      json_list
    else
      echo "sandbox list (fake)"
      json_list
    fi
    ;;
  pause)
    sandbox_id="${3:-}"
    path="$(sandbox_path "${sandbox_id}")"
    if [[ -z "${sandbox_id}" || ! -d "${path}" ]]; then
      echo "sandbox not found: ${sandbox_id}" >&2
      exit 1
    fi
    if [[ "$(sandbox_get_state "${sandbox_id}")" == "killed" ]]; then
      echo "sandbox already killed: ${sandbox_id}" >&2
      exit 1
    fi
    sandbox_set_state "${sandbox_id}" "paused"
    echo "paused ${sandbox_id}"
    ;;
  kill)
    sandbox_id="${3:-}"
    path="$(sandbox_path "${sandbox_id}")"
    if [[ -z "${sandbox_id}" || ! -d "${path}" ]]; then
      echo "sandbox not found: ${sandbox_id}" >&2
      exit 1
    fi

    sandbox_set_state "${sandbox_id}" "killed"

    remote_root="${E2B_REMOTE_PROJECT_DIR:-}"
    if [[ -n "${remote_root}" ]]; then
      pid_file="${remote_root}/.superturtle/bot.pid"
      if [[ -f "${pid_file}" ]]; then
        pid="$(cat "${pid_file}" 2>/dev/null || true)"
        if [[ "${pid}" =~ ^[0-9]+$ ]]; then
          kill "${pid}" >/dev/null 2>&1 || true
        fi
      fi
    fi

    echo "killed ${sandbox_id}"
    ;;
  *)
    echo "unsupported fake sandbox subcommand: ${sub}" >&2
    exit 1
    ;;
esac
E2B
chmod +x "${FAKE_BIN_DIR}/e2b"

export PATH="${FAKE_BIN_DIR}:${PATH}"
export FAKE_E2B_STATE_DIR
export E2B_STATE_FILE="${STATE_FILE}"
export E2B_REMOTE_PROJECT_DIR="${REMOTE_PROJECT_DIR}"
export E2B_REMOTE_LOG_PATH="${REMOTE_PROJECT_DIR}/.superturtle/bot.log"

cd "${ROOT_DIR}"

echo "[smoke:e2b-lifecycle] bring sandbox up"
bash "${REMOTE_SCRIPT}" up --template fake-template

sandbox_id="$(bash "${STATE_SCRIPT}" get sandbox_id)"
[[ "${sandbox_id}" == "sbx-fake-1" ]] || { echo "unexpected sandbox id: ${sandbox_id}" >&2; exit 1; }

status_out="$(bash "${REMOTE_SCRIPT}" status)"
[[ "${status_out}" == *"effective_status=running"* ]] || { echo "expected running status, got: ${status_out}" >&2; exit 1; }

echo "[smoke:e2b-lifecycle] pause"
bash "${REMOTE_SCRIPT}" pause
[[ "$(bash "${STATE_SCRIPT}" get status)" == "paused" ]] || { echo "state status should be paused" >&2; exit 1; }
status_out="$(bash "${REMOTE_SCRIPT}" status)"
[[ "${status_out}" == *"effective_status=paused"* ]] || { echo "expected paused status, got: ${status_out}" >&2; exit 1; }

echo "[smoke:e2b-lifecycle] resume"
bash "${REMOTE_SCRIPT}" resume
[[ "$(bash "${STATE_SCRIPT}" get status)" == "running" ]] || { echo "state status should be running after resume" >&2; exit 1; }
resumed_at="$(bash "${STATE_SCRIPT}" get resumed_at)"
[[ -n "${resumed_at}" ]] || { echo "resumed_at should be set after resume" >&2; exit 1; }
status_out="$(bash "${REMOTE_SCRIPT}" status)"
[[ "${status_out}" == *"effective_status=running"* ]] || { echo "expected running status after resume, got: ${status_out}" >&2; exit 1; }

echo "[smoke:e2b-lifecycle] stop"
bash "${REMOTE_SCRIPT}" stop
[[ "$(bash "${STATE_SCRIPT}" get status)" == "killed" ]] || { echo "state status should be killed after stop" >&2; exit 1; }
status_out="$(bash "${REMOTE_SCRIPT}" status)"
[[ "${status_out}" == *"effective_status=killed"* ]] || { echo "expected killed status, got: ${status_out}" >&2; exit 1; }

# Idempotent stop should also succeed.
bash "${REMOTE_SCRIPT}" stop

echo "[smoke:e2b-lifecycle] pass"
