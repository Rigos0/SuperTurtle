#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_BASE_URL="${API_BASE_URL:-http://localhost:8000}"
BUYER_API_KEY="${BUYER_API_KEY:-buyer-dev-key}"
EXECUTOR_API_KEY="${EXECUTOR_API_KEY:-executor-dev-key}"
AGENT_ID_GEMINI="${AGENT_ID_GEMINI:-55555555-5555-5555-5555-555555555555}"
AGENT_ID_CLAUDE="${AGENT_ID_CLAUDE:-66666666-6666-6666-6666-666666666666}"
AGENT_ID_CODEX="${AGENT_ID_CODEX:-77777777-7777-7777-7777-777777777777}"
AGENT_ID_CODE_REVIEW="${AGENT_ID_CODE_REVIEW:-88888888-8888-8888-8888-888888888888}"
PROMPT_GEMINI="${PROMPT_GEMINI:-Create a short success note in markdown}"
PROMPT_CLAUDE="${PROMPT_CLAUDE:-Draft a short implementation summary}"
PROMPT_CODEX="${PROMPT_CODEX:-Produce a concise release checklist}"
PROMPT_CODE_REVIEW="${PROMPT_CODE_REVIEW:-Focus extra on correctness and security}"
OUTPUT_DIR="${OUTPUT_DIR:-${ROOT_DIR}/.tmp/e2e-executors-results}"
LOG_DIR="${LOG_DIR:-${ROOT_DIR}/.tmp/e2e-executors-logs}"
STATUS_TIMEOUT_SECONDS="${STATUS_TIMEOUT_SECONDS:-120}"
STATUS_POLL_SECONDS="${STATUS_POLL_SECONDS:-2}"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/agnt-e2e-executors.XXXXXX")"
BIN_DIR="${TMP_DIR}/bin"
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

resolve_executor_python() {
  local executor_dir="$1"
  local venv_python="${executor_dir}/.venv/bin/python3"
  local requirements_file="${executor_dir}/requirements.txt"

  if [[ -x "$venv_python" ]]; then
    echo "$venv_python"
    return
  fi

  require_cmd python3
  if [[ ! -f "$requirements_file" ]]; then
    echo "error: missing requirements file: ${requirements_file}" >&2
    exit 1
  fi

  echo "[e2e-executors] creating venv for ${executor_dir}" >&2
  (
    cd "$executor_dir"
    python3 -m venv .venv >/dev/null 2>&1
    .venv/bin/pip install --quiet -r requirements.txt >&2
  )

  if [[ ! -x "$venv_python" ]]; then
    echo "error: failed to prepare python runtime for ${executor_dir}" >&2
    exit 1
  fi

  echo "$venv_python"
}

start_executor() {
  local case_name="$1"
  local agent_id="$2"
  local executor_script="$3"
  local executor_python="$4"
  local bin_env_name="$5"
  local bin_path="$6"
  local log_path="$7"

  if [[ ! -f "$executor_script" ]]; then
    echo "error: executor script not found: ${executor_script}" >&2
    exit 1
  fi

  mkdir -p "$(dirname "$log_path")"
  rm -f "$log_path"

  env \
    AGNT_API_URL="$API_BASE_URL" \
    AGNT_EXECUTOR_API_KEY="$EXECUTOR_API_KEY" \
    AGNT_AGENT_ID="$agent_id" \
    POLL_INTERVAL_SECONDS=1 \
    JOB_TIMEOUT_SECONDS=60 \
    "$bin_env_name=$bin_path" \
    "$executor_python" "$executor_script" >"$log_path" 2>&1 &
  EXECUTOR_PID=$!

  sleep 1
  if ! kill -0 "$EXECUTOR_PID" >/dev/null 2>&1; then
    echo "error: ${case_name} executor failed to start" >&2
    echo "executor log: ${log_path}" >&2
    exit 1
  fi
}

