"""Claude Code CLI executor built on top of the shared base scaffold."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

EXECUTORS_ROOT = Path(__file__).resolve().parents[1]
if str(EXECUTORS_ROOT) not in sys.path:
    sys.path.insert(0, str(EXECUTORS_ROOT))

from base import BaseExecutor, run_cli

_SYSTEM_PROMPT_FILE = Path(__file__).resolve().parent / "CLAUDE_EXECUTOR.md"
_DEFAULT_MAX_TURNS = "25"


class ClaudeExecutor(BaseExecutor):
    """Executor that runs Claude Code CLI in an isolated work directory."""

    name = "claude"

    def __init__(self) -> None:
        super().__init__()
        self.claude_bin = os.getenv("CLAUDE_BIN", "claude")
        self.max_turns = int(os.getenv("CLAUDE_MAX_TURNS", _DEFAULT_MAX_TURNS))
        self._system_prompt_text = _SYSTEM_PROMPT_FILE.read_text(encoding="utf-8")
        self._last_stdout = ""

    def setup_work_dir(self, _job: dict, _work_dir: Path) -> None:
        """No-op — system prompt is injected via --append-system-prompt."""

    def execute(self, job: dict, work_dir: Path) -> None:
        job_id = str(job["job_id"])
        prompt = self.build_prompt(job)
        self.log.info("Running claude for job %s", job_id)

        cmd = [
            self.claude_bin,
            "--dangerously-skip-permissions",
            "--append-system-prompt",
            self._system_prompt_text,
            "--max-turns",
            str(self.max_turns),
            "-p",
            prompt,
        ]

        try:
            result = run_cli(cmd, cwd=work_dir, timeout=self.job_timeout)
        except subprocess.CalledProcessError as exc:
            reason = (exc.stderr or "").strip()
            if not reason:
                reason = f"claude exited with code {exc.returncode}"
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
    executor = ClaudeExecutor()
    executor.log.info("Using Claude binary: %s", executor.claude_bin)
    executor.run()


if __name__ == "__main__":
    main()
