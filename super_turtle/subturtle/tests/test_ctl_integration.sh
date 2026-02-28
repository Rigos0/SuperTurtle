#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
CTL="${ROOT_DIR}/super_turtle/subturtle/ctl"
CRON_JOBS_FILE="${ROOT_DIR}/super_turtle/claude-telegram-bot/cron-jobs.json"
SUBTURTLES_DIR="${ROOT_DIR}/.subturtles"
ARCHIVE_DIR="${SUBTURTLES_DIR}/.archive"

RUN_ID="$(date +%s)-$$"
TMP_DIR=""
FAKE_BIN_DIR=""
CRON_BACKUP_FILE=""
CRON_EXISTED=0
ORIGINAL_PATH="${PATH}"

TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

declare -a TEST_SUBTURTLES=()
declare -a ALL_TESTS=()

log() {
  printf '[test-ctl] %s\n' "$*"
}

fail() {
  printf '[FAIL] %s\n' "$*" >&2
  return 1
}

make_test_name() {
  local name="$1"
  printf 'test-%s-%s-%s\n' "$name" "$RUN_ID" "$RANDOM"
}

track_subturtle() {
  local name="$1"
  TEST_SUBTURTLES+=("$name")
}

backup_cron_jobs() {
  if [[ -f "$CRON_JOBS_FILE" ]]; then
    cp "$CRON_JOBS_FILE" "$CRON_BACKUP_FILE"
    CRON_EXISTED=1
  else
    CRON_EXISTED=0
    : > "$CRON_BACKUP_FILE"
  fi
}

restore_cron_jobs() {
  if (( CRON_EXISTED == 1 )); then
    cp "$CRON_BACKUP_FILE" "$CRON_JOBS_FILE"
  else
    rm -f "$CRON_JOBS_FILE"
  fi
}

setup_fake_bins() {
  mkdir -p "$FAKE_BIN_DIR"

  cat > "${FAKE_BIN_DIR}/claude" <<'SH'
#!/usr/bin/env bash
exec sleep 3600
SH
  chmod +x "${FAKE_BIN_DIR}/claude"

  cat > "${FAKE_BIN_DIR}/codex" <<'SH'
#!/usr/bin/env bash
exec sleep 3600
SH
  chmod +x "${FAKE_BIN_DIR}/codex"
}

setup_harness() {
  TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/test-ctl-integration.XXXXXX")"
  FAKE_BIN_DIR="${TMP_DIR}/bin"
  CRON_BACKUP_FILE="${TMP_DIR}/cron-jobs.json.bak"

  backup_cron_jobs
  setup_fake_bins

  export PATH="${FAKE_BIN_DIR}:${ORIGINAL_PATH}"

  mkdir -p "$SUBTURTLES_DIR" "$ARCHIVE_DIR"
  cd "$ROOT_DIR"
}

