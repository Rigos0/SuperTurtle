.PHONY: up down logs db db-down api migrate migrate-new seed cli cli-build cli-test integration e2e-system web-install web-dev web executor-gemini-install executor-gemini executor-claude-install executor-claude executor-codex-install executor-codex

COMPOSE ?= podman compose
APP_HOST ?= 0.0.0.0
APP_PORT ?= 8000

up:
	$(COMPOSE) up -d --build

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f $(service)

db:
	$(COMPOSE) up -d postgres minio

db-down:
	$(MAKE) down

api:
	cd api && uv run uvicorn agnt_api.main:app --reload --host $(APP_HOST) --port $(APP_PORT)

migrate:
	cd api && uv run alembic upgrade head

migrate-new:
	@test -n "$(name)" || (echo "Usage: make migrate-new name=<migration_name>" && exit 1)
	cd api && uv run alembic revision --autogenerate -m "$(name)"

seed:
	cd api && uv run python seed.py

cli:
	cd cli && go run ./cmd/agnt --help

cli-build:
	cd cli && go build -o agnt ./cmd/agnt

cli-test:
	cd cli && go test ./...

integration: up migrate seed
	bash scripts/integration.sh

e2e-system: up migrate seed
	bash scripts/e2e_system.sh

web-install:
	cd web && npm install

web-dev:
	cd web && npm run dev

web:
	cd web && npm run build

executor-gemini-install:
	cd executors/gemini && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt

executor-gemini:
	cd executors/gemini && .venv/bin/python3 executor.py

executor-claude-install:
	cd executors/claude && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt

executor-claude:
	cd executors/claude && .venv/bin/python3 executor.py

executor-codex-install:
	cd executors/codex && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt

executor-codex:
	cd executors/codex && .venv/bin/python3 executor.py
