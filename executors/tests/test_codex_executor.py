from __future__ import annotations

import os
import shutil
import subprocess
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

EXECUTORS_ROOT = Path(__file__).resolve().parents[1]
if str(EXECUTORS_ROOT) not in sys.path:
    sys.path.insert(0, str(EXECUTORS_ROOT))

from codex.executor import CodexExecutor


def _build_executor(**env_overrides: str) -> CodexExecutor:
    env = {
        "AGNT_API_URL": "http://api.local",
        "AGNT_EXECUTOR_API_KEY": "executor-key",
        "AGNT_AGENT_ID": "agent-1",
        "POLL_INTERVAL_SECONDS": "1",
        "JOB_TIMEOUT_SECONDS": "10",
    }
    env.update(env_overrides)
    with patch.dict(os.environ, env, clear=False):
        executor = CodexExecutor()
    executor.api_client = MagicMock()
    return executor


class CodexExecutorInitTests(unittest.TestCase):
    def test_defaults(self) -> None:
        executor = _build_executor()
        self.assertEqual(executor.name, "codex")
        self.assertEqual(executor.codex_bin, "codex")
        self.assertEqual(executor.system_prompt_path.name, "CODEX.md")

    def test_custom_bin(self) -> None:
        executor = _build_executor(CODEX_BIN="/usr/local/bin/codex")
        self.assertEqual(executor.codex_bin, "/usr/local/bin/codex")


class SetupWorkDirTests(unittest.TestCase):
    def test_setup_work_dir_copies_system_prompt(self) -> None:
        executor = _build_executor()
        work_dir = executor.work_root / "setup-test"
        work_dir.mkdir(parents=True, exist_ok=True)

        try:
            executor.setup_work_dir({"job_id": "j1", "prompt": "hi"}, work_dir)
            copied = work_dir / "CODEX.md"
            self.assertTrue(copied.exists())
            self.assertEqual(
                copied.read_text(encoding="utf-8"),
                executor.system_prompt_path.read_text(encoding="utf-8"),
            )
        finally:
            shutil.rmtree(work_dir)


class ExecuteTests(unittest.TestCase):
    @patch("codex.executor.run_cli")
    def test_command_includes_exec_and_yolo(self, mock_run_cli: MagicMock) -> None:
        mock_run_cli.return_value = subprocess.CompletedProcess(
            args=[], returncode=0, stdout="done", stderr=""
        )
        executor = _build_executor()
        work_dir = executor.work_root / "cmd-test"
        work_dir.mkdir(parents=True, exist_ok=True)

        try:
            executor.execute(
                {"job_id": "j1", "prompt": "build a widget", "params": {}},
                work_dir,
            )
        finally:
            shutil.rmtree(work_dir)

        cmd = mock_run_cli.call_args[0][0]
        self.assertEqual(cmd[0], "codex")
        self.assertEqual(cmd[1], "exec")
        self.assertEqual(cmd[2], "--yolo")
        self.assertEqual(cmd[3], "build a widget")

    @patch("codex.executor.run_cli")
    def test_command_includes_params_in_prompt(self, mock_run_cli: MagicMock) -> None:
        mock_run_cli.return_value = subprocess.CompletedProcess(
            args=[], returncode=0, stdout="", stderr=""
        )
        executor = _build_executor()
        work_dir = executor.work_root / "params-test"
        work_dir.mkdir(parents=True, exist_ok=True)

        try:
            executor.execute(
                {
                    "job_id": "j1",
                    "prompt": "summarize",
                    "params": {"format": "json", "count": 2},
                },
                work_dir,
            )
        finally:
            shutil.rmtree(work_dir)

        cmd = mock_run_cli.call_args[0][0]
        self.assertEqual(cmd[3], "summarize\nformat=json count=2")

    @patch("codex.executor.run_cli")
    def test_captures_stdout(self, mock_run_cli: MagicMock) -> None:
        mock_run_cli.return_value = subprocess.CompletedProcess(
            args=[], returncode=0, stdout="Here is the result", stderr=""
        )
        executor = _build_executor()
        work_dir = executor.work_root / "stdout-test"
        work_dir.mkdir(parents=True, exist_ok=True)

        try:
            executor.execute(
                {"job_id": "j1", "prompt": "test", "params": {}},
                work_dir,
            )
        finally:
            shutil.rmtree(work_dir)

        self.assertEqual(executor._last_stdout, "Here is the result")

    @patch("codex.executor.run_cli")
    def test_error_extracts_stderr(self, mock_run_cli: MagicMock) -> None:
        mock_run_cli.side_effect = subprocess.CalledProcessError(
            1, ["codex"], output="", stderr="authentication failed"
        )
        executor = _build_executor()
        work_dir = executor.work_root / "err-test"
        work_dir.mkdir(parents=True, exist_ok=True)

        try:
            with self.assertRaises(RuntimeError) as ctx:
                executor.execute(
                    {"job_id": "j1", "prompt": "test", "params": {}},
                    work_dir,
                )
            self.assertEqual(str(ctx.exception), "authentication failed")
        finally:
            shutil.rmtree(work_dir)

    @patch("codex.executor.run_cli")
    def test_error_fallback_message(self, mock_run_cli: MagicMock) -> None:
        mock_run_cli.side_effect = subprocess.CalledProcessError(
            2, ["codex"], output="", stderr=""
        )
        executor = _build_executor()
        work_dir = executor.work_root / "fallback-test"
        work_dir.mkdir(parents=True, exist_ok=True)

        try:
            with self.assertRaises(RuntimeError) as ctx:
                executor.execute(
                    {"job_id": "j1", "prompt": "test", "params": {}},
                    work_dir,
                )
            self.assertEqual(str(ctx.exception), "codex exited with code 2")
        finally:
            shutil.rmtree(work_dir)

    @patch("codex.executor.run_cli")
    def test_error_truncates_long_reason(self, mock_run_cli: MagicMock) -> None:
        long_msg = "x" * 600
        mock_run_cli.side_effect = subprocess.CalledProcessError(
            1, ["codex"], output="", stderr=long_msg
        )
        executor = _build_executor()
        work_dir = executor.work_root / "trunc-test"
        work_dir.mkdir(parents=True, exist_ok=True)

        try:
            with self.assertRaises(RuntimeError) as ctx:
                executor.execute(
                    {"job_id": "j1", "prompt": "test", "params": {}},
                    work_dir,
                )
            self.assertEqual(len(str(ctx.exception)), 500)
        finally:
            shutil.rmtree(work_dir)


