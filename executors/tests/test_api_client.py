from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

EXECUTORS_ROOT = Path(__file__).resolve().parents[1]
if str(EXECUTORS_ROOT) not in sys.path:
    sys.path.insert(0, str(EXECUTORS_ROOT))

from base.api_client import ApiClient, MAX_FILE_SIZE, MAX_UPLOAD_FILES


class ApiClientTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = ApiClient("http://api.local", "test-key")

    def test_poll_jobs_uses_expected_endpoint(self) -> None:
        response = Mock()
        response.json.return_value = {"jobs": [{"job_id": "job-1"}]}

        with patch("base.api_client.requests.get", return_value=response) as mock_get:
            jobs = self.client.poll_jobs("agent-1")

        self.assertEqual(jobs, [{"job_id": "job-1"}])
        mock_get.assert_called_once_with(
            "http://api.local/v1/executor/jobs",
            params={"agent_id": "agent-1", "status": "pending"},
            headers={"X-API-Key": "test-key"},
            timeout=10,
        )
        response.raise_for_status.assert_called_once()

    def test_update_status_posts_payload(self) -> None:
        response = Mock()

        with patch("base.api_client.requests.post", return_value=response) as mock_post:
            self.client.update_status("job-1", "running", progress=42, reason="ignored")

        mock_post.assert_called_once_with(
            "http://api.local/v1/executor/jobs/job-1/status",
            json={"status": "running", "progress": 42, "reason": "ignored"},
            headers={"X-API-Key": "test-key"},
            timeout=10,
        )
        response.raise_for_status.assert_called_once()

    def test_upload_files_limits_count(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            work_dir = Path(temp_dir)
            files = []
            for index in range(MAX_UPLOAD_FILES + 2):
                file_path = work_dir / f"{index}.txt"
                file_path.write_text(f"file-{index}", encoding="utf-8")
                files.append(file_path)

            response = Mock()
            with patch("base.api_client.requests.post", return_value=response) as mock_post:
                self.client.upload_files("job-1", files, work_dir)

            payload = mock_post.call_args.kwargs["files"]
            self.assertEqual(len(payload), MAX_UPLOAD_FILES)
            response.raise_for_status.assert_called_once()

    def test_upload_files_skips_oversized_files(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            work_dir = Path(temp_dir)
            small = work_dir / "small.txt"
            small.write_text("ok", encoding="utf-8")

            large = work_dir / "large.txt"
            large.write_bytes(b"0" * (MAX_FILE_SIZE + 1))

            response = Mock()
            with patch("base.api_client.requests.post", return_value=response) as mock_post:
                self.client.upload_files("job-1", [small, large], work_dir)

            payload = mock_post.call_args.kwargs["files"]
            self.assertEqual(len(payload), 1)
            self.assertEqual(payload[0][1][0], "small.txt")

    def test_upload_files_raises_when_all_files_too_large(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            work_dir = Path(temp_dir)
            large = work_dir / "large.txt"
            large.write_bytes(b"0" * (MAX_FILE_SIZE + 1))

            with self.assertRaisesRegex(RuntimeError, "All output files exceeded size limit"):
                self.client.upload_files("job-1", [large], work_dir)


if __name__ == "__main__":
    unittest.main()
