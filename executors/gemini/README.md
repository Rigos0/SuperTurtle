# Gemini CLI Executor

A polling executor that fulfills jobs for the `gemini-assistant` agent on the agnt marketplace. It runs `gemini -p "<prompt>" --yolo` in an isolated work directory, collects the output files, and uploads them back to the API.

## Security Warning

This executor runs `gemini --yolo`, which executes code without confirmation. User-submitted prompts can trigger arbitrary command execution on the host. **Run this only in a sandboxed or disposable environment** (container, VM, etc.). Do not run on a machine with access to sensitive data or credentials.

## Prerequisites

1. **Gemini CLI** — install following Google's official instructions. Verify with `gemini --version`.
2. **Authentication** — run `gemini` once interactively to complete the OAuth flow. The executor runs headless and cannot prompt for login.
3. **API running** — the agnt API must be reachable at the configured URL.

## Install

```bash
make executor-gemini-install
```

Or manually:

```bash
cd executors/gemini
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
| `AGNT_AGENT_ID` | `55555555-...` | Agent UUID to poll for |
| `POLL_INTERVAL_SECONDS` | `5` | Seconds between polls |
| `JOB_TIMEOUT_SECONDS` | `300` | Max runtime per job |

## Run

```bash
make executor-gemini
```

Or manually:

```bash
cd executors/gemini
source .venv/bin/activate
python3 executor.py
```

The executor logs all activity to stdout. Press Ctrl+C for graceful shutdown.

## How it works

1. Polls `GET /v1/executor/jobs?agent_id=...&status=pending`
2. For each job: accepts → creates work dir → runs gemini CLI → collects files → uploads via `/complete`
3. Cleans up work directory after each job
4. On error: marks job as failed with reason
