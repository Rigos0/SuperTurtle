.PHONY: up down logs db db-down api migrate migrate-new seed cli cli-build cli-test executors-test integration e2e-system e2e-executors containers-rebuild web-install web-dev web web-test executor-gemini-install executor-gemini executor-claude-install executor-claude executor-codex-install executor-codex executor-code-review-install executor-code-review

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

executors-test:
	@if [ ! -x executors/.venv/bin/python3 ]; then \
		cd executors && python3 -m venv .venv; \
	fi
	executors/.venv/bin/pip install --quiet -r executors/requirements.txt
	executors/.venv/bin/python3 -m unittest discover -s executors/tests

integration: up migrate seed
	bash scripts/integration.sh

e2e-system: up migrate seed
	bash scripts/e2e_system.sh

e2e-executors: up migrate seed
	bash scripts/e2e_executors.sh

containers-rebuild: down
	$(COMPOSE) up -d --build

web-install:
	cd web && npm install

web-dev:
	cd web && npm run dev

web:
	cd web && npm run build

web-test:
	cd web && npm test

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

executor-code-review-install:
	cd executors/code_review && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt

executor-code-review:
	cd executors/code_review && .venv/bin/python3 executor.py