stop_executor() {
  if [[ -n "$EXECUTOR_PID" ]] && kill -0 "$EXECUTOR_PID" >/dev/null 2>&1; then
    kill "$EXECUTOR_PID" >/dev/null 2>&1 || true
    wait "$EXECUTOR_PID" >/dev/null 2>&1 || true
  fi
  EXECUTOR_PID=""
}

wait_for_job_list_entry() {
  local job_id="$1"
  local attempt
  for attempt in $(seq 1 30); do
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
  local log_path="$2"
  local deadline=$((SECONDS + STATUS_TIMEOUT_SECONDS))

  while ((SECONDS < deadline)); do
    local status_json
    status_json="$(run_cli status "$job_id")"
    local status
    status="$(extract_json_field "$status_json" 'data.get("status")')"
    local progress
    progress="$(extract_json_field "$status_json" 'data.get("progress")')"

    echo "[e2e-executors] job=${job_id} status=${status} progress=${progress}"

    if [[ "$status" == "completed" ]]; then
      return
    fi

    if [[ "$status" == "failed" || "$status" == "rejected" ]]; then
      local reason
      reason="$(extract_json_field "$status_json" 'data.get("decision_reason")')"
      echo "error: job reached terminal failure status=${status} reason=${reason}" >&2
      echo "executor log: ${log_path}" >&2
      exit 1
    fi

    sleep "$STATUS_POLL_SECONDS"
  done

  echo "error: job did not complete within ${STATUS_TIMEOUT_SECONDS}s" >&2
  echo "executor log: ${log_path}" >&2
  exit 1
}

download_and_validate_result() {
  local case_name="$1"
  local job_id="$2"
  local expect_no_input_files="$3"
  local case_output_dir="${OUTPUT_DIR}/${case_name}"

  rm -rf "$case_output_dir"
  mkdir -p "$case_output_dir"

  local result_json
  result_json="$(run_cli result "$job_id" --output "$case_output_dir")"
  local result_status
  result_status="$(extract_json_field "$result_json" 'data.get("status")')"
  if [[ "$result_status" != "completed" ]]; then
    echo "error: expected completed result status for ${case_name}, got ${result_status}" >&2
    exit 1
  fi

  local file_count
  file_count="$(extract_json_field "$result_json" 'len(data.get("files") or [])')"
  if [[ "$file_count" == "0" ]]; then
    echo "error: completed result for ${case_name} did not include files" >&2
    exit 1
  fi

  local missing_count
  missing_count="$(printf '%s' "$result_json" | python3 -c 'import json,os,sys; data=json.load(sys.stdin); files=data.get("files") or []; missing=[f.get("path","") for f in files if not os.path.isfile(f.get("path",""))]; print(len(missing), end="")')"
  if [[ "$missing_count" != "0" ]]; then
    echo "error: one or more downloaded files are missing for ${case_name}" >&2
    exit 1
  fi

  if [[ "$expect_no_input_files" == "true" ]]; then
    local input_file_count
    input_file_count="$(printf '%s' "$result_json" | python3 -c 'import json,os,sys; data=json.load(sys.stdin); files=data.get("files") or []; print(sum(1 for f in files if (lambda base: "input." in base or base.endswith("-input"))(os.path.basename(f.get("path", "")).lower())), end="")')"
    if [[ "$input_file_count" != "0" ]]; then
      echo "error: code-review result included input files" >&2
      exit 1
    fi
  fi

  echo "[e2e-executors] case=${case_name} files=${file_count} output_dir=${case_output_dir}"
}

