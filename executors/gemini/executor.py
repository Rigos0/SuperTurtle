"""Gemini CLI executor built on top of the shared base scaffold."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

EXECUTORS_ROOT = Path(__file__).resolve().parents[1]
if str(EXECUTORS_ROOT) not in sys.path:
    sys.path.insert(0, str(EXECUTORS_ROOT))

from base import BaseExecutor, run_cli


class GeminiExecutor(BaseExecutor):
    """Executor that runs Gemini CLI in an isolated work directory."""

    name = "gemini"

    def __init__(self) -> None:
        super().__init__()
        self.gemini_bin = os.getenv("GEMINI_BIN", "gemini")
        self.system_prompt_path = Path(__file__).resolve().parent / "GEMINI.md"
        self._last_stdout = ""

    def execute(self, job: dict, work_dir: Path) -> None:
        job_id = str(job["job_id"])
        prompt = self.build_prompt(job)
        self.log.info("Running gemini for job %s", job_id)

        try:
            result = run_cli(
                [self.gemini_bin, "-p", prompt, "--yolo"],
                cwd=work_dir,
                timeout=self.job_timeout,
            )
        except subprocess.CalledProcessError as exc:
            reason = (exc.stderr or "").strip()
            if not reason:
                reason = f"gemini exited with code {exc.returncode}"
            raise RuntimeError(reason[:500]) from exc

        self._last_stdout = result.stdout or ""

    def collect_files(self, work_dir: Path) -> list[Path]:
        files = super().collect_files(work_dir)
        if files:
            return files
        if self._last_stdout.strip():
            response_file = work_dir / "response.txt"
            response_file.write_text(self._last_stdout, encoding="utf-8")
            return [response_file]
        return files


def main() -> None:
    executor = GeminiExecutor()
    executor.log.info("Using Gemini binary: %s", executor.gemini_bin)
    executor.run()


if __name__ == "__main__":
    main()
