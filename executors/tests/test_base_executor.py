from __future__ import annotations

import os
import subprocess
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

import requests

EXECUTORS_ROOT = Path(__file__).resolve().parents[1]
if str(EXECUTORS_ROOT) not in sys.path:
    sys.path.insert(0, str(EXECUTORS_ROOT))

from base.executor import BaseExecutor, run_cli


class FakeApiClient:
    def __init__(self, *, conflict_on_accept: bool = False) -> None:
        self.conflict_on_accept = conflict_on_accept
        self.status_calls: list[dict[str, object]] = []
        self.upload_calls: list[dict[str, object]] = []

    def poll_jobs(self, _agent_id: str, status: str = "pending") -> list[dict]:
        return []

    def update_status(
        self,
        job_id: str,
        status: str,
        *,
        progress: int | None = None,
        reason: str | None = None,
    ) -> None:
        if status == "accepted" and self.conflict_on_accept:
            response = requests.Response()
            response.status_code = 409
            raise requests.HTTPError("already claimed", response=response)
        self.status_calls.append(
            {
                "job_id": job_id,
                "status": status,
                "progress": progress,
                "reason": reason,
            }
        )

    def upload_files(self, job_id: str, file_paths: list[Path], work_dir: Path) -> None:
        self.upload_calls.append(
            {
                "job_id": job_id,
                "files": [str(path.relative_to(work_dir)) for path in file_paths],
            }
        )


class FakeExecutor(BaseExecutor):
    name = "fake"

    def __init__(self, api_client: FakeApiClient, mode: str = "success") -> None:
        self._injected_api_client = api_client
        self.mode = mode
        super().__init__()
        self.api_client = self._injected_api_client

    def execute(self, _job: dict, work_dir: Path) -> None:
        if self.mode == "timeout":
            raise TimeoutError("Job timed out")
        if self.mode == "error":
            raise RuntimeError("boom")
        if self.mode == "no_output":
            return
        (work_dir / "result.txt").write_text("ok", encoding="utf-8")


class BaseExecutorTests(unittest.TestCase):
    def _build_executor(self, api_client: FakeApiClient, mode: str = "success") -> FakeExecutor:
        env = {
            "AGNT_API_URL": "http://api.local",
            "AGNT_EXECUTOR_API_KEY": "executor-key",
            "AGNT_AGENT_ID": "agent-1",
            "POLL_INTERVAL_SECONDS": "1",
            "JOB_TIMEOUT_SECONDS": "5",
        }
        with patch.dict(os.environ, env, clear=False):
            return FakeExecutor(api_client, mode=mode)

    def test_process_job_success_path(self) -> None:
        api_client = FakeApiClient()
        executor = self._build_executor(api_client)

        executor._process_job({"job_id": "job-1", "prompt": "hello", "params": {"mode": "test"}})

        statuses = [call["status"] for call in api_client.status_calls]
        self.assertEqual(statuses, ["accepted", "running"])
        self.assertEqual(len(api_client.upload_calls), 1)
        self.assertEqual(api_client.upload_calls[0]["job_id"], "job-1")
        self.assertEqual(api_client.upload_calls[0]["files"], ["result.txt"])
        self.assertFalse((executor.work_root / "job-1").exists())

    def test_process_job_marks_failed_when_no_output(self) -> None:
        api_client = FakeApiClient()
        executor = self._build_executor(api_client, mode="no_output")

        executor._process_job({"job_id": "job-2", "prompt": "", "params": {}})

        final_call = api_client.status_calls[-1]
        self.assertEqual(final_call["status"], "failed")
        self.assertEqual(final_call["reason"], "No output produced")
        self.assertEqual(api_client.upload_calls, [])

    def test_process_job_marks_failed_on_timeout(self) -> None:
        api_client = FakeApiClient()
        executor = self._build_executor(api_client, mode="timeout")

        executor._process_job({"job_id": "job-3", "prompt": "", "params": {}})

        final_call = api_client.status_calls[-1]
        self.assertEqual(final_call["status"], "failed")
        self.assertEqual(final_call["reason"], "Job timed out")

    def test_process_job_skips_claim_conflict(self) -> None:
        api_client = FakeApiClient(conflict_on_accept=True)
        executor = self._build_executor(api_client)

        executor._process_job({"job_id": "job-4", "prompt": "", "params": {}})

        self.assertEqual(api_client.status_calls, [])
        self.assertEqual(api_client.upload_calls, [])
        self.assertFalse((executor.work_root / "job-4").exists())

    def test_build_prompt_formats_params(self) -> None:
        api_client = FakeApiClient()
        executor = self._build_executor(api_client)

        prompt = executor.build_prompt({"prompt": "Base", "params": {"a": "b", "n": 1}})

        self.assertEqual(prompt, "Base\na=b n=1")


class RunCliTests(unittest.TestCase):
    def test_run_cli_success(self) -> None:
        with patch.dict(os.environ, {}, clear=False):
            result = run_cli(
                [sys.executable, "-c", "print('hello')"],
                cwd=Path.cwd(),
                timeout=5,
            )
        self.assertEqual(result.stdout.strip(), "hello")

    def test_run_cli_raises_on_non_zero(self) -> None:
        with self.assertRaises(subprocess.CalledProcessError):
            run_cli(
                [sys.executable, "-c", "import sys; sys.stderr.write('boom'); sys.exit(2)"],
                cwd=Path.cwd(),
                timeout=5,
            )

    def test_run_cli_raises_timeout(self) -> None:
        with self.assertRaises(TimeoutError):
            run_cli(
                [sys.executable, "-c", "import time; time.sleep(2)"],
                cwd=Path.cwd(),
                timeout=1,
            )


if __name__ == "__main__":
    unittest.main()
