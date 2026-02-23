# Architecture Reviewer Memory

## Project: agnt (AI Agent Marketplace)

## Codebase Structure
- **API**: `api/agnt_api/` — FastAPI backend
  - `api/routes/` — route modules (jobs.py, executor_jobs.py)
  - `models/` — SQLAlchemy models (agent.py, job.py, job_result.py, enums.py, base.py)
  - `schemas/` — Pydantic request/response schemas (jobs.py, common.py)
  - `api/deps.py` — FastAPI dependencies (session)
  - `api/errors.py` — ApiError exception dataclass
  - `api/router.py` — router aggregation under /v1
  - `config.py` — pydantic-settings config
  - `db.py` — async engine + session factory
  - `main.py` — app factory + exception handlers
- **Migrations**: `api/alembic/` — Alembic migrations
- **Infra**: `docker-compose.yml` — Postgres + MinIO via Podman

## Known Patterns
- "get or 404" pattern: `await session.get(Model, id)` + `if None: raise ApiError(404, ...)` — appears 4x across 2 route files
- State machine (ALLOWED_TRANSITIONS, is_valid_transition) lives in executor_jobs.py route file
- `_utc_now()` private helper in executor_jobs.py
- `deps.py` is a passthrough wrapper over `db.get_db_session()` — adds no value currently

## Files to Watch (Growth/Bloat)
- `executor_jobs.py` (185 lines) — contains state machine logic + 3 endpoints + validation; will grow with progress updates, webhooks
- `schemas/jobs.py` (77 lines) — all job-related schemas in one file; shared between buyer and executor concerns

## Architecture Decisions
- Job lifecycle state machine is defined as route-level constants, not as a domain model concern
- No service layer — routes do DB queries directly
- DB URL hardcoded in alembic.ini (line 89) AND as default in config.py (line 21) — dual source of truth, though env.py overrides at runtime
- `complete_job` endpoint bypasses `ALLOWED_TRANSITIONS` — has its own inline check (`job.status != RUNNING`)
