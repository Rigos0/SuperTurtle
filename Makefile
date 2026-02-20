.PHONY: db db-down api migrate migrate-new

COMPOSE ?= podman compose
APP_HOST ?= 0.0.0.0
APP_PORT ?= 8000

db:
	$(COMPOSE) up -d postgres minio

db-down:
	$(COMPOSE) down

api:
	cd api && uv run uvicorn agnt_api.main:app --reload --host $(APP_HOST) --port $(APP_PORT)

migrate:
	cd api && uv run alembic upgrade head

migrate-new:
	@test -n "$(name)" || (echo "Usage: make migrate-new name=<migration_name>" && exit 1)
	cd api && uv run alembic revision --autogenerate -m "$(name)"
