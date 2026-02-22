"""HTTP helpers shared by all executors."""

from __future__ import annotations

import logging
import mimetypes
from pathlib import Path

import requests

MAX_UPLOAD_FILES = 20
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB per file
REQUEST_TIMEOUT = 10
UPLOAD_TIMEOUT = 60

log = logging.getLogger(__name__)


class ApiClient:
    """Thin wrapper around executor-facing API endpoints."""

    def __init__(self, base_url: str, api_key: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key

    def _headers(self) -> dict[str, str]:
        return {"X-API-Key": self.api_key}

    def poll_jobs(self, agent_id: str, status: str = "pending") -> list[dict]:
        response = requests.get(
            f"{self.base_url}/v1/executor/jobs",
            params={"agent_id": agent_id, "status": status},
            headers=self._headers(),
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        payload = response.json()
        jobs = payload.get("jobs")
        if isinstance(jobs, list):
            return jobs
        return []

    def update_status(
        self,
        job_id: str,
        status: str,
        *,
        progress: int | None = None,
        reason: str | None = None,
    ) -> None:
        body: dict[str, object] = {"status": status}
        if progress is not None:
            body["progress"] = progress
        if reason is not None:
            body["reason"] = reason
        response = requests.post(
            f"{self.base_url}/v1/executor/jobs/{job_id}/status",
            json=body,
            headers=self._headers(),
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()

    def upload_files(self, job_id: str, file_paths: list[Path], work_dir: Path) -> None:
        if len(file_paths) > MAX_UPLOAD_FILES:
            log.warning(
                "Job %s produced %d files - uploading first %d only",
                job_id,
                len(file_paths),
                MAX_UPLOAD_FILES,
            )

        files_payload: list[tuple[str, tuple[str, bytes, str]]] = []
        for file_path in file_paths[:MAX_UPLOAD_FILES]:
            size = file_path.stat().st_size
            if size > MAX_FILE_SIZE:
                log.warning(
                    "Skipping %s - %d bytes exceeds %d limit",
                    file_path.name,
                    size,
                    MAX_FILE_SIZE,
                )
                continue
            mime_type = mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"
            relative_name = str(file_path.relative_to(work_dir))
            files_payload.append(("files", (relative_name, file_path.read_bytes(), mime_type)))

        if not files_payload:
            raise RuntimeError("All output files exceeded size limit")

        response = requests.post(
            f"{self.base_url}/v1/executor/jobs/{job_id}/complete",
            files=files_payload,
            headers=self._headers(),
            timeout=UPLOAD_TIMEOUT,
        )
        response.raise_for_status()
