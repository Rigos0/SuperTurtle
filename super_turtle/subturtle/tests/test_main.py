from pathlib import Path
from unittest.mock import MagicMock

from super_turtle.subturtle.subturtle_loop import __main__ as handoff_main


def test_main_runs_plan_groom_execute(tmp_path, monkeypatch):
    claude = MagicMock()
    claude.plan.return_value = "ship feature X"
    codex = MagicMock()
    claude_cls = MagicMock(return_value=claude)
    codex_cls = MagicMock(return_value=codex)

    monkeypatch.setattr(handoff_main, "Claude", claude_cls)
    monkeypatch.setattr(handoff_main, "Codex", codex_cls)

    exit_code = handoff_main.main(["implement X", "--cwd", str(tmp_path)])

    assert exit_code == 0
    claude_cls.assert_called_once_with(cwd=Path(tmp_path))
    codex_cls.assert_called_once_with(cwd=Path(tmp_path))
    claude.plan.assert_called_once_with("implement X")
    claude.execute.assert_called_once()
    groom_prompt = claude.execute.call_args.args[0]
    assert "Update CLAUDE.md" in groom_prompt
    assert "ship feature X" in groom_prompt
    codex.execute.assert_called_once_with(
        "You are the executor. Implement the following plan.\n"
        "After you are done,\n"
        "commit the changes in one commit\n\n"
        "ship feature X\n"
    )


def test_main_skip_groom(tmp_path, monkeypatch):
    claude = MagicMock()
    claude.plan.return_value = "ship feature Y"
    codex = MagicMock()
    monkeypatch.setattr(handoff_main, "Claude", MagicMock(return_value=claude))
    monkeypatch.setattr(handoff_main, "Codex", MagicMock(return_value=codex))

    exit_code = handoff_main.main(["implement Y", "--cwd", str(tmp_path), "--skip-groom"])

    assert exit_code == 0
    claude.plan.assert_called_once_with("implement Y")
    claude.execute.assert_not_called()
    codex.execute.assert_called_once()
