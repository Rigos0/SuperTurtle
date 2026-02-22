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

from code_review.executor import CodeReviewExecutor, LANGUAGE_EXTENSIONS


def _build_executor(**env_overrides: str) -> CodeReviewExecutor:
    env = {
        "AGNT_API_URL": "http://api.local",
        "AGNT_EXECUTOR_API_KEY": "executor-key",
        "AGNT_AGENT_ID": "agent-1",
        "POLL_INTERVAL_SECONDS": "1",
        "JOB_TIMEOUT_SECONDS": "10",
    }
    env.update(env_overrides)
    with patch.dict(os.environ, env, clear=False):
        executor = CodeReviewExecutor()
    executor.api_client = MagicMock()
    return executor


class InitTests(unittest.TestCase):
    def test_defaults(self) -> None:
        executor = _build_executor()
        self.assertEqual(executor.name, "code-review")
        self.assertEqual(executor.claude_bin, "claude")
        self.assertIsNone(executor.system_prompt_path)

    def test_custom_bin(self) -> None:
        executor = _build_executor(CLAUDE_BIN="/opt/bin/claude")
        self.assertEqual(executor.claude_bin, "/opt/bin/claude")


class SetupWorkDirTests(unittest.TestCase):
    def test_setup_work_dir_is_noop(self) -> None:
        executor = _build_executor()
        work_dir = executor.work_root / "noop-test"
        work_dir.mkdir(parents=True, exist_ok=True)
        try:
            executor.setup_work_dir({"job_id": "j1", "prompt": ""}, work_dir)
            self.assertEqual(list(work_dir.iterdir()), [])
        finally:
            work_dir.rmdir()


