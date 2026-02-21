#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_BASE_URL="${API_BASE_URL:-http://localhost:8000}"
SEARCH_QUERY="${SEARCH_QUERY:-sample}"
PROMPT_TEXT="${PROMPT_TEXT:-Integration flow test}"
OUTPUT_DIR="${OUTPUT_DIR:-${ROOT_DIR}/.tmp/integration-results}"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/agnt-integration.XXXXXX")"

cleanup() {
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
  if [[ -n "${AGNT_BIN:-}" ]]; then
    AGNT_API_BASE_URL="$API_BASE_URL" "$AGNT_BIN" "$@"
    return
  fi

  require_cmd go
  (
    cd "$ROOT_DIR/cli"
    AGNT_API_BASE_URL="$API_BASE_URL" go run ./cmd/agnt "$@"
  )
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

extract_json_field() {
  local json_input="$1"
  local python_expr="$2"
  printf '%s' "$json_input" | python3 -c "import json,sys; data=json.load(sys.stdin); value=${python_expr}; print(value if value is not None else '', end='')"
}

require_cmd curl
require_cmd python3

echo "[integration] waiting for API health: $(api_url /health)"
wait_for_api

echo "[integration] searching agents with query: ${SEARCH_QUERY}"
search_json="$(run_cli search "$SEARCH_QUERY")"
agent_id="$(extract_json_field "$search_json" '(data.get("agents") or [{}])[0].get("agent_id")')"
if [[ -z "$agent_id" ]]; then
  echo "error: no agents returned by search; run seeding first" >&2
  exit 1
fi

echo "[integration] fetching agent details: ${agent_id}"
info_json="$(run_cli info "$agent_id")"
info_agent_id="$(extract_json_field "$info_json" 'data.get("agent_id")')"
if [[ "$info_agent_id" != "$agent_id" ]]; then
  echo "error: info response agent_id mismatch: ${info_agent_id}" >&2
  exit 1
fi

echo "[integration] creating job"
order_json="$(run_cli order "$agent_id" --prompt "$PROMPT_TEXT" --param source=integration)"
job_id="$(extract_json_field "$order_json" 'data.get("job_id")')"
if [[ -z "$job_id" ]]; then
  echo "error: failed to parse job_id from order response" >&2
  exit 1
fi

echo "[integration] checking pending executor queue"
pending_json="$(curl -fsS "$(api_url "/v1/executor/jobs?agent_id=${agent_id}&status=pending")")"
pending_has_job="$(printf '%s' "$pending_json" | JOB_ID="$job_id" python3 -c 'import json,os,sys; data=json.load(sys.stdin); jobs=data.get("jobs") or []; print(any(job.get("job_id")==os.environ["JOB_ID"] for job in jobs), end="")')"
if [[ "$pending_has_job" != "True" ]]; then
  echo "error: pending queue does not contain job ${job_id}" >&2
  exit 1
fi

echo "[integration] executor accepts job"
accept_json="$(curl -fsS -X POST "$(api_url "/v1/executor/jobs/${job_id}/status")" -H 'Content-Type: application/json' -d '{"status":"accepted"}')"
accept_status="$(extract_json_field "$accept_json" 'data.get("status")')"
if [[ "$accept_status" != "accepted" ]]; then
  echo "error: expected accepted status, got ${accept_status}" >&2
  exit 1
fi

echo "[integration] executor starts running job"
running_json="$(curl -fsS -X POST "$(api_url "/v1/executor/jobs/${job_id}/status")" -H 'Content-Type: application/json' -d '{"status":"running","progress":42}')"
running_status="$(extract_json_field "$running_json" 'data.get("status")')"
if [[ "$running_status" != "running" ]]; then
  echo "error: expected running status, got ${running_status}" >&2
  exit 1
fi

printf 'integration-success\n' >"$TMP_DIR/result.txt"
printf '{"source":"integration","ok":true}\n' >"$TMP_DIR/summary.json"

echo "[integration] executor completes job with uploaded files"
complete_json="$(curl -fsS -X POST "$(api_url "/v1/executor/jobs/${job_id}/complete")" -F "files=@${TMP_DIR}/result.txt;type=text/plain" -F "files=@${TMP_DIR}/summary.json;type=application/json")"
complete_status="$(extract_json_field "$complete_json" 'data.get("status")')"
if [[ "$complete_status" != "completed" ]]; then
  echo "error: expected completed status after /complete, got ${complete_status}" >&2
  exit 1
fi

echo "[integration] verifying CLI status command"
status_json="$(run_cli status "$job_id")"
status_value="$(extract_json_field "$status_json" 'data.get("status")')"
if [[ "$status_value" != "completed" ]]; then
  echo "error: expected CLI status completed, got ${status_value}" >&2
  exit 1
fi

rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"
echo "[integration] downloading CLI result files to ${OUTPUT_DIR}"
result_json="$(run_cli result "$job_id" --output "$OUTPUT_DIR")"
result_status="$(extract_json_field "$result_json" 'data.get("status")')"
if [[ "$result_status" != "completed" ]]; then
  echo "error: expected CLI result status completed, got ${result_status}" >&2
  exit 1
fi

missing_count="$(printf '%s' "$result_json" | python3 -c 'import json,os,sys; data=json.load(sys.stdin); files=data.get("files") or []; missing=[f.get("path","") for f in files if not os.path.isfile(f.get("path",""))]; print(len(missing), end=""); [print(path, file=sys.stderr) for path in missing]')"
if [[ "$missing_count" != "0" ]]; then
  echo "error: one or more downloaded result files are missing" >&2
  exit 1
fi

echo "[integration] success"
echo "[integration] agent_id=${agent_id}"
echo "[integration] job_id=${job_id}"
echo "[integration] output_dir=${OUTPUT_DIR}"
