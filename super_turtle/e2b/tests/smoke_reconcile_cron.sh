#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
REMOTE_SCRIPT="${ROOT_DIR}/super_turtle/e2b/remote.sh"

TMP_DIR="$(mktemp -d)"
CRON_FILE="${TMP_DIR}/cron-jobs.json"
BASELINE_FILE="${TMP_DIR}/cron-jobs.baseline.json"

cleanup() {
  trap - EXIT
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

AS_OF_MS=1700000000000
ONE_SHOT_GRACE_MS=15000

cat > "${CRON_FILE}" <<'JSON'
[
  {
    "id": "oneshot-overdue",
    "prompt": "one-shot overdue",
    "type": "one-shot",
    "interval_ms": null,
    "fire_at": 1699999990000,
    "created_at": "2026-02-27T00:00:00Z"
  },
  {
    "id": "oneshot-future",
    "prompt": "one-shot future",
    "type": "one-shot",
    "interval_ms": null,
    "fire_at": 1700000010000,
    "created_at": "2026-02-27T00:00:00Z"
  },
  {
    "id": "recurring-overdue",
    "prompt": "recurring overdue",
    "type": "recurring",
    "interval_ms": 60000,
    "fire_at": 1699999000000,
    "created_at": "2026-02-27T00:00:00Z"
  },
  {
    "id": "recurring-future",
    "prompt": "recurring future",
    "type": "recurring",
    "interval_ms": 30000,
    "fire_at": 1700000005000,
    "created_at": "2026-02-27T00:00:00Z"
  },
  {
    "id": "recurring-overdue-invalid",
    "prompt": "recurring overdue invalid",
    "type": "recurring",
    "interval_ms": null,
    "fire_at": 1699999000000,
    "created_at": "2026-02-27T00:00:00Z"
  }
]
JSON

cp "${CRON_FILE}" "${BASELINE_FILE}"

echo "[smoke:e2b-reconcile-cron] dry-run"
dry_run_output="$(bash "${REMOTE_SCRIPT}" reconcile-cron \
  --cron-jobs-file "${CRON_FILE}" \
  --as-of-ms "${AS_OF_MS}" \
  --one-shot-grace-ms "${ONE_SHOT_GRACE_MS}" \
  --dry-run)"

[[ "${dry_run_output}" == *"dry_run=true"* ]] || { echo "dry-run output missing dry_run=true" >&2; exit 1; }
[[ "${dry_run_output}" == *"updated_total=2"* ]] || { echo "expected updated_total=2 in dry-run output" >&2; exit 1; }

cmp -s "${CRON_FILE}" "${BASELINE_FILE}" || {
  echo "dry-run mutated cron jobs file" >&2
  exit 1
}

echo "[smoke:e2b-reconcile-cron] apply"
apply_output="$(bash "${REMOTE_SCRIPT}" reconcile-cron \
  --cron-jobs-file "${CRON_FILE}" \
  --as-of-ms "${AS_OF_MS}" \
  --one-shot-grace-ms "${ONE_SHOT_GRACE_MS}")"

[[ "${apply_output}" == *"dry_run=false"* ]] || { echo "apply output missing dry_run=false" >&2; exit 1; }
[[ "${apply_output}" == *"updated_total=2"* ]] || { echo "expected updated_total=2 in apply output" >&2; exit 1; }

python3 - "${CRON_FILE}" "${AS_OF_MS}" "${ONE_SHOT_GRACE_MS}" <<'PY'
import json
import sys
from pathlib import Path

cron_file = Path(sys.argv[1])
as_of_ms = int(sys.argv[2])
one_shot_grace_ms = int(sys.argv[3])

jobs = json.loads(cron_file.read_text(encoding="utf-8"))
index = {job["id"]: job for job in jobs}

assert index["oneshot-overdue"]["fire_at"] == as_of_ms + one_shot_grace_ms
assert index["oneshot-future"]["fire_at"] == 1700000010000
assert index["recurring-overdue"]["fire_at"] == as_of_ms + 60000
assert index["recurring-future"]["fire_at"] == 1700000005000
assert index["recurring-overdue-invalid"]["fire_at"] == 1699999000000
PY

echo "[smoke:e2b-reconcile-cron] pass"