class ExecuteTests(unittest.TestCase):
    @patch("code_review.executor.run_cli")
    def test_writes_input_file_with_python_extension(self, mock_run_cli: MagicMock) -> None:
        mock_run_cli.return_value = subprocess.CompletedProcess(
            args=[], returncode=0, stdout="", stderr=""
        )
        executor = _build_executor()
        work_dir = executor.work_root / "py-ext-test"
        work_dir.mkdir(parents=True, exist_ok=True)

        try:
            executor.execute(
                {"job_id": "j1", "prompt": "", "params": {"code": "x = 1", "language": "python"}},
                work_dir,
            )
            input_file = work_dir / "input.py"
            self.assertTrue(input_file.exists())
            self.assertEqual(input_file.read_text(encoding="utf-8"), "x = 1")
        finally:
            shutil.rmtree(work_dir)

    @patch("code_review.executor.run_cli")
    def test_writes_input_file_with_js_extension(self, mock_run_cli: MagicMock) -> None:
        mock_run_cli.return_value = subprocess.CompletedProcess(
            args=[], returncode=0, stdout="", stderr=""
        )
        executor = _build_executor()
        work_dir = executor.work_root / "js-ext-test"
        work_dir.mkdir(parents=True, exist_ok=True)

        try:
            executor.execute(
                {"job_id": "j1", "prompt": "", "params": {"code": "let x=1;", "language": "javascript"}},
                work_dir,
            )
            self.assertTrue((work_dir / "input.js").exists())
        finally:
            shutil.rmtree(work_dir)

    @patch("code_review.executor.run_cli")
    def test_unknown_language_uses_txt_extension(self, mock_run_cli: MagicMock) -> None:
        mock_run_cli.return_value = subprocess.CompletedProcess(
            args=[], returncode=0, stdout="", stderr=""
        )
        executor = _build_executor()
        work_dir = executor.work_root / "txt-ext-test"
        work_dir.mkdir(parents=True, exist_ok=True)

        try:
            executor.execute(
                {"job_id": "j1", "prompt": "", "params": {"code": "hello", "language": "brainfuck"}},
                work_dir,
            )
            self.assertTrue((work_dir / "input.txt").exists())
        finally:
            shutil.rmtree(work_dir)

    @patch("code_review.executor.run_cli")
    def test_empty_language_uses_txt_extension(self, mock_run_cli: MagicMock) -> None:
        mock_run_cli.return_value = subprocess.CompletedProcess(
            args=[], returncode=0, stdout="", stderr=""
        )
        executor = _build_executor()
        work_dir = executor.work_root / "no-lang-test"
        work_dir.mkdir(parents=True, exist_ok=True)

        try:
            executor.execute(
                {"job_id": "j1", "prompt": "", "params": {"code": "stuff"}},
                work_dir,
            )
            self.assertTrue((work_dir / "input.txt").exists())
        finally:
            shutil.rmtree(work_dir)

    @patch("code_review.executor.run_cli")
    def test_review_prompt_contains_filename(self, mock_run_cli: MagicMock) -> None:
        mock_run_cli.return_value = subprocess.CompletedProcess(
            args=[], returncode=0, stdout="", stderr=""
        )
        executor = _build_executor()
        work_dir = executor.work_root / "prompt-test"
        work_dir.mkdir(parents=True, exist_ok=True)

        try:
            executor.execute(
                {"job_id": "j1", "prompt": "", "params": {"code": "x=1", "language": "python"}},
                work_dir,
            )
        finally:
            shutil.rmtree(work_dir)

        cmd = mock_run_cli.call_args[0][0]
        prompt_idx = cmd.index("-p")
        prompt_text = cmd[prompt_idx + 1]
        self.assertIn("input.py", prompt_text)
        self.assertIn("review.md", prompt_text)

    @patch("code_review.executor.run_cli")
    def test_buyer_prompt_appended(self, mock_run_cli: MagicMock) -> None:
        mock_run_cli.return_value = subprocess.CompletedProcess(
            args=[], returncode=0, stdout="", stderr=""
        )
        executor = _build_executor()
        work_dir = executor.work_root / "buyer-prompt-test"
        work_dir.mkdir(parents=True, exist_ok=True)

        try:
            executor.execute(
                {
                    "job_id": "j1",
                    "prompt": "Focus on SQL injection",
                    "params": {"code": "query(x)", "language": "python"},
                },
                work_dir,
            )
        finally:
            shutil.rmtree(work_dir)

        cmd = mock_run_cli.call_args[0][0]
        prompt_idx = cmd.index("-p")
        prompt_text = cmd[prompt_idx + 1]
        self.assertIn("Focus on SQL injection", prompt_text)

    @patch("code_review.executor.run_cli")
    def test_command_uses_dangerously_skip_permissions(self, mock_run_cli: MagicMock) -> None:
        mock_run_cli.return_value = subprocess.CompletedProcess(
            args=[], returncode=0, stdout="", stderr=""
        )
        executor = _build_executor()
        work_dir = executor.work_root / "flags-test"
        work_dir.mkdir(parents=True, exist_ok=True)

        try:
            executor.execute(
                {"job_id": "j1", "prompt": "", "params": {"code": "x=1", "language": "python"}},
                work_dir,
            )
        finally:
            shutil.rmtree(work_dir)

        cmd = mock_run_cli.call_args[0][0]
        self.assertEqual(cmd[0], "claude")
        self.assertIn("--dangerously-skip-permissions", cmd)

    def test_empty_code_raises_value_error(self) -> None:
        executor = _build_executor()
        work_dir = executor.work_root / "empty-code-test"
        work_dir.mkdir(parents=True, exist_ok=True)

        try:
            with self.assertRaises(ValueError) as ctx:
                executor.execute(
                    {"job_id": "j1", "prompt": "", "params": {"code": "", "language": "python"}},
                    work_dir,
                )
            self.assertIn("code", str(ctx.exception).lower())
        finally:
            shutil.rmtree(work_dir)

    def test_missing_code_param_raises_value_error(self) -> None:
        executor = _build_executor()
        work_dir = executor.work_root / "no-code-test"
        work_dir.mkdir(parents=True, exist_ok=True)

        try:
            with self.assertRaises(ValueError):
                executor.execute(
                    {"job_id": "j1", "prompt": "", "params": {}},
                    work_dir,
                )
        finally:
            shutil.rmtree(work_dir)

    def test_none_params_raises_value_error(self) -> None:
        executor = _build_executor()
        work_dir = executor.work_root / "none-params-test"
        work_dir.mkdir(parents=True, exist_ok=True)

        try:
            with self.assertRaises(ValueError):
                executor.execute(
                    {"job_id": "j1", "prompt": "", "params": None},
                    work_dir,
                )
        finally:
            shutil.rmtree(work_dir)

    @patch("code_review.executor.run_cli")
    def test_error_extracts_stderr(self, mock_run_cli: MagicMock) -> None:
        mock_run_cli.side_effect = subprocess.CalledProcessError(
            1, ["claude"], output="", stderr="auth failed"
        )
        executor = _build_executor()
        work_dir = executor.work_root / "err-test"
        work_dir.mkdir(parents=True, exist_ok=True)

        try:
            with self.assertRaises(RuntimeError) as ctx:
                executor.execute(
                    {"job_id": "j1", "prompt": "", "params": {"code": "x=1"}},
                    work_dir,
                )
            self.assertEqual(str(ctx.exception), "auth failed")
        finally:
            shutil.rmtree(work_dir)

    @patch("code_review.executor.run_cli")
    def test_error_fallback_message(self, mock_run_cli: MagicMock) -> None:
        mock_run_cli.side_effect = subprocess.CalledProcessError(
            2, ["claude"], output="", stderr=""
        )
        executor = _build_executor()
        work_dir = executor.work_root / "fallback-err-test"
        work_dir.mkdir(parents=True, exist_ok=True)

        try:
            with self.assertRaises(RuntimeError) as ctx:
                executor.execute(
                    {"job_id": "j1", "prompt": "", "params": {"code": "x=1"}},
                    work_dir,
                )
            self.assertEqual(str(ctx.exception), "claude exited with code 2")
        finally:
            shutil.rmtree(work_dir)

    @patch("code_review.executor.run_cli")
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
                    {"job_id": "j1", "prompt": "", "params": {"code": "x=1"}},
                    work_dir,
                )
            self.assertEqual(len(str(ctx.exception)), 500)
        finally:
            shutil.rmtree(work_dir)

    @patch("code_review.executor.run_cli")
    def test_captures_stdout(self, mock_run_cli: MagicMock) -> None:
        mock_run_cli.return_value = subprocess.CompletedProcess(
            args=[], returncode=0, stdout="Review output", stderr=""
        )
        executor = _build_executor()
        work_dir = executor.work_root / "stdout-test"
        work_dir.mkdir(parents=True, exist_ok=True)

        try:
            executor.execute(
                {"job_id": "j1", "prompt": "", "params": {"code": "x=1"}},
                work_dir,
            )
        finally:
            shutil.rmtree(work_dir)

        self.assertEqual(executor._last_stdout, "Review output")


