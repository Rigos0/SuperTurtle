#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
UP_SCRIPT="${ROOT_DIR}/super_turtle/e2b/up.sh"
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

cat > "${FAKE_BIN_DIR}/bun" <<'SH'
#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "install" ]]; then
  echo "[fake bun] install"
  exit 0
fi

if [[ "${1:-}" == "run" ]]; then
  # Keep process alive so run-loop remains running for assertions.
  sleep 300
  exit 0
fi

exit 0
SH
chmod +x "${FAKE_BIN_DIR}/bun"

cat > "${FAKE_BIN_DIR}/e2b" <<'SH'
#!/usr/bin/env bash
set -euo pipefail

STATE_DIR="${FAKE_E2B_STATE_DIR:?FAKE_E2B_STATE_DIR is required}"
SANDBOX_DIR="${STATE_DIR}/sandboxes"
mkdir -p "${SANDBOX_DIR}"

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
        items.append({"sandboxId": name, "state": "running"})

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
    sandbox_path="${SANDBOX_DIR}/${sandbox_id}"
    mkdir -p "${sandbox_path}"
    printf '%s\n' "${sandbox_id}" > "${STATE_DIR}/last-sandbox-id"

    # Consume potential stdin (the caller sends "exit").
    cat >/dev/null || true
    echo "Connected to sandbox ${sandbox_id} using template ${template}"
    ;;
  connect)
    sandbox_id="${3:-}"
    sandbox_path="${SANDBOX_DIR}/${sandbox_id}"
    if [[ -z "${sandbox_id}" || ! -d "${sandbox_path}" ]]; then
      echo "sandbox not found: ${sandbox_id}" >&2
      exit 1
    fi
    if [ -t 0 ]; then
      exit 0
    fi
    (
      cd "${sandbox_path}"
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
  *)
    echo "unsupported fake sandbox subcommand: ${sub}" >&2
    exit 1
    ;;
esac
SH
chmod +x "${FAKE_BIN_DIR}/e2b"

export PATH="${FAKE_BIN_DIR}:${PATH}"
export FAKE_E2B_STATE_DIR
export E2B_STATE_FILE="${STATE_FILE}"
export E2B_REMOTE_PROJECT_DIR="${REMOTE_PROJECT_DIR}"
export E2B_REMOTE_LOG_PATH="${REMOTE_PROJECT_DIR}/.superturtle/bot.log"

cd "${ROOT_DIR}"

echo "[smoke:e2b-up] first run (create + sync + install + start)"
bash "${UP_SCRIPT}" --template fake-template

sandbox_id="$(bash "${STATE_SCRIPT}" get sandbox_id)"
status="$(bash "${STATE_SCRIPT}" get status)"
template="$(bash "${STATE_SCRIPT}" get template)"
created_at="$(bash "${STATE_SCRIPT}" get created_at)"
resumed_at="$(bash "${STATE_SCRIPT}" get resumed_at)"

[[ "${sandbox_id}" == "sbx-fake-1" ]] || { echo "unexpected sandbox id: ${sandbox_id}" >&2; exit 1; }
[[ "${status}" == "running" ]] || { echo "unexpected status: ${status}" >&2; exit 1; }
[[ "${template}" == "fake-template" ]] || { echo "unexpected template: ${template}" >&2; exit 1; }
[[ -n "${created_at}" ]] || { echo "created_at should not be empty" >&2; exit 1; }
[[ -z "${resumed_at}" ]] || { echo "resumed_at should be empty on first create" >&2; exit 1; }
[[ -f "${REMOTE_PROJECT_DIR}/super_turtle/e2b/remote.sh" ]] || { echo "repo sync failed" >&2; exit 1; }
[[ -f "${PID_FILE}" ]] || { echo "pid file missing after start" >&2; exit 1; }

first_pid="$(cat "${PID_FILE}")"
if ! kill -0 "${first_pid}" >/dev/null 2>&1; then
  echo "remote process is not running after first up" >&2
  exit 1
fi

echo "[smoke:e2b-up] second run (reuse existing sandbox)"
bash "${UP_SCRIPT}" --template fake-template

second_pid="$(cat "${PID_FILE}")"
[[ "${first_pid}" == "${second_pid}" ]] || { echo "expected same pid on idempotent start" >&2; exit 1; }
[[ "$(cat "${FAKE_E2B_STATE_DIR}/create-count")" == "1" ]] || { echo "sandbox should not be recreated on second run" >&2; exit 1; }

resumed_after_second="$(bash "${STATE_SCRIPT}" get resumed_at)"
[[ -n "${resumed_after_second}" ]] || { echo "resumed_at should be set after reusing sandbox" >&2; exit 1; }

echo "[smoke:e2b-up] pass"
