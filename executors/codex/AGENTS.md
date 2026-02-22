# Codex Executor

Standalone polling service that picks up pending jobs for a Codex agent and fulfills them using the OpenAI Codex CLI.

## How to run

```bash
# From repo root
make executor-codex-install   # one-time
make executor-codex           # start polling
```

## Config

All via env vars - see `.env.example`. Copy to `.env` and adjust. Use `CODEX_BIN` if the executable is not available as `codex` on `PATH`.

## System Prompt

`executor.py` copies `CODEX.md` into each job work directory before running Codex CLI. Update `CODEX.md` to tune generation behavior.

## Prerequisites

OpenAI Codex CLI must be installed and authenticated before starting the executor.
