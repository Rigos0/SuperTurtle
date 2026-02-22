"""Shared executor scaffold components."""

from __future__ import annotations

__all__ = ["BaseExecutor", "run_cli"]


def __getattr__(name: str):
    if name in __all__:
        from .executor import BaseExecutor, run_cli

        return {"BaseExecutor": BaseExecutor, "run_cli": run_cli}[name]
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