cleanup_test_subturtles() {
  local name ws archive_ws
  if (( ${#TEST_SUBTURTLES[@]} > 0 )); then
    for name in "${TEST_SUBTURTLES[@]}"; do
      "$CTL" stop "$name" >/dev/null 2>&1 || true
      ws="${SUBTURTLES_DIR}/${name}"
      archive_ws="${ARCHIVE_DIR}/${name}"
      rm -rf "$ws" "$archive_ws"
    done
  fi

  local -a run_scoped_paths=()
  shopt -s nullglob
  run_scoped_paths=(
    "${SUBTURTLES_DIR}"/test-*-"${RUN_ID}"-*
    "${ARCHIVE_DIR}"/test-*-"${RUN_ID}"-*
  )
  shopt -u nullglob

  if (( ${#run_scoped_paths[@]} > 0 )); then
    for ws in "${run_scoped_paths[@]}"; do
      [[ -d "$ws" ]] || continue
      name="$(basename "$ws")"
      "$CTL" stop "$name" >/dev/null 2>&1 || true
      rm -rf "$ws"
    done
  fi
}

teardown_harness() {
  cleanup_test_subturtles || true
  restore_cron_jobs || true
  export PATH="$ORIGINAL_PATH"
  rm -rf "$TMP_DIR"
}

assert_file_exists() {
  local path="$1"
  [[ -f "$path" ]] || fail "expected file to exist: $path"
}

assert_dir_exists() {
  local path="$1"
  [[ -d "$path" ]] || fail "expected directory to exist: $path"
}

assert_dir_not_exists() {
  local path="$1"
  [[ ! -d "$path" ]] || fail "expected directory to not exist: $path"
}

assert_symlink_target() {
  local path="$1"
  local expected_target="$2"
  [[ -L "$path" ]] || fail "expected symlink: $path"
  local actual_target
  actual_target="$(readlink "$path")"
  [[ "$actual_target" == "$expected_target" ]] || fail "expected symlink $path -> $expected_target, got $actual_target"
}

assert_contains() {
  local haystack="$1"
  local needle="$2"
  [[ "$haystack" == *"$needle"* ]] || fail "expected output to contain '$needle'"
}

assert_file_contains() {
  local path="$1"
  local needle="$2"
  assert_file_exists "$path" || return 1
  grep -Fq -- "$needle" "$path" || fail "expected '$path' to contain '$needle'"
}

assert_equals() {
  local actual="$1"
  local expected="$2"
  [[ "$actual" == "$expected" ]] || fail "expected '$expected', got '$actual'"
}

assert_not_empty() {
  local value="$1"
  local label="$2"
  [[ -n "$value" ]] || fail "expected non-empty value for ${label}"
}

assert_pid_running() {
  local pid="$1"
  kill -0 "$pid" 2>/dev/null || fail "expected PID ${pid} to be running"
}

assert_pid_dead() {
  local pid="$1"
  if kill -0 "$pid" 2>/dev/null; then
    fail "expected PID ${pid} to be stopped"
  fi
}

run_and_capture() {
  local out_file="$1"
  local err_file="$2"
  shift 2

  set +e
  "$@" >"$out_file" 2>"$err_file"
  local status=$?
  set -e
  return "$status"
}

register_test() {
  local test_name="$1"
  ALL_TESTS+=("$test_name")
}

meta_value() {
  local name="$1"
  local key="$2"
  local path="${SUBTURTLES_DIR}/${name}/subturtle.meta"
  grep -m1 "^${key}=" "$path" 2>/dev/null | cut -d= -f2-
}

assert_cron_job_exists() {
  local job_id="$1"
  assert_not_empty "$job_id" "cron job id" || return 1

  python3 - "$CRON_JOBS_FILE" "$job_id" <<'PY'
import json
import sys
from pathlib import Path

cron_jobs_path = Path(sys.argv[1])
job_id = sys.argv[2]
raw = cron_jobs_path.read_text(encoding="utf-8").strip() if cron_jobs_path.exists() else ""
jobs = json.loads(raw) if raw else []
if not isinstance(jobs, list):
    raise SystemExit(2)
found = any(isinstance(job, dict) and str(job.get("id")) == job_id for job in jobs)
raise SystemExit(0 if found else 1)
PY
}

assert_cron_job_missing() {
  local job_id="$1"
  assert_not_empty "$job_id" "cron job id" || return 1

  if assert_cron_job_exists "$job_id"; then
    fail "expected cron job ${job_id} to be removed from ${CRON_JOBS_FILE}"
    return 1
  fi
}

stop_subturtle_if_running() {
  local name="$1"
  "$CTL" stop "$name" >/dev/null 2>&1 || true
}

test_spawn_creates_workspace() {
  local name state_path ws pid meta cron_job_id
  name="$(make_test_name "spawn-workspace")"
  state_path="${TMP_DIR}/${name}.md"
  ws="${SUBTURTLES_DIR}/${name}"

  cat > "$state_path" <<'STATE'
# Current Task
spawn workspace creation test
STATE

  if ! "$CTL" spawn "$name" --type yolo-codex --timeout 2m --state-file "$state_path" >/dev/null; then
    fail "spawn failed for ${name}"
    return 1
  fi
  track_subturtle "$name"

  assert_dir_exists "$ws" || return 1
  assert_file_exists "${ws}/CLAUDE.md" || return 1
  assert_symlink_target "${ws}/AGENTS.md" "CLAUDE.md" || return 1
  assert_file_exists "${ws}/subturtle.pid" || return 1
  assert_file_exists "${ws}/subturtle.meta" || return 1

  pid="$(cat "${ws}/subturtle.pid")"
  assert_pid_running "$pid" || return 1

  meta="$(meta_value "$name" "CRON_JOB_ID")"
  cron_job_id="$meta"
  assert_not_empty "$cron_job_id" "CRON_JOB_ID" || return 1
  if ! assert_cron_job_exists "$cron_job_id"; then
    fail "cron job ${cron_job_id} not present in ${CRON_JOBS_FILE}"
    return 1
  fi

  stop_subturtle_if_running "$name"
  return 0
}

test_spawn_stdin_state() {
  local name ws
  name="$(make_test_name "spawn-stdin")"
  ws="${SUBTURTLES_DIR}/${name}"

  if ! printf '%s\n' '# Current Task' 'stdin state test' '' '## Backlog' '- [ ] item' | \
    "$CTL" spawn "$name" --type yolo-codex --timeout 2m --state-file - >/dev/null; then
    fail "spawn with stdin state failed for ${name}"
    return 1
  fi
  track_subturtle "$name"

  assert_file_exists "${ws}/CLAUDE.md" || return 1
  assert_file_contains "${ws}/CLAUDE.md" "stdin state test" || return 1
  assert_file_contains "${ws}/CLAUDE.md" "- [ ] item" || return 1

  stop_subturtle_if_running "$name"
  return 0
}

test_spawn_file_state() {
  local name state_path ws expected
  name="$(make_test_name "spawn-file")"
  state_path="${TMP_DIR}/${name}.md"
  ws="${SUBTURTLES_DIR}/${name}"

  cat > "$state_path" <<'STATE'
# Current Task
file state test

## Backlog
- [ ] one
STATE
  expected="$(cat "$state_path")"

  if ! "$CTL" spawn "$name" --type yolo-codex --timeout 2m --state-file "$state_path" >/dev/null; then
    fail "spawn with state file failed for ${name}"
    return 1
  fi
  track_subturtle "$name"

  assert_file_exists "${ws}/CLAUDE.md" || return 1
  assert_equals "$(cat "${ws}/CLAUDE.md")" "$expected" || return 1

  stop_subturtle_if_running "$name"
  return 0
}

test_spawn_with_skills() {
  local name state_path ws skills_json
  name="$(make_test_name "spawn-skills")"
  state_path="${TMP_DIR}/${name}.md"
  ws="${SUBTURTLES_DIR}/${name}"

  cat > "$state_path" <<'STATE'
# Current Task
spawn skills test
STATE

  if ! "$CTL" spawn "$name" --type yolo-codex --timeout 2m --state-file "$state_path" --skill frontend --skill testing >/dev/null; then
    fail "spawn with skills failed for ${name}"
    return 1
  fi
  track_subturtle "$name"

  assert_file_exists "${ws}/subturtle.meta" || return 1
  skills_json="$(meta_value "$name" "SKILLS")"
  assert_not_empty "$skills_json" "SKILLS" || return 1

  if ! python3 - "$skills_json" <<'PY'
import json
import sys

skills = json.loads(sys.argv[1])
raise SystemExit(0 if skills == ["frontend", "testing"] else 1)
PY
  then
    fail "expected SKILLS to equal [\"frontend\", \"testing\"], got: ${skills_json}"
    return 1
  fi

  stop_subturtle_if_running "$name"
  return 0
}

test_status_running() {
  local name state_path ws pid status_output
  name="$(make_test_name "status-running")"
  state_path="${TMP_DIR}/${name}.md"
  ws="${SUBTURTLES_DIR}/${name}"

  cat > "$state_path" <<'STATE'
# Current Task
status running test
STATE

  if ! "$CTL" spawn "$name" --type yolo-codex --timeout 2m --state-file "$state_path" >/dev/null; then
    fail "spawn failed for ${name}"
    return 1
  fi
  track_subturtle "$name"

  pid="$(cat "${ws}/subturtle.pid")"
  assert_pid_running "$pid" || return 1

  status_output="$("$CTL" status "$name")"
  assert_contains "$status_output" "[subturtle:${name}] running as yolo-codex (PID ${pid})" || return 1
  assert_contains "$status_output" "elapsed" || return 1
  assert_contains "$status_output" "left" || return 1

  stop_subturtle_if_running "$name"
  return 0
}

test_status_stopped() {
  local name state_path status_output
  name="$(make_test_name "status-stopped")"
  state_path="${TMP_DIR}/${name}.md"

  cat > "$state_path" <<'STATE'
# Current Task
status stopped test
STATE

  if ! "$CTL" spawn "$name" --type yolo-codex --timeout 2m --state-file "$state_path" >/dev/null; then
    fail "spawn failed for ${name}"
    return 1
  fi
  track_subturtle "$name"

  stop_subturtle_if_running "$name"

  status_output="$("$CTL" status "$name")"
  assert_contains "$status_output" "[subturtle:${name}] not running" || return 1
  return 0
}

test_stop_kills_process() {
  local name state_path ws pid
  name="$(make_test_name "stop-kills-process")"
  state_path="${TMP_DIR}/${name}.md"
  ws="${SUBTURTLES_DIR}/${name}"

  cat > "$state_path" <<'STATE'
# Current Task
stop kills process test
STATE

  if ! "$CTL" spawn "$name" --type yolo-codex --timeout 2m --state-file "$state_path" >/dev/null; then
    fail "spawn failed for ${name}"
    return 1
  fi
  track_subturtle "$name"

  pid="$(cat "${ws}/subturtle.pid")"
  assert_pid_running "$pid" || return 1

  if ! "$CTL" stop "$name" >/dev/null; then
    fail "stop failed for ${name}"
    return 1
  fi

  assert_pid_dead "$pid" || return 1
  return 0
}

test_stop_cleans_cron() {
  local name state_path cron_job_id
  name="$(make_test_name "stop-cleans-cron")"
  state_path="${TMP_DIR}/${name}.md"

  cat > "$state_path" <<'STATE'
# Current Task
stop cleans cron test
STATE

  if ! "$CTL" spawn "$name" --type yolo-codex --timeout 2m --state-file "$state_path" >/dev/null; then
    fail "spawn failed for ${name}"
    return 1
  fi
  track_subturtle "$name"

  cron_job_id="$(meta_value "$name" "CRON_JOB_ID")"
  assert_not_empty "$cron_job_id" "CRON_JOB_ID" || return 1
  assert_cron_job_exists "$cron_job_id" || return 1

  if ! "$CTL" stop "$name" >/dev/null; then
    fail "stop failed for ${name}"
    return 1
  fi

  assert_cron_job_missing "$cron_job_id" || return 1
  return 0
}

test_stop_archives_workspace() {
  local name state_path ws archive_ws
  name="$(make_test_name "stop-archives-workspace")"
  state_path="${TMP_DIR}/${name}.md"
  ws="${SUBTURTLES_DIR}/${name}"
  archive_ws="${ARCHIVE_DIR}/${name}"

  cat > "$state_path" <<'STATE'
# Current Task
stop archives workspace test
STATE

  if ! "$CTL" spawn "$name" --type yolo-codex --timeout 2m --state-file "$state_path" >/dev/null; then
    fail "spawn failed for ${name}"
    return 1
  fi
  track_subturtle "$name"
  assert_dir_exists "$ws" || return 1

  if ! "$CTL" stop "$name" >/dev/null; then
    fail "stop failed for ${name}"
    return 1
  fi

  assert_dir_not_exists "$ws" || return 1
  assert_dir_exists "$archive_ws" || return 1
  assert_file_exists "${archive_ws}/CLAUDE.md" || return 1
  return 0
}

test_stop_already_dead() {
  local name state_path ws pid stop_output
  name="$(make_test_name "stop-already-dead")"
  state_path="${TMP_DIR}/${name}.md"
  ws="${SUBTURTLES_DIR}/${name}"

  cat > "$state_path" <<'STATE'
# Current Task
stop already dead test
STATE

  if ! "$CTL" spawn "$name" --type yolo-codex --timeout 2m --state-file "$state_path" >/dev/null; then
    fail "spawn failed for ${name}"
    return 1
  fi
  track_subturtle "$name"

  pid="$(cat "${ws}/subturtle.pid")"
  assert_pid_running "$pid" || return 1
  kill -9 "$pid" 2>/dev/null || true

  for _ in $(seq 1 20); do
    if ! kill -0 "$pid" 2>/dev/null; then
      break
    fi
    sleep 0.2
  done

  stop_output="$("$CTL" stop "$name" 2>&1)"
  assert_contains "$stop_output" "[subturtle:${name}] not running" || return 1
  assert_dir_exists "${ARCHIVE_DIR}/${name}" || return 1
  return 0
}

run_test() {
  local test_name="$1"
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  printf '[RUN ] %s\n' "$test_name"

  set +e
  "$test_name"
  local status=$?
  set -e

  if [[ "$status" -eq 0 ]]; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    printf '[PASS] %s\n' "$test_name"
    return 0
  fi

  FAILED_TESTS=$((FAILED_TESTS + 1))
  printf '[FAIL] %s\n' "$test_name"
  return 1
}

test_harness_bootstrap() {
  local claude_path codex_path
  claude_path="$(command -v claude)"
  codex_path="$(command -v codex)"

  [[ "$claude_path" == "${FAKE_BIN_DIR}/claude" ]] || fail "fake claude not first on PATH"
  [[ "$codex_path" == "${FAKE_BIN_DIR}/codex" ]] || fail "fake codex not first on PATH"
  assert_file_exists "$CRON_JOBS_FILE"
}

register_test test_harness_bootstrap
register_test test_spawn_creates_workspace
register_test test_spawn_stdin_state
register_test test_spawn_file_state
register_test test_spawn_with_skills
register_test test_status_running
register_test test_status_stopped
register_test test_stop_kills_process
register_test test_stop_cleans_cron
register_test test_stop_archives_workspace
register_test test_stop_already_dead

run_all_tests() {
  local test_name
  for test_name in "${ALL_TESTS[@]}"; do
    run_test "$test_name" || true
  done

  printf '\n[SUMMARY] total=%s passed=%s failed=%s\n' "$TOTAL_TESTS" "$PASSED_TESTS" "$FAILED_TESTS"
  [[ "$FAILED_TESTS" -eq 0 ]]
}

cleanup_on_exit() {
  local exit_code=$?
  set +e
  teardown_harness
  exit "$exit_code"
}

list_tests() {
  local test_name
  for test_name in "${ALL_TESTS[@]}"; do
    echo "$test_name"
  done
}

main() {
  trap cleanup_on_exit EXIT
  setup_harness

  if [[ "${1:-}" == "--list" ]]; then
    list_tests
    return 0
  fi

  if run_all_tests; then
    log "all registered harness checks passed"
    return 0
  fi

  return 1
}

main "$@"