create_stub_binaries() {
  mkdir -p "$BIN_DIR"

  cat >"${BIN_DIR}/gemini" <<'STUB'
#!/usr/bin/env bash
set -euo pipefail
printf 'gemini stub response\n'
STUB

  cat >"${BIN_DIR}/codex" <<'STUB'
#!/usr/bin/env bash
set -euo pipefail
if [[ "${1:-}" == "exec" ]]; then
  shift
fi
printf 'codex stub response\n'
STUB

  cat >"${BIN_DIR}/claude" <<'STUB'
#!/usr/bin/env bash
set -euo pipefail
prompt=""
while (($#)); do
  if [[ "$1" == "-p" ]]; then
    shift
    prompt="${1:-}"
    break
  fi
  shift
done

if [[ "$prompt" == *"Write the review to review.md."* ]]; then
  cat > review.md <<'REVIEW_EOF'
# Review
- correctness: pass
- security: pass
- performance: acceptable
- readability: clear
REVIEW_EOF
  printf 'code review stub response\n'
else
  printf 'claude stub response\n'
fi
STUB

  chmod +x "${BIN_DIR}/gemini" "${BIN_DIR}/codex" "${BIN_DIR}/claude"
}

run_case() {
  local case_name="$1"
  local agent_id="$2"
  local executor_script="$3"
  local bin_env_name="$4"
  local bin_path="$5"
  local prompt_text="$6"
  local expect_no_input_files="$7"
  shift 7

  local info_json
  info_json="$(run_cli info "$agent_id")"
  local info_agent_id
  info_agent_id="$(extract_json_field "$info_json" 'data.get("agent_id")')"
  if [[ "$info_agent_id" != "$agent_id" ]]; then
    echo "error: expected agent ${agent_id} for ${case_name}, got ${info_agent_id}" >&2
    exit 1
  fi

  local executor_dir
  executor_dir="$(cd "$(dirname "$executor_script")" && pwd)"
  local executor_python
  executor_python="$(resolve_executor_python "$executor_dir")"
  local log_path="${LOG_DIR}/${case_name}.log"

  echo "[e2e-executors] starting ${case_name} executor"
  start_executor "$case_name" "$agent_id" "$executor_script" "$executor_python" "$bin_env_name" "$bin_path" "$log_path"

  local -a order_args
  order_args=(order "$agent_id" --prompt "$prompt_text" --param "source=e2e-${case_name}")
  while (($#)); do
    order_args+=(--param "$1")
    shift
  done

  echo "[e2e-executors] creating ${case_name} job"
  local order_json
  order_json="$(run_cli "${order_args[@]}")"
  local job_id
  job_id="$(extract_json_field "$order_json" 'data.get("job_id")')"
  if [[ -z "$job_id" ]]; then
    echo "error: failed to parse job_id for ${case_name}" >&2
    echo "order response: ${order_json}" >&2
    exit 1
  fi

  wait_for_job_list_entry "$job_id"
  wait_for_terminal_status "$job_id" "$log_path"
  download_and_validate_result "$case_name" "$job_id" "$expect_no_input_files"

  stop_executor
}

require_cmd curl
require_cmd python3

mkdir -p "$OUTPUT_DIR" "$LOG_DIR"
create_stub_binaries

echo "[e2e-executors] waiting for API health: $(api_url /health)"
wait_for_api

run_case \
  "gemini" \
  "$AGENT_ID_GEMINI" \
  "${ROOT_DIR}/executors/gemini/executor.py" \
  "GEMINI_BIN" \
  "${BIN_DIR}/gemini" \
  "$PROMPT_GEMINI" \
  "false"

run_case \
  "claude" \
  "$AGENT_ID_CLAUDE" \
  "${ROOT_DIR}/executors/claude/executor.py" \
  "CLAUDE_BIN" \
  "${BIN_DIR}/claude" \
  "$PROMPT_CLAUDE" \
  "false"

run_case \
  "codex" \
  "$AGENT_ID_CODEX" \
  "${ROOT_DIR}/executors/codex/executor.py" \
  "CODEX_BIN" \
  "${BIN_DIR}/codex" \
  "$PROMPT_CODEX" \
  "false"

run_case \
  "code-review" \
  "$AGENT_ID_CODE_REVIEW" \
  "${ROOT_DIR}/executors/code_review/executor.py" \
  "CLAUDE_BIN" \
  "${BIN_DIR}/claude" \
  "$PROMPT_CODE_REVIEW" \
  "true" \
  "language=python" \
  "code=print(1)"

echo "[e2e-executors] success"
echo "[e2e-executors] output_dir=${OUTPUT_DIR}"
echo "[e2e-executors] log_dir=${LOG_DIR}"
