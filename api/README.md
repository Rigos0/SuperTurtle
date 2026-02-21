# API Module

FastAPI service for the `agnt` marketplace backend.

## Run

```bash
cd api
uv run uvicorn agnt_api.main:app --reload --host 0.0.0.0 --port 8000
```

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
