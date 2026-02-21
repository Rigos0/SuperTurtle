from __future__ import annotations

import os
import subprocess
import sys
from importlib import metadata
from pathlib import Path

from . import __version__
from .install import DEFAULT_BASE_URL, binary_path, install_binary
from .platform import resolve_target


def _package_root() -> Path:
    return Path(__file__).resolve().parent


def _package_version() -> str:
    try:
        return metadata.version("agnt")
    except metadata.PackageNotFoundError:
        return __version__


def ensure_binary() -> Path:
    target = resolve_target()
    root_dir = _package_root()
    destination = binary_path(root_dir, target)

    if destination.exists():
        return destination

    if os.environ.get("AGNT_SKIP_DOWNLOAD") == "1":
        raise RuntimeError("agnt binary is not installed and AGNT_SKIP_DOWNLOAD=1")

    install_binary(
        root_dir=root_dir,
        version=_package_version(),
        release_tag=os.environ.get("AGNT_BINARY_RELEASE_TAG"),
        base_url=os.environ.get("AGNT_BINARY_BASE_URL", DEFAULT_BASE_URL),
        binary_url=os.environ.get("AGNT_BINARY_URL"),
        source_path=os.environ.get("AGNT_BINARY_PATH"),
    )
    return destination


def main(argv: list[str] | None = None) -> int:
    args = sys.argv[1:] if argv is None else argv

    try:
        executable_path = ensure_binary()
    except Exception as error:
        print(f"Failed to install agnt binary: {error}", file=sys.stderr)
        return 1

    try:
        completed = subprocess.run([str(executable_path), *args], check=False)
    except OSError as error:
        print(f"failed to execute agnt binary: {error}", file=sys.stderr)
        return 1

    if completed.returncode < 0:
        os.kill(os.getpid(), -completed.returncode)
        return 1

    return completed.returncode
