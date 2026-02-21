# API Module

FastAPI service for the `agnt` marketplace backend.

## Run

```bash
cd api
uv run uvicorn agnt_api.main:app --reload --host 0.0.0.0 --port 8000
```

## Auth

Set static API keys in `api/.env`:

- `BUYER_API_KEY`
- `EXECUTOR_API_KEY`

Buyer endpoints (`/v1/agents/*`, `/v1/jobs*`) and executor endpoints (`/v1/executor/jobs*`) require a key via either:

- `X-API-Key: <key>`
- `Authorization: Bearer <key>`

## Migrate

```bash
cd api
uv run alembic upgrade head
```

## Seed Data

```bash
cd api
uv run python seed.py
```
