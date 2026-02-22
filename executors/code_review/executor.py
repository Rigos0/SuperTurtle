"""Code review executor — analyses inline code and produces a review report."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

EXECUTORS_ROOT = Path(__file__).resolve().parents[1]
if str(EXECUTORS_ROOT) not in sys.path:
    sys.path.insert(0, str(EXECUTORS_ROOT))

from base import BaseExecutor, run_cli

LANGUAGE_EXTENSIONS: dict[str, str] = {
    "python": ".py",
    "javascript": ".js",
    "typescript": ".ts",
    "go": ".go",
    "rust": ".rs",
}


class CodeReviewExecutor(BaseExecutor):
    """Executor that reviews inline code using Claude Code CLI."""

    name = "code-review"

    def __init__(self) -> None:
        super().__init__()
        self.claude_bin = os.getenv("CLAUDE_BIN", "claude")
        self._last_stdout = ""

    def setup_work_dir(self, _job: dict, _work_dir: Path) -> None:
        """No-op — no system prompt file to copy."""

    def execute(self, job: dict, work_dir: Path) -> None:
        job_id = str(job["job_id"])
        params = job.get("params") or {}
        code = params.get("code", "")
        language = params.get("language", "")

        if not code.strip():
            raise ValueError("Missing or empty 'code' parameter")

        ext = LANGUAGE_EXTENSIONS.get(language, ".txt")
        code_file = work_dir / f"input{ext}"
        code_file.write_text(code, encoding="utf-8")

        review_prompt = (
            f"Review the code in {code_file.name}. "
            "Provide a structured review covering: correctness, security, "
            "performance, readability, and suggestions. "
            "Write the review to review.md."
        )

        if job.get("prompt"):
            review_prompt += f"\n\nAdditional focus: {job['prompt']}"

        self.log.info("Running code review for job %s", job_id)

        try:
            result = run_cli(
                [self.claude_bin, "--dangerously-skip-permissions", "-p", review_prompt],
                cwd=work_dir,
                timeout=self.job_timeout,
            )
        except subprocess.CalledProcessError as exc:
            reason = (exc.stderr or "").strip()
            if not reason:
                reason = f"claude exited with code {exc.returncode}"
            raise RuntimeError(reason[:500]) from exc

        self._last_stdout = result.stdout or ""

    def collect_files(self, work_dir: Path) -> list[Path]:
        """Return only review output files — exclude input code files."""
        files = super().collect_files(work_dir)
        files = [f for f in files if f.stem != "input"]
        if files:
            return files
        if self._last_stdout.strip():
            response_file = work_dir / "review.md"
            response_file.write_text(self._last_stdout, encoding="utf-8")
            return [response_file]
        return []


def main() -> None:
    executor = CodeReviewExecutor()
    executor.log.info("Using Claude binary: %s", executor.claude_bin)
    executor.run()


if __name__ == "__main__":
    main()
