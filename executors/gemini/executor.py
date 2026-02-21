"""Gemini CLI Executor — polls the agnt API for pending jobs and runs them via `gemini`."""

from __future__ import annotations

import json
import logging
import mimetypes
import os
import shutil
import signal
import subprocess
import sys
import time
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

API_URL = os.getenv("AGNT_API_URL", "http://localhost:8000")
API_KEY = os.getenv("AGNT_EXECUTOR_API_KEY", "executor-dev-key")
AGENT_ID = os.getenv("AGNT_AGENT_ID", "55555555-5555-5555-5555-555555555555")


def _parse_int_env(name: str, default: str) -> int:
    raw = os.getenv(name, default)
    try:
        return int(raw)
    except ValueError:
        print(f"Error: {name}={raw!r} is not a valid integer", file=sys.stderr)
        sys.exit(1)


POLL_INTERVAL = _parse_int_env("POLL_INTERVAL_SECONDS", "5")
JOB_TIMEOUT = _parse_int_env("JOB_TIMEOUT_SECONDS", "300")

WORK_ROOT = Path(__file__).resolve().parent / "work"
MAX_UPLOAD_FILES = 20
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB per file

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("gemini-executor")

# ---------------------------------------------------------------------------
# Graceful shutdown
# ---------------------------------------------------------------------------

_shutdown = False


def _handle_signal(signum: int, _frame: object) -> None:
    global _shutdown  # noqa: PLW0603
    log.info("Received signal %s — shutting down after current job", signum)
    _shutdown = True


signal.signal(signal.SIGINT, _handle_signal)
signal.signal(signal.SIGTERM, _handle_signal)

# ---------------------------------------------------------------------------
# API helpers
# ---------------------------------------------------------------------------


def _headers() -> dict[str, str]:
    return {"X-API-Key": API_KEY}


def _poll_jobs() -> list[dict]:
    url = f"{API_URL}/v1/executor/jobs"
    resp = requests.get(
        url,
        params={"agent_id": AGENT_ID, "status": "pending"},
        headers=_headers(),
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json().get("jobs", [])


def _update_status(
    job_id: str,
    status: str,
    *,
    progress: int | None = None,
    reason: str | None = None,
) -> requests.Response:
    url = f"{API_URL}/v1/executor/jobs/{job_id}/status"
    body: dict = {"status": status}
    if progress is not None:
        body["progress"] = progress
    if reason is not None:
        body["reason"] = reason
    resp = requests.post(url, json=body, headers=_headers(), timeout=10)
    resp.raise_for_status()
    return resp


def _upload_files(job_id: str, file_paths: list[Path], work_dir: Path) -> None:
    url = f"{API_URL}/v1/executor/jobs/{job_id}/complete"
    if len(file_paths) > MAX_UPLOAD_FILES:
        log.warning(
            "Job %s produced %d files — uploading first %d only",
            job_id,
            len(file_paths),
            MAX_UPLOAD_FILES,
        )
    files_payload = []
    for p in file_paths[:MAX_UPLOAD_FILES]:
        size = p.stat().st_size
        if size > MAX_FILE_SIZE:
            log.warning("Skipping %s — %d bytes exceeds %d limit", p.name, size, MAX_FILE_SIZE)
            continue
        mime = mimetypes.guess_type(str(p))[0] or "application/octet-stream"
        name = str(p.relative_to(work_dir))
        files_payload.append(("files", (name, p.read_bytes(), mime)))
    if not files_payload:
        raise RuntimeError("All output files exceeded size limit")
    resp = requests.post(url, files=files_payload, headers=_headers(), timeout=60)
    resp.raise_for_status()


# ---------------------------------------------------------------------------
# Job processing
# ---------------------------------------------------------------------------


def _build_prompt(job: dict) -> str:
    prompt = job.get("prompt", "")
    params = job.get("params")
    if params and isinstance(params, dict):
        parts = []
        for k, v in params.items():
            parts.append(f"{k}={v if isinstance(v, str) else json.dumps(v)}")
        prompt = f"{prompt}\n{' '.join(parts)}"
    return prompt


def _collect_files(work_dir: Path) -> list[Path]:
    resolved_root = work_dir.resolve()
    files: list[Path] = []
    for root, dirs, filenames in os.walk(work_dir):
        dirs[:] = [d for d in dirs if not d.startswith(".")]
        for name in filenames:
            if name.startswith("."):
                continue
            p = Path(root) / name
            if p.is_symlink():
                log.warning("Skipping symlink: %s", p)
                continue
            if not p.resolve().is_relative_to(resolved_root):
                log.warning("Skipping file outside work dir: %s", p)
                continue
            files.append(p)
    return files


def _process_job(job: dict) -> None:
    job_id = job["job_id"]
    log.info("Processing job %s", job_id)

    # Accept — bail if another executor already grabbed this job -------
    try:
        _update_status(job_id, "accepted")
    except requests.HTTPError as exc:
        if exc.response is not None and exc.response.status_code == 409:
            log.info("Job %s already claimed by another executor", job_id)
            return
        raise

    work_dir = WORK_ROOT / job_id
    work_dir.mkdir(parents=True, exist_ok=True)

    try:
        # Running ------------------------------------------------------
        _update_status(job_id, "running", progress=10)

        prompt = _build_prompt(job)
        log.info("Running gemini for job %s", job_id)

        proc = subprocess.Popen(
            ["gemini", "-p", prompt, "--yolo"],
            cwd=work_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )

        try:
            stdout, stderr = proc.communicate(timeout=JOB_TIMEOUT)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.communicate()
            _update_status(job_id, "failed", reason="Job timed out")
            return

        if proc.returncode != 0:
            reason = stderr.strip() or f"gemini exited with code {proc.returncode}"
            _update_status(job_id, "failed", reason=reason[:500])
            return

        # Collect output -----------------------------------------------
        files = _collect_files(work_dir)

        if not files and stdout.strip():
            response_file = work_dir / "response.txt"
            response_file.write_text(stdout)
            files = [response_file]

        if not files:
            _update_status(job_id, "failed", reason="No output produced")
            return

        # Upload -------------------------------------------------------
        _upload_files(job_id, files, work_dir)
        log.info("Job %s completed — uploaded %d file(s)", job_id, len(files))

    except requests.RequestException as exc:
        log.error("API error for job %s: %s", job_id, exc)
        try:
            _update_status(job_id, "failed", reason=str(exc)[:500])
        except Exception:
            pass
    except Exception as exc:
        log.error("Unexpected error for job %s: %s", job_id, exc)
        try:
            _update_status(job_id, "failed", reason=str(exc)[:500])
        except Exception:
            pass
    finally:
        if work_dir.exists():
            shutil.rmtree(work_dir, ignore_errors=True)


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------


def main() -> None:
    log.info("Gemini executor started — agent_id=%s", AGENT_ID)
    log.info("Polling %s every %ds", API_URL, POLL_INTERVAL)

    while not _shutdown:
        try:
            jobs = _poll_jobs()
            if not jobs:
                log.debug("No pending jobs")
            for job in jobs:
                if _shutdown:
                    break
                _process_job(job)
        except requests.RequestException as exc:
            log.warning("API unreachable: %s — retrying in %ds", exc, POLL_INTERVAL)
        except Exception:
            log.exception("Unexpected error in poll loop")

        time.sleep(POLL_INTERVAL)

    log.info("Executor stopped")


if __name__ == "__main__":
    main()
