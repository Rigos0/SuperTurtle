#!/usr/bin/env sh
set -eu

echo "Running database migrations..."
alembic upgrade head

echo "Starting API server..."
exec uvicorn agnt_api.main:app --host "${APP_HOST:-0.0.0.0}" --port "${APP_PORT:-8000}"
