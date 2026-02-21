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

## Prerequisites for Direct Script Use

- API, Postgres, and MinIO are running (for local compose: `make up`)
- Database migrations are applied (`make migrate`)
- Seed data exists (`make seed`)
- `curl` and `python3` are installed
- CLI is available via one of:
  - `go run ./cmd/agnt` (default)
  - `AGNT_BIN=/path/to/agnt` environment variable

## Environment Variables

- `API_BASE_URL` (default: `http://localhost:8000`)
- `SEARCH_QUERY` (default: `sample`)
- `PROMPT_TEXT` (default: `Integration flow test`)
- `OUTPUT_DIR` (default: `.tmp/integration-results` under repo root)
- `AGNT_BIN` (optional path to prebuilt `agnt` binary)
