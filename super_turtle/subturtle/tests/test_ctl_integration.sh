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
  grep -Fq "$needle" "$path" || fail "expected '$path' to contain '$needle'"
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
