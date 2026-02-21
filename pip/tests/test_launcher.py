from __future__ import annotations

import subprocess
from pathlib import Path

import pytest

from agnt_cli import launcher


def test_ensure_binary_respects_skip_download(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    package_root = tmp_path / "pkg"
    package_root.mkdir(parents=True)

    monkeypatch.setattr(launcher, "_package_root", lambda: package_root)
    monkeypatch.setenv("AGNT_SKIP_DOWNLOAD", "1")
    monkeypatch.delenv("AGNT_BINARY_PATH", raising=False)

    with pytest.raises(RuntimeError, match="AGNT_SKIP_DOWNLOAD=1"):
        launcher.ensure_binary()


def test_ensure_binary_installs_from_local_source(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    package_root = tmp_path / "pkg"
    package_root.mkdir(parents=True)

    source_path = tmp_path / "source-agnt"
    source_payload = b"#!/bin/sh\necho agnt\n"
    source_path.write_bytes(source_payload)

    monkeypatch.setattr(launcher, "_package_root", lambda: package_root)
    monkeypatch.setattr(launcher, "_package_version", lambda: "0.1.0")
    monkeypatch.setenv("AGNT_BINARY_PATH", str(source_path))
    monkeypatch.delenv("AGNT_SKIP_DOWNLOAD", raising=False)
    monkeypatch.delenv("AGNT_BINARY_URL", raising=False)
    monkeypatch.delenv("AGNT_BINARY_RELEASE_TAG", raising=False)
    monkeypatch.delenv("AGNT_BINARY_BASE_URL", raising=False)

    destination_path = launcher.ensure_binary()
    assert destination_path.exists()
    assert destination_path.read_bytes() == source_payload


def test_main_forwards_args_and_exit_code(monkeypatch: pytest.MonkeyPatch) -> None:
    executable = Path("/tmp/fake-agnt")
    monkeypatch.setattr(launcher, "ensure_binary", lambda: executable)

    captured: dict[str, object] = {}

    def fake_run(command: list[str], check: bool) -> subprocess.CompletedProcess[str]:
        captured["command"] = command
        captured["check"] = check
        return subprocess.CompletedProcess(command, 7)

    monkeypatch.setattr(launcher.subprocess, "run", fake_run)

    code = launcher.main(["jobs"])
    assert code == 7
    assert captured["command"] == [str(executable), "jobs"]
    assert captured["check"] is False
