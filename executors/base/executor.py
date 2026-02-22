"""Shared base class for polling executors."""

from __future__ import annotations

import inspect
import json
import logging
import os
import shutil
import signal
import subprocess
import sys
import time
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Sequence

import requests
from dotenv import load_dotenv

from .api_client import ApiClient
from .files import collect_files

DEFAULT_AGENT_ID = "55555555-5555-5555-5555-555555555555"


def _parse_int_env(name: str, default: str) -> int:
    raw = os.getenv(name, default)
    try:
        return int(raw)
    except ValueError:
        print(f"Error: {name}={raw!r} is not a valid integer", file=sys.stderr)
        raise SystemExit(1) from None


def run_cli(
    cmd: Sequence[str],
    cwd: Path,
    timeout: int,
    *,
    capture_stdout: bool = True,
) -> subprocess.CompletedProcess[str]:
    """Run a subprocess command and raise on non-zero exit or timeout."""
    try:
        process = subprocess.run(
            list(cmd),
            cwd=cwd,
            stdout=subprocess.PIPE if capture_stdout else None,
            stderr=subprocess.PIPE,
            text=True,
            timeout=timeout,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise TimeoutError("Job timed out") from exc

    if process.returncode != 0:
        raise subprocess.CalledProcessError(
            process.returncode,
            list(cmd),
            output=process.stdout,
            stderr=process.stderr,
        )
    return process


class BaseExecutor(ABC):
    """Base class that manages polling, lifecycle status updates, and uploads."""

    name: str

    def __init__(self) -> None:
        load_dotenv()
        if not getattr(self, "name", None):
            raise ValueError("Executor subclass must set a non-empty `name`")

        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s [%(levelname)s] %(message)s",
            datefmt="%H:%M:%S",
        )

        self.log = logging.getLogger(f"{self.name}-executor")
        self.api_url = os.getenv("AGNT_API_URL", "http://localhost:8000")
        self.api_key = os.getenv("AGNT_EXECUTOR_API_KEY", "executor-dev-key")
        self.agent_id = os.getenv("AGNT_AGENT_ID", DEFAULT_AGENT_ID)
        self.poll_interval = _parse_int_env("POLL_INTERVAL_SECONDS", "5")
        self.job_timeout = _parse_int_env("JOB_TIMEOUT_SECONDS", "300")
        self.system_prompt_path: Path | None = None

        executor_dir = Path(inspect.getfile(self.__class__)).resolve().parent
        self.work_root = executor_dir / "work"
        self.api_client = ApiClient(self.api_url, self.api_key)
        self._shutdown = False

        signal.signal(signal.SIGINT, self._handle_signal)
        signal.signal(signal.SIGTERM, self._handle_signal)

    @abstractmethod
    def execute(self, job: dict, work_dir: Path) -> None:
        """Run the executor-specific command and write outputs under work_dir."""

    def build_prompt(self, job: dict) -> str:
        prompt = job.get("prompt", "")
        params = job.get("params")
        if isinstance(params, dict) and params:
            parts: list[str] = []
            for key, value in params.items():
                rendered = value if isinstance(value, str) else json.dumps(value)
                parts.append(f"{key}={rendered}")
            prompt = f"{prompt}\n{' '.join(parts)}"
        return prompt

    def collect_files(self, work_dir: Path) -> list[Path]:
        excluded = {self.system_prompt_path.name} if self.system_prompt_path else set()
        return collect_files(work_dir, exclude_names=excluded)

    def setup_work_dir(self, _job: dict, work_dir: Path) -> None:
        if self.system_prompt_path is None:
            return
        target = work_dir / self.system_prompt_path.name
        target.write_text(self.system_prompt_path.read_text(encoding="utf-8"), encoding="utf-8")

    def report_progress(self, job_id: str, progress: int) -> None:
        self.api_client.update_status(job_id, "running", progress=progress)

    def run(self) -> None:
        self.log.info("%s executor started - agent_id=%s", self.name.capitalize(), self.agent_id)
        self.log.info("Polling %s every %ds", self.api_url, self.poll_interval)

        while not self._shutdown:
            try:
                jobs = self.api_client.poll_jobs(self.agent_id, status="pending")
                if not jobs:
                    self.log.debug("No pending jobs")
                for job in jobs:
                    if self._shutdown:
                        break
                    self._process_job(job)
            except requests.RequestException as exc:
                self.log.warning(
                    "API unreachable: %s - retrying in %ds",
                    exc,
                    self.poll_interval,
                )
            except Exception:
                self.log.exception("Unexpected error in poll loop")

            time.sleep(self.poll_interval)

        self.log.info("Executor stopped")

    def _handle_signal(self, signum: int, _frame: object) -> None:
        self.log.info("Received signal %s - shutting down after current job", signum)
        self._shutdown = True

    def _mark_failed(self, job_id: str, reason: str) -> None:
        try:
            self.api_client.update_status(job_id, "failed", reason=reason[:500])
        except Exception:
            self.log.exception("Unable to mark job %s as failed", job_id)

    def _process_job(self, job: dict) -> None:
        job_id = str(job["job_id"])
        self.log.info("Processing job %s", job_id)

        try:
            self.api_client.update_status(job_id, "accepted")
        except requests.HTTPError as exc:
            if exc.response is not None and exc.response.status_code == 409:
                self.log.info("Job %s already claimed by another executor", job_id)
                return
            raise

        work_dir = self.work_root / job_id
        work_dir.mkdir(parents=True, exist_ok=True)

        try:
            self.api_client.update_status(job_id, "running", progress=10)
            self.setup_work_dir(job, work_dir)
            self.execute(job, work_dir)
            files = self.collect_files(work_dir)

            if not files:
                self._mark_failed(job_id, "No output produced")
                return

            self.api_client.upload_files(job_id, files, work_dir)
            self.log.info("Job %s completed - uploaded %d file(s)", job_id, len(files))
        except TimeoutError:
            self._mark_failed(job_id, "Job timed out")
        except subprocess.CalledProcessError as exc:
            reason = (exc.stderr or "").strip() or f"Command exited with code {exc.returncode}"
            self._mark_failed(job_id, reason)
        except requests.RequestException as exc:
            self.log.error("API error for job %s: %s", job_id, exc)
            self._mark_failed(job_id, str(exc))
        except Exception as exc:
            self.log.error("Unexpected error for job %s: %s", job_id, exc)
            self._mark_failed(job_id, str(exc))
        finally:
            if work_dir.exists():
                shutil.rmtree(work_dir, ignore_errors=True)
