from __future__ import annotations

import os
import subprocess
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

EXECUTORS_ROOT = Path(__file__).resolve().parents[1]
if str(EXECUTORS_ROOT) not in sys.path:
    sys.path.insert(0, str(EXECUTORS_ROOT))

from claude.executor import ClaudeExecutor, _SYSTEM_PROMPT_FILE


def _build_executor(**env_overrides: str) -> ClaudeExecutor:
    env = {
        "AGNT_API_URL": "http://api.local",
        "AGNT_EXECUTOR_API_KEY": "executor-key",
        "AGNT_AGENT_ID": "agent-1",
        "POLL_INTERVAL_SECONDS": "1",
        "JOB_TIMEOUT_SECONDS": "10",
    }
    env.update(env_overrides)
    with patch.dict(os.environ, env, clear=False):
        executor = ClaudeExecutor()
    executor.api_client = MagicMock()
    return executor


class ClaudeExecutorInitTests(unittest.TestCase):
    def test_defaults(self) -> None:
        executor = _build_executor()
        self.assertEqual(executor.name, "claude")
        self.assertEqual(executor.claude_bin, "claude")
        self.assertEqual(executor.max_turns, 25)

    def test_custom_bin_and_max_turns(self) -> None:
        executor = _build_executor(CLAUDE_BIN="/usr/local/bin/claude", CLAUDE_MAX_TURNS="10")
        self.assertEqual(executor.claude_bin, "/usr/local/bin/claude")
        self.assertEqual(executor.max_turns, 10)

    def test_system_prompt_loaded(self) -> None:
        executor = _build_executor()
        expected = _SYSTEM_PROMPT_FILE.read_text(encoding="utf-8")
        self.assertEqual(executor._system_prompt_text, expected)


class SetupWorkDirTests(unittest.TestCase):
    def test_setup_work_dir_is_noop(self) -> None:
        """System prompt is injected via CLI flag, not file copy."""
        executor = _build_executor()
        work_dir = executor.work_root / "noop-test"
        work_dir.mkdir(parents=True, exist_ok=True)
        try:
            executor.setup_work_dir({"job_id": "j1", "prompt": "hi"}, work_dir)
            contents = list(work_dir.iterdir())
            self.assertEqual(contents, [])
        finally:
            work_dir.rmdir()


class ExecuteTests(unittest.TestCase):
    @patch("claude.executor.run_cli")
    def test_command_includes_expected_flags(self, mock_run_cli: MagicMock) -> None:
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
            work_dir.rmdir()

        cmd = mock_run_cli.call_args[0][0]
        self.assertEqual(cmd[0], "claude")
        self.assertIn("--dangerously-skip-permissions", cmd)
        self.assertIn("--append-system-prompt", cmd)
        self.assertIn("--max-turns", cmd)
        self.assertIn("-p", cmd)

        # Verify flag ordering/values
        sp_idx = cmd.index("--append-system-prompt")
        self.assertEqual(cmd[sp_idx + 1], executor._system_prompt_text)
        mt_idx = cmd.index("--max-turns")
        self.assertEqual(cmd[mt_idx + 1], "25")
        p_idx = cmd.index("-p")
        self.assertEqual(cmd[p_idx + 1], "build a widget")

    @patch("claude.executor.run_cli")
    def test_custom_max_turns_in_command(self, mock_run_cli: MagicMock) -> None:
        mock_run_cli.return_value = subprocess.CompletedProcess(
            args=[], returncode=0, stdout="", stderr=""
        )
        executor = _build_executor(CLAUDE_MAX_TURNS="5")
        work_dir = executor.work_root / "turns-test"
        work_dir.mkdir(parents=True, exist_ok=True)

        try:
            executor.execute(
                {"job_id": "j1", "prompt": "hello", "params": {}},
                work_dir,
            )
        finally:
            work_dir.rmdir()

        cmd = mock_run_cli.call_args[0][0]
        mt_idx = cmd.index("--max-turns")
        self.assertEqual(cmd[mt_idx + 1], "5")

    @patch("claude.executor.run_cli")
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
            work_dir.rmdir()

        self.assertEqual(executor._last_stdout, "Here is the result")

    @patch("claude.executor.run_cli")
    def test_error_extracts_stderr(self, mock_run_cli: MagicMock) -> None:
        mock_run_cli.side_effect = subprocess.CalledProcessError(
            1, ["claude"], output="", stderr="authentication failed"
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
            work_dir.rmdir()

    @patch("claude.executor.run_cli")
    def test_error_fallback_message(self, mock_run_cli: MagicMock) -> None:
        mock_run_cli.side_effect = subprocess.CalledProcessError(
            2, ["claude"], output="", stderr=""
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
            self.assertEqual(str(ctx.exception), "claude exited with code 2")
        finally:
            work_dir.rmdir()

    @patch("claude.executor.run_cli")
    def test_error_truncates_long_reason(self, mock_run_cli: MagicMock) -> None:
        long_msg = "x" * 600
        mock_run_cli.side_effect = subprocess.CalledProcessError(
            1, ["claude"], output="", stderr=long_msg
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
            work_dir.rmdir()


class CollectFilesTests(unittest.TestCase):
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
            import shutil

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
            import shutil

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
            import shutil

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
            work_dir.rmdir()


if __name__ == "__main__":
    unittest.main()
