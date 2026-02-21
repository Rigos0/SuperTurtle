#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_BASE_URL="${API_BASE_URL:-http://localhost:8000}"
BUYER_API_KEY="${BUYER_API_KEY:-buyer-dev-key}"
EXECUTOR_API_KEY="${EXECUTOR_API_KEY:-executor-dev-key}"
AGENT_ID="${AGENT_ID:-55555555-5555-5555-5555-555555555555}"
PROMPT_TEXT="${PROMPT_TEXT:-Create a small hello-world markdown file named result.md}"
OUTPUT_DIR="${OUTPUT_DIR:-${ROOT_DIR}/.tmp/e2e-system-results}"
STATUS_TIMEOUT_SECONDS="${STATUS_TIMEOUT_SECONDS:-300}"
STATUS_POLL_SECONDS="${STATUS_POLL_SECONDS:-2}"
EXECUTOR_PYTHON="${EXECUTOR_PYTHON:-${ROOT_DIR}/executors/gemini/.venv/bin/python3}"
EXECUTOR_SCRIPT="${EXECUTOR_SCRIPT:-${ROOT_DIR}/executors/gemini/executor.py}"
EXECUTOR_LOG="${EXECUTOR_LOG:-${ROOT_DIR}/.tmp/e2e-system-executor.log}"
GEMINI_BIN="${GEMINI_BIN:-gemini}"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/agnt-e2e-system.XXXXXX")"
EXECUTOR_PID=""

cleanup() {
  if [[ -n "$EXECUTOR_PID" ]] && kill -0 "$EXECUTOR_PID" >/dev/null 2>&1; then
    kill "$EXECUTOR_PID" >/dev/null 2>&1 || true
    wait "$EXECUTOR_PID" >/dev/null 2>&1 || true
  fi
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "error: required command not found: $1" >&2
    exit 1
  fi
}

api_url() {
  printf '%s%s' "${API_BASE_URL%/}" "$1"
}

run_cli() {
  local auth_token="${AGNT_AUTH_TOKEN:-$BUYER_API_KEY}"
  if [[ -n "${AGNT_BIN:-}" ]]; then
    AGNT_API_BASE_URL="$API_BASE_URL" AGNT_AUTH_TOKEN="$auth_token" "$AGNT_BIN" "$@"
    return
  fi

  require_cmd go
  (
    cd "$ROOT_DIR/cli"
    AGNT_API_BASE_URL="$API_BASE_URL" AGNT_AUTH_TOKEN="$auth_token" go run ./cmd/agnt "$@"
  )
}

extract_json_field() {
  local json_input="$1"
  local python_expr="$2"
  printf '%s' "$json_input" | python3 -c "import json,sys; data=json.load(sys.stdin); value=${python_expr}; print(value if value is not None else '', end='')"
}

wait_for_api() {
  local attempt
  for attempt in $(seq 1 30); do
    if curl -fsS "$(api_url /health)" >/dev/null; then
      return
    fi
    sleep 2
  done
  echo "error: API is not healthy at $(api_url /health) after 60s" >&2
  exit 1
}

start_executor() {
  if [[ ! -f "$EXECUTOR_SCRIPT" ]]; then
    echo "error: executor script not found: $EXECUTOR_SCRIPT" >&2
    exit 1
  fi
  if [[ ! -x "$EXECUTOR_PYTHON" ]]; then
    echo "error: executor python not executable: $EXECUTOR_PYTHON" >&2
    echo "hint: run make executor-gemini-install" >&2
    exit 1
  fi
  if ! command -v "$GEMINI_BIN" >/dev/null 2>&1; then
    echo "error: Gemini binary not found in PATH: $GEMINI_BIN" >&2
    exit 1
  fi

  mkdir -p "$(dirname "$EXECUTOR_LOG")"
  rm -f "$EXECUTOR_LOG"

  env \
    AGNT_API_URL="$API_BASE_URL" \
    AGNT_EXECUTOR_API_KEY="$EXECUTOR_API_KEY" \
    AGNT_AGENT_ID="$AGENT_ID" \
    GEMINI_BIN="$GEMINI_BIN" \
    POLL_INTERVAL_SECONDS=2 \
    "$EXECUTOR_PYTHON" "$EXECUTOR_SCRIPT" >"$EXECUTOR_LOG" 2>&1 &
  EXECUTOR_PID=$!
}

