# Orchestrator Module

Runs one headless planning->execution handoff between Claude and Codex CLIs.

## Install

```bash
cd orchestrator
uv sync --extra dev
```

## Run

```bash
cd orchestrator
uv run agnt-handoff "Follow instructions in CLAUDE.md"
```

Useful flags:
- `--cwd /path/to/repo` to run both agents in a specific repository
- `--skip-groom` to skip the CLAUDE.md update pass

## Test

```bash
cd orchestrator
uv run pytest
```