class CollectFilesTests(unittest.TestCase):
    def test_excludes_system_prompt_file(self) -> None:
        executor = _build_executor()
        work_dir = executor.work_root / "exclude-prompt"
        work_dir.mkdir(parents=True, exist_ok=True)

        try:
            (work_dir / "CODEX.md").write_text("prompt", encoding="utf-8")
            files = executor.collect_files(work_dir)
            self.assertEqual(files, [])
        finally:
            shutil.rmtree(work_dir)

    def test_returns_created_files(self) -> None:
        executor = _build_executor()
        work_dir = executor.work_root / "files-test"
        work_dir.mkdir(parents=True, exist_ok=True)

        try:
            (work_dir / "output.py").write_text("print('hi')", encoding="utf-8")
            files = executor.collect_files(work_dir)
            names = [f.name for f in files]
            self.assertIn("output.py", names)
        finally:
            shutil.rmtree(work_dir)

    def test_stdout_fallback_when_no_files(self) -> None:
        executor = _build_executor()
        executor._last_stdout = "Here is your answer"
        work_dir = executor.work_root / "fallback-files"
        work_dir.mkdir(parents=True, exist_ok=True)

        try:
            files = executor.collect_files(work_dir)
            self.assertEqual(len(files), 1)
            self.assertEqual(files[0].name, "response.txt")
            self.assertEqual(files[0].read_text(encoding="utf-8"), "Here is your answer")
        finally:
            shutil.rmtree(work_dir)

    def test_no_fallback_when_files_exist(self) -> None:
        executor = _build_executor()
        executor._last_stdout = "some stdout"
        work_dir = executor.work_root / "no-fallback"
        work_dir.mkdir(parents=True, exist_ok=True)

        try:
            (work_dir / "real.txt").write_text("content", encoding="utf-8")
            files = executor.collect_files(work_dir)
            names = [f.name for f in files]
            self.assertIn("real.txt", names)
            self.assertNotIn("response.txt", names)
        finally:
            shutil.rmtree(work_dir)

    def test_empty_stdout_no_fallback(self) -> None:
        executor = _build_executor()
        executor._last_stdout = "   "
        work_dir = executor.work_root / "empty-stdout"
        work_dir.mkdir(parents=True, exist_ok=True)

        try:
            files = executor.collect_files(work_dir)
            self.assertEqual(files, [])
        finally:
            shutil.rmtree(work_dir)


if __name__ == "__main__":
    unittest.main()
