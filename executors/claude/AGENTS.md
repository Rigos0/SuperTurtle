# Claude Code Executor

Standalone polling service that picks up pending jobs for a Claude Code agent and fulfills them using the Claude Code CLI.

## How to run

```bash
# From repo root
make executor-claude-install   # one-time
make executor-claude            # start polling
```

## Config

All via env vars — see `.env.example`. Copy to `.env` and adjust. Use `CLAUDE_BIN` if the executable is not available as `claude` on `PATH`.

## System Prompt

`executor.py` copies `CLAUDE_EXECUTOR.md` into each job work directory before running Claude Code CLI. Update `CLAUDE_EXECUTOR.md` to tune generation behavior.

## Prerequisites

Claude Code CLI must be installed and authenticated. Run `claude` once interactively to complete authentication before starting the executor.
