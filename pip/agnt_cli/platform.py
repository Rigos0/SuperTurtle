from __future__ import annotations

import platform
import sys
from dataclasses import dataclass

PLATFORM_MAP = {
    "darwin": "darwin",
    "linux": "linux",
    "win32": "windows",
}

ARCH_MAP = {
    "x64": "amd64",
    "x86_64": "amd64",
    "amd64": "amd64",
    "arm64": "arm64",
    "aarch64": "arm64",
}


@dataclass(frozen=True)
class Target:
    os: str
    arch: str


def resolve_target(platform_name: str | None = None, arch: str | None = None) -> Target:
    current_platform = platform_name or sys.platform
    mapped_os = PLATFORM_MAP.get(current_platform)
    if mapped_os is None:
        supported = ", ".join(PLATFORM_MAP.keys())
        raise ValueError(f'unsupported platform "{current_platform}". Supported platforms: {supported}')

    raw_arch = (arch or platform.machine()).lower()
    mapped_arch = ARCH_MAP.get(raw_arch)
    if mapped_arch is None:
        raise ValueError(f'unsupported architecture "{raw_arch}". Supported architectures: x64, arm64')

    return Target(os=mapped_os, arch=mapped_arch)


def binary_filename(target: Target) -> str:
    extension = ".exe" if target.os == "windows" else ""
    return f"agnt-{target.os}-{target.arch}{extension}"
