"""Concrete agent classes for SubTurtle loop orchestration."""

import subprocess
import sys
from pathlib import Path


def _run_streaming(cmd: list[str], cwd: Path) -> str:
    """Run a command, stream stdout line-by-line to stderr, return captured stdout.

    Streams to stderr so that the return value (stdout capture) stays clean
    for programmatic use, while the operator still sees progress in the terminal.

    Raises subprocess.CalledProcessError on non-zero exit.
    """
    proc = subprocess.Popen(
        cmd,
        cwd=cwd,
        stdout=subprocess.PIPE,
        text=True,
    )
    lines: list[str] = []
    if proc.stdout is None:
        raise RuntimeError("stdout is None despite PIPE being set")
    for line in proc.stdout:
        sys.stderr.write(line)
        sys.stderr.flush()
        lines.append(line)
    proc.wait()
    if proc.returncode != 0:
        raise subprocess.CalledProcessError(proc.returncode, cmd)
    return "".join(lines).strip()


class Claude:
    """Claude Code agent -- planning mode."""

    def __init__(self, cwd: str | Path = ".", add_dirs: list[str] | None = None) -> None:
        self.cwd = Path(cwd).resolve()
        self.add_dirs = add_dirs or []

    def plan(self, prompt: str) -> str:
        """Generate an implementation plan from a prompt. Returns the plan text."""
        print(f"[claude] planning in {self.cwd} ...")
        cmd = [
            "claude",
            "--permission-mode",
            "plan",
            "--dangerously-skip-permissions",
        ]
        for add_dir in self.add_dirs:
            cmd.extend(["--add-dir", add_dir])
        cmd.extend(["-p", prompt])
        result = _run_streaming(cmd, self.cwd)
        print(f"[claude] plan ready ({len(result)} chars)")
        print(result)
        return result

    def execute(self, prompt: str) -> str:
        """Execute a prompt (run Claude without plan mode). Returns the output text."""
        print(f"[claude] executing in {self.cwd} ...")
        cmd = [
            "claude",
            "--dangerously-skip-permissions",
        ]
        for add_dir in self.add_dirs:
            cmd.extend(["--add-dir", add_dir])
        cmd.extend(["-p", prompt])
        result = _run_streaming(cmd, self.cwd)
        print(f"[claude] executed ready ({len(result)} chars)")
        return result


class Codex:
    """Codex agent -- execution mode."""

    def __init__(self, cwd: str | Path = ".", add_dirs: list[str] | None = None) -> None:
        self.cwd = Path(cwd).resolve()
        self.add_dirs = add_dirs or []

    def execute(self, prompt: str) -> str:
        """Execute a prompt with full auto-approval. Returns agent output."""
        print(f"[codex] executing in {self.cwd} ...")
        cmd = ["codex", "exec", "--yolo"]
        for add_dir in self.add_dirs:
            cmd.extend(["--add-dir", add_dir])
        cmd.append(prompt)
        result = _run_streaming(cmd, self.cwd)
        print("[codex] done")
        return result