class CollectFilesTests(unittest.TestCase):
    def test_excludes_input_files(self) -> None:
        executor = _build_executor()
        work_dir = executor.work_root / "exclude-input"
        work_dir.mkdir(parents=True, exist_ok=True)

        try:
            (work_dir / "input.py").write_text("x = 1", encoding="utf-8")
            (work_dir / "review.md").write_text("# Review", encoding="utf-8")
            files = executor.collect_files(work_dir)
            names = [f.name for f in files]
            self.assertIn("review.md", names)
            self.assertNotIn("input.py", names)
        finally:
            shutil.rmtree(work_dir)

    def test_excludes_input_txt(self) -> None:
        executor = _build_executor()
        work_dir = executor.work_root / "exclude-txt"
        work_dir.mkdir(parents=True, exist_ok=True)

        try:
            (work_dir / "input.txt").write_text("code", encoding="utf-8")
            (work_dir / "review.md").write_text("# OK", encoding="utf-8")
            files = executor.collect_files(work_dir)
            names = [f.name for f in files]
            self.assertNotIn("input.txt", names)
            self.assertIn("review.md", names)
        finally:
            shutil.rmtree(work_dir)

    def test_stdout_fallback_writes_review_md(self) -> None:
        executor = _build_executor()
        executor._last_stdout = "# Looks good\nNo issues found."
        work_dir = executor.work_root / "fallback-review"
        work_dir.mkdir(parents=True, exist_ok=True)

        try:
            (work_dir / "input.py").write_text("x = 1", encoding="utf-8")
            files = executor.collect_files(work_dir)
            self.assertEqual(len(files), 1)
            self.assertEqual(files[0].name, "review.md")
            self.assertIn("Looks good", files[0].read_text(encoding="utf-8"))
        finally:
            shutil.rmtree(work_dir)

    def test_no_fallback_when_review_files_exist(self) -> None:
        executor = _build_executor()
        executor._last_stdout = "stdout content"
        work_dir = executor.work_root / "no-fallback"
        work_dir.mkdir(parents=True, exist_ok=True)

        try:
            (work_dir / "input.py").write_text("x = 1", encoding="utf-8")
            (work_dir / "review.md").write_text("real review", encoding="utf-8")
            files = executor.collect_files(work_dir)
            names = [f.name for f in files]
            self.assertIn("review.md", names)
            content = (work_dir / "review.md").read_text(encoding="utf-8")
            self.assertEqual(content, "real review")
        finally:
            shutil.rmtree(work_dir)

    def test_empty_stdout_no_fallback(self) -> None:
        executor = _build_executor()
        executor._last_stdout = "   "
        work_dir = executor.work_root / "empty-stdout"
        work_dir.mkdir(parents=True, exist_ok=True)

        try:
            (work_dir / "input.py").write_text("x = 1", encoding="utf-8")
            files = executor.collect_files(work_dir)
            self.assertEqual(files, [])
        finally:
            shutil.rmtree(work_dir)

    def test_empty_work_dir_no_files(self) -> None:
        executor = _build_executor()
        executor._last_stdout = ""
        work_dir = executor.work_root / "empty-dir"
        work_dir.mkdir(parents=True, exist_ok=True)

        try:
            files = executor.collect_files(work_dir)
            self.assertEqual(files, [])
        finally:
            shutil.rmtree(work_dir)


class LanguageExtensionTests(unittest.TestCase):
    def test_all_supported_languages(self) -> None:
        expected = {
            "python": ".py",
            "javascript": ".js",
            "typescript": ".ts",
            "go": ".go",
            "rust": ".rs",
        }
        self.assertEqual(LANGUAGE_EXTENSIONS, expected)


if __name__ == "__main__":
    unittest.main()
