#!/usr/bin/env bash
set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
readonly DEFAULT_CRON_JOBS_FILE="${ROOT_DIR}/super_turtle/claude-telegram-bot/cron-jobs.json"
readonly DEFAULT_ONE_SHOT_GRACE_MS=30000

CRON_JOBS_FILE="${DEFAULT_CRON_JOBS_FILE}"
AS_OF_MS=""
ONE_SHOT_GRACE_MS="${DEFAULT_ONE_SHOT_GRACE_MS}"
DRY_RUN=0

usage() {
  cat <<'EOF_USAGE'
Usage: bash super_turtle/e2b/reconcile-cron.sh [options]

Reconciles overdue cron jobs after a pause/resume window.

Policy:
  - Overdue one-shot jobs are deferred to as_of + one-shot-grace-ms.
  - Overdue recurring jobs are snapped to as_of + interval_ms.
    Missed recurring windows are skipped to avoid burst catch-up.

Options:
  --cron-jobs-file <path>    Path to cron-jobs.json (default: super_turtle/claude-telegram-bot/cron-jobs.json)
  --as-of-ms <epoch-ms>      Reconcile threshold timestamp (default: now)
  --one-shot-grace-ms <ms>   Delay for overdue one-shot jobs (default: 30000)
  --dry-run                  Print summary only; do not write file
  -h, --help                 Show this help

Examples:
  bash super_turtle/e2b/remote.sh reconcile-cron
  bash super_turtle/e2b/remote.sh reconcile-cron --dry-run
  bash super_turtle/e2b/remote.sh reconcile-cron --as-of-ms 1772208600000 --one-shot-grace-ms 15000
EOF_USAGE
}

log() {
  local msg="${1:?message required}"
  echo "[e2b-reconcile-cron] ${msg}"
}

die() {
  local msg="${1:?message required}"
  echo "[e2b-reconcile-cron] ERROR: ${msg}" >&2
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

is_non_negative_int() {
  local value="${1:-}"
  [[ "${value}" =~ ^[0-9]+$ ]]
}

now_ms() {
  "${PYTHON_BIN}" - <<'PY'
import time
print(int(time.time() * 1000))
PY
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --cron-jobs-file)
        CRON_JOBS_FILE="${2:-}"
        [[ -n "${CRON_JOBS_FILE}" ]] || die "--cron-jobs-file requires a value"
        shift 2
        ;;
      --as-of-ms)
        AS_OF_MS="${2:-}"
        [[ -n "${AS_OF_MS}" ]] || die "--as-of-ms requires a value"
        shift 2
        ;;
      --one-shot-grace-ms)
        ONE_SHOT_GRACE_MS="${2:-}"
        [[ -n "${ONE_SHOT_GRACE_MS}" ]] || die "--one-shot-grace-ms requires a value"
        shift 2
        ;;
      --dry-run)
        DRY_RUN=1
        shift
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

  if [[ ! -f "${CRON_JOBS_FILE}" ]]; then
    die "cron jobs file not found: ${CRON_JOBS_FILE}"
  fi
  if [[ ! -r "${CRON_JOBS_FILE}" ]]; then
    die "cron jobs file is not readable: ${CRON_JOBS_FILE}"
  fi
  if [[ "${DRY_RUN}" -eq 0 && ! -w "${CRON_JOBS_FILE}" ]]; then
    die "cron jobs file is not writable: ${CRON_JOBS_FILE}"
  fi

  if [[ -n "${AS_OF_MS}" ]]; then
    is_non_negative_int "${AS_OF_MS}" || die "--as-of-ms must be a non-negative integer"
  fi
  is_non_negative_int "${ONE_SHOT_GRACE_MS}" || die "--one-shot-grace-ms must be a non-negative integer"
}

reconcile() {
  "${PYTHON_BIN}" - "${CRON_JOBS_FILE}" "${AS_OF_MS}" "${ONE_SHOT_GRACE_MS}" "${DRY_RUN}" <<'PY'
import json
import sys
from pathlib import Path

cron_jobs_path = Path(sys.argv[1])
as_of_ms = int(sys.argv[2])
one_shot_grace_ms = int(sys.argv[3])
dry_run = sys.argv[4] == "1"

raw = cron_jobs_path.read_text(encoding="utf-8").strip()
if raw:
    parsed = json.loads(raw)
    if not isinstance(parsed, list):
        raise ValueError("cron-jobs.json must contain a JSON array")
    jobs = parsed
else:
    jobs = []

updated_one_shot = 0
updated_recurring = 0
skipped_invalid = 0

for job in jobs:
    if not isinstance(job, dict):
        skipped_invalid += 1
        continue

    fire_at = job.get("fire_at")
    if not isinstance(fire_at, (int, float)):
        skipped_invalid += 1
        continue

    fire_at = int(fire_at)
    if fire_at > as_of_ms:
        continue

    job_type = job.get("type")
    if job_type == "one-shot":
        target_fire_at = as_of_ms + one_shot_grace_ms
        if fire_at != target_fire_at:
            job["fire_at"] = target_fire_at
            updated_one_shot += 1
        continue

    if job_type == "recurring":
        interval_ms = job.get("interval_ms")
        if not isinstance(interval_ms, (int, float)):
            skipped_invalid += 1
            continue
        interval_ms = int(interval_ms)
        if interval_ms <= 0:
            skipped_invalid += 1
            continue

        target_fire_at = as_of_ms + interval_ms
        if fire_at != target_fire_at:
            job["fire_at"] = target_fire_at
            updated_recurring += 1
        continue

updated_total = updated_one_shot + updated_recurring

if updated_total > 0 and not dry_run:
    cron_jobs_path.write_text(json.dumps(jobs, indent=2) + "\n", encoding="utf-8")

print(f"policy=defer-overdue")
print(f"policy_note=one-shot_overdue->as_of+grace; recurring_overdue->as_of+interval (skip missed windows)")
print(f"cron_jobs_file={cron_jobs_path}")
print(f"as_of_ms={as_of_ms}")
print(f"one_shot_grace_ms={one_shot_grace_ms}")
print(f"dry_run={'true' if dry_run else 'false'}")
print(f"jobs_total={len(jobs)}")
print(f"updated_total={updated_total}")
print(f"updated_one_shot={updated_one_shot}")
print(f"updated_recurring={updated_recurring}")
print(f"unchanged={len(jobs) - updated_total}")
print(f"skipped_invalid={skipped_invalid}")
PY
}

main() {
  parse_args "$@"
  require_preflight

  if [[ -z "${AS_OF_MS}" ]]; then
    AS_OF_MS="$(now_ms)"
  fi

  log "reconciling cron jobs (${CRON_JOBS_FILE})"
  reconcile
}

main "$@"
