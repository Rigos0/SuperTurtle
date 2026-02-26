from __future__ import annotations

import pytest

from super_turtle.subturtle import __main__ as subturtle_main


def _write_state_file(tmp_path) -> None:
    (tmp_path / "CLAUDE.md").write_text("# Current task\n\nTest task\n", encoding="utf-8")


def test_require_cli_exits_with_clear_error(monkeypatch, capsys) -> None:
    monkeypatch.setattr(subturtle_main.shutil, "which", lambda _cli: None)

    with pytest.raises(SystemExit) as excinfo:
        subturtle_main._require_cli("default", "claude")

    assert excinfo.value.code == 1
    assert "'claude' not found on PATH" in capsys.readouterr().err


def test_run_slow_loop_checks_codex_before_start(monkeypatch, tmp_path, capsys) -> None:
    _write_state_file(tmp_path)

    def fake_which(cli: str) -> str | None:
        return "/usr/bin/claude" if cli == "claude" else None

    monkeypatch.setattr(subturtle_main.shutil, "which", fake_which)

    with pytest.raises(SystemExit) as excinfo:
        subturtle_main.run_slow_loop(tmp_path, "default")

    assert excinfo.value.code == 1
    assert "'codex' not found on PATH" in capsys.readouterr().err


def test_run_yolo_loop_retries_on_oserror(monkeypatch, tmp_path, capsys) -> None:
    _write_state_file(tmp_path)
    monkeypatch.setattr(subturtle_main, "_require_cli", lambda _name, _cli: None)

    class BrokenClaude:
        def execute(self, _prompt: str) -> str:
            raise OSError("launch failed")

    class StopLoop(Exception):
        pass

    def stop_after_retry(_delay: int) -> None:
        raise StopLoop

    monkeypatch.setattr(subturtle_main, "Claude", lambda **_kwargs: BrokenClaude())
    monkeypatch.setattr(subturtle_main.time, "sleep", stop_after_retry)

    with pytest.raises(StopLoop):
        subturtle_main.run_yolo_loop(tmp_path, "default")

    assert "retrying in" in capsys.readouterr().err


def test_archive_workspace_uses_ctl_stop_and_preserves_meta(monkeypatch, tmp_path) -> None:
    pid_file = tmp_path / "subturtle.pid"
    meta_file = tmp_path / "subturtle.meta"
    pid_file.write_text("4321\n", encoding="utf-8")
    meta_file.write_text("CRON_JOB_ID=abc123\n", encoding="utf-8")

    monkeypatch.setattr(subturtle_main.os, "getpid", lambda: 4321)

    called = {}

    def fake_run(cmd, **kwargs):
        called["cmd"] = cmd
        called["kwargs"] = kwargs

    monkeypatch.setattr(subturtle_main.subprocess, "run", fake_run)

    subturtle_main._archive_workspace(tmp_path, "worker-1")

    assert not pid_file.exists()
    assert meta_file.exists()
    assert called["cmd"][1:] == ["stop", "worker-1"]
    assert called["kwargs"]["check"] is True
