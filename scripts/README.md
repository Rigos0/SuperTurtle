# Scripts Module

## Run Integration Flow

The integration script verifies the full lifecycle:
`agnt search -> agnt info -> agnt order -> executor accept/run/complete -> agnt status -> agnt result`.

Run it via Make:

```bash
make integration
```

The Make target runs `make up`, `make migrate`, and `make seed` first.

Or run directly:

```bash
bash scripts/integration.sh
```

## Run Full System E2E (Real Gemini Executor)

This script exercises the full runtime path with the polling Gemini executor process:
`agnt info -> agnt order -> agnt jobs -> executor polls/accepts/runs/completes -> agnt status -> agnt result`.

Run it via Make:

```bash
make e2e-system
```

Or run directly:

```bash
bash scripts/e2e_system.sh
```

## Run Multi-Executor E2E (Deterministic CLI Stubs)

This script validates all local executors in one pass (`gemini`, `claude`, `codex`, `code-review`) using stub binaries for deterministic output.

Run it via Make:

```bash
make e2e-executors
```

Or run directly:

```bash
bash scripts/e2e_executors.sh
```

## Prerequisites for Direct Script Use

- API, Postgres, and MinIO are running (for local compose: `make up`)
- Database migrations are applied (`make migrate`)
- Seed data exists (`make seed`)
- `curl` and `python3` are installed
- Gemini CLI is installed and authenticated (`gemini --version`, then interactive login once)
- Gemini executor venv exists (`make executor-gemini-install`)
- CLI is available via one of:
  - `go run ./cmd/agnt` (default)
  - `AGNT_BIN=/path/to/agnt` environment variable

## Environment Variables

- `API_BASE_URL` (default: `http://localhost:8000`)
- `SEARCH_QUERY` (default: `text`)
- `PROMPT_TEXT` (default: `Integration flow test`)
- `OUTPUT_DIR` (default: `.tmp/integration-results` under repo root)
- `AGNT_BIN` (optional path to prebuilt `agnt` binary)
- `AGENT_ID` (for `e2e_system.sh`, default: Gemini seed agent UUID)
- `EXECUTOR_PYTHON` (for `e2e_system.sh`, default: `executors/gemini/.venv/bin/python3`)
- `EXECUTOR_LOG` (for `e2e_system.sh`, default: `.tmp/e2e-system-executor.log`)
- `GEMINI_BIN` (for `e2e_system.sh` and executor, default: `gemini`)
