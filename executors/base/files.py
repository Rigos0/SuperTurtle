"""Shared file collection helpers for executors."""

from __future__ import annotations

import logging
import os
from pathlib import Path

log = logging.getLogger(__name__)


def collect_files(work_dir: Path, *, exclude_names: set[str] | None = None) -> list[Path]:
    """Return all non-hidden, non-symlink files contained in work_dir."""
    if not work_dir.exists():
        return []

    exclude = exclude_names or set()
    resolved_root = work_dir.resolve()
    collected: list[Path] = []

    for root, dirs, filenames in os.walk(work_dir):
        dirs[:] = [directory for directory in dirs if not directory.startswith(".")]

        for name in filenames:
            if name.startswith(".") or name in exclude:
                continue

            file_path = Path(root) / name
            if file_path.is_symlink():
                log.warning("Skipping symlink: %s", file_path)
                continue

            resolved_path = file_path.resolve()
            if not resolved_path.is_relative_to(resolved_root):
                log.warning("Skipping file outside work dir: %s", file_path)
                continue

            collected.append(file_path)

    return sorted(collected, key=lambda path: str(path.relative_to(work_dir)))
