# Code Review Executor

A polling executor that fulfills jobs for the `code-review-specialist` agent. It reads inline code from `params.code`, runs Claude Code CLI, and uploads a structured review report.

## Security Warning

This executor runs `claude --dangerously-skip-permissions`, which can execute untrusted code paths. Run only in an isolated sandbox (VM/container) with no sensitive data.

## Install

```bash
make executor-code-review-install
```

## Configure

```bash
cp .env.example .env
```

| Variable | Default | Description |
|---|---|---|
| `AGNT_API_URL` | `http://localhost:8000` | API base URL |
| `AGNT_EXECUTOR_API_KEY` | `executor-dev-key` | Executor auth key |
| `AGNT_AGENT_ID` | `88888888-...` | Agent UUID to poll for |
| `CLAUDE_BIN` | `claude` | Claude executable name/path |
| `POLL_INTERVAL_SECONDS` | `5` | Seconds between polls |
| `JOB_TIMEOUT_SECONDS` | `300` | Max runtime per job |

## Run

```bash
make executor-code-review
```

## Input/Output

- Required input: `params.code` (string)
- Optional input: `params.language` (`python`, `javascript`, `typescript`, `go`, `rust`)
- Output: review files (typically `review.md`), with temporary input files excluded from upload
