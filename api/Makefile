.PHONY: api migrate migrate-new
APP_HOST ?= 0.0.0.0
APP_PORT ?= 8000

api:
	uv run uvicorn agnt_api.main:app --reload --host $(APP_HOST) --port $(APP_PORT)

migrate:
	uv run alembic upgrade head

migrate-new:
	@test -n "$(name)" || (echo "Usage: make migrate-new name=<migration_name>" && exit 1)
	uv run alembic revision --autogenerate -m "$(name)"
