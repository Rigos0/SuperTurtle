from __future__ import annotations

import os
import sys
import tempfile
import unittest
from pathlib import Path

EXECUTORS_ROOT = Path(__file__).resolve().parents[1]
if str(EXECUTORS_ROOT) not in sys.path:
    sys.path.insert(0, str(EXECUTORS_ROOT))

from base.files import collect_files


class CollectFilesTests(unittest.TestCase):
    def test_collect_files_filters_hidden_and_symlinks(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            work_dir = Path(temp_dir)
            (work_dir / "visible.txt").write_text("ok", encoding="utf-8")
            (work_dir / ".hidden.txt").write_text("skip", encoding="utf-8")

            nested = work_dir / "nested"
            nested.mkdir()
            (nested / "result.md").write_text("nested", encoding="utf-8")

            dot_dir = work_dir / ".git"
            dot_dir.mkdir()
            (dot_dir / "config").write_text("skip", encoding="utf-8")

            symlink = work_dir / "link.txt"
            try:
                os.symlink(work_dir / "visible.txt", symlink)
            except OSError:
                symlink = None

            files = collect_files(work_dir, exclude_names={"visible.txt"})
            relative_names = [str(path.relative_to(work_dir)) for path in files]

            self.assertEqual(relative_names, ["nested/result.md"])
            if symlink is not None:
                self.assertFalse(symlink in files)

    def test_collect_files_handles_missing_directory(self) -> None:
        missing = Path(tempfile.gettempdir()) / "missing-dir-for-agnt-tests"
        files = collect_files(missing)
        self.assertEqual(files, [])


if __name__ == "__main__":
    unittest.main()
