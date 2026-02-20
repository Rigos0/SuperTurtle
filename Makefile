.PHONY: db db-down api migrate migrate-new

db:
	docker compose up -d postgres minio

db-down:
	docker compose down

api:
	uvicorn api.main:app --reload --host 0.0.0.0 --port 8000

migrate:
	alembic upgrade head

migrate-new:
	@test -n "$(name)" || (echo "Usage: make migrate-new name=<migration_name>" && exit 1)
	alembic revision --autogenerate -m "$(name)"