wait_for_job_list_entry() {
  local job_id="$1"
  local attempt
  for attempt in $(seq 1 20); do
    local jobs_json
    jobs_json="$(run_cli jobs --limit 100)"
    local has_job
    has_job="$(printf '%s' "$jobs_json" | JOB_ID="$job_id" python3 -c 'import json,os,sys; data=json.load(sys.stdin); jobs=data.get("jobs") or []; print(any(job.get("job_id")==os.environ["JOB_ID"] for job in jobs), end="")')"
    if [[ "$has_job" == "True" ]]; then
      return
    fi
    sleep 1
  done
  echo "error: agnt jobs did not include job ${job_id}" >&2
  exit 1
}

wait_for_terminal_status() {
  local job_id="$1"
  local deadline=$((SECONDS + STATUS_TIMEOUT_SECONDS))
  while ((SECONDS < deadline)); do
    local status_json
    status_json="$(run_cli status "$job_id")"
    local status
    status="$(extract_json_field "$status_json" 'data.get("status")')"
    local progress
    progress="$(extract_json_field "$status_json" 'data.get("progress")')"

    echo "[e2e-system] job ${job_id} status=${status} progress=${progress}"

    if [[ "$status" == "completed" ]]; then
      return
    fi
    if [[ "$status" == "failed" || "$status" == "rejected" ]]; then
      local reason
      reason="$(extract_json_field "$status_json" 'data.get("decision_reason")')"
      echo "error: job reached terminal failure status=${status} reason=${reason}" >&2
      echo "executor log: ${EXECUTOR_LOG}" >&2
      exit 1
    fi
    sleep "$STATUS_POLL_SECONDS"
  done

  echo "error: job did not complete within ${STATUS_TIMEOUT_SECONDS}s" >&2
  echo "executor log: ${EXECUTOR_LOG}" >&2
  exit 1
}

require_cmd curl
require_cmd python3

echo "[e2e-system] waiting for API health: $(api_url /health)"
wait_for_api

echo "[e2e-system] verifying gemini agent details: ${AGENT_ID}"
info_json="$(run_cli info "$AGENT_ID")"
info_agent_id="$(extract_json_field "$info_json" 'data.get("agent_id")')"
if [[ "$info_agent_id" != "$AGENT_ID" ]]; then
  echo "error: expected agent ${AGENT_ID}, got ${info_agent_id}" >&2
  exit 1
fi

echo "[e2e-system] starting Gemini executor"
start_executor
sleep 1

echo "[e2e-system] creating gemini job"
order_json="$(run_cli order "$AGENT_ID" --prompt "$PROMPT_TEXT" --param source=e2e-system)"
job_id="$(extract_json_field "$order_json" 'data.get("job_id")')"
if [[ -z "$job_id" ]]; then
  echo "error: failed to parse job_id from order response" >&2
  exit 1
fi

echo "[e2e-system] validating agnt jobs output includes ${job_id}"
wait_for_job_list_entry "$job_id"

echo "[e2e-system] waiting for executor to finish job"
wait_for_terminal_status "$job_id"

rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"
echo "[e2e-system] downloading result to ${OUTPUT_DIR}"
result_json="$(run_cli result "$job_id" --output "$OUTPUT_DIR")"
result_status="$(extract_json_field "$result_json" 'data.get("status")')"
if [[ "$result_status" != "completed" ]]; then
  echo "error: expected completed result status, got ${result_status}" >&2
  exit 1
fi

file_count="$(extract_json_field "$result_json" 'len(data.get("files") or [])')"
if [[ "$file_count" == "0" ]]; then
  echo "error: completed result did not include files" >&2
  exit 1
fi

missing_count="$(printf '%s' "$result_json" | python3 -c 'import json,os,sys; data=json.load(sys.stdin); files=data.get("files") or []; missing=[f.get("path","") for f in files if not os.path.isfile(f.get("path",""))]; print(len(missing), end=""); [print(path, file=sys.stderr) for path in missing]')"
if [[ "$missing_count" != "0" ]]; then
  echo "error: one or more downloaded files are missing" >&2
  exit 1
fi

echo "[e2e-system] success"
echo "[e2e-system] agent_id=${AGENT_ID}"
echo "[e2e-system] job_id=${job_id}"
echo "[e2e-system] downloaded_files=${file_count}"
echo "[e2e-system] output_dir=${OUTPUT_DIR}"
echo "[e2e-system] executor_log=${EXECUTOR_LOG}"
