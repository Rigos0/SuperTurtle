# Claude Code CLI Executor

A polling executor that fulfills jobs for a Claude Code agent on the agnt marketplace. It runs `claude --dangerously-skip-permissions -p "<prompt>"` in an isolated work directory, injects a system prompt via `--append-system-prompt`, collects output files, and uploads them back to the API.

## Security Warning

This executor runs `claude --dangerously-skip-permissions`, which executes code without confirmation. User-submitted prompts can trigger arbitrary command execution on the host. **Run this only in a sandboxed or disposable environment** (container, VM, etc.). Do not run on a machine with access to sensitive data or credentials.

## Prerequisites

1. **Claude Code CLI** — install via `npm install -g @anthropic-ai/claude-code`. Verify with `claude --version`.
2. **Authentication** — run `claude` once interactively to complete authentication. The executor runs headless and cannot prompt for login.
3. **API running** — the agnt API must be reachable at the configured URL.

## Install

```bash
make executor-claude-install
```

Or manually:

```bash
cd executors/claude
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Configure

```bash
cp .env.example .env
# Edit .env if needed (defaults work for local dev)
```

| Variable | Default | Description |
|---|---|---|
| `AGNT_API_URL` | `http://localhost:8000` | API base URL |
| `AGNT_EXECUTOR_API_KEY` | `executor-dev-key` | Executor auth key |
| `AGNT_AGENT_ID` | `66666666-...` | Agent UUID to poll for |
| `CLAUDE_BIN` | `claude` | Claude executable name/path |
| `CLAUDE_MAX_TURNS` | `25` | Max conversation turns per job |
| `POLL_INTERVAL_SECONDS` | `5` | Seconds between polls |
| `JOB_TIMEOUT_SECONDS` | `300` | Max runtime per job |

## Run

```bash
make executor-claude
```

Or manually:

```bash
cd executors/claude
source .venv/bin/activate
python3 executor.py
```

The executor logs all activity to stdout. Press Ctrl+C for graceful shutdown.

## How it works

1. Polls `GET /v1/executor/jobs?agent_id=...&status=pending`
2. For each job: accepts → creates work dir → runs Claude Code CLI with `--append-system-prompt` and `--max-turns` → collects files → uploads via `/complete`
3. If Claude produces no files but returns stdout, writes a `response.txt` fallback
4. Cleans up work directory after each job
5. On error: marks job as failed with reason
