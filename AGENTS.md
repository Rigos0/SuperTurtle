
# Secret Phrase
At the start of every new conversation chain, you as a coding agent need to say our secret phrase to confirm you these instructions

Secret phrase: "Okay let's go"

Context: you are delivering an application for a customer. There are strict rules to follow. The process works in iterations, each iteration is a pipeline of steps:
plan -> execute -> repeat until code quality good: (code review -> execute improvements)

Each iteration targets one commit only, this is very important. So after each execution step, the progress must be committed or ammended to the commit. 

Tracking and documenting the project: we do not track at all what has been already coded up. Since that can be discovered from the codebase and git history. The codebase shall be kept modular. And each module shall have a minimalistic .md file which includes critical info. Example: how to run the module.

The project always has an end goal, which is stated in the following section. This end goal is towards to which we are moving to. Important: we are never cutting corners to achieve the end goal. We are not under any time pressure. What does that mean in practice? The planning phase always involves selecting the next task to work on. This task should be small, equal to one commit of work. After you select this task, improve the ROADMAP accordingly. 


What to keep always in this CLAUDE.md file:

- instructions you've just read, don't change these
- end goal with specs
- current task
- roadmap



# Current Task

Validate end-to-end flow: run `make integration` against the live stack, fix any issues found.


# End goal with specs

## Summary
Build a local-first, deploy-ready POC where users run a local `agnt` CLI and communicate with a hosted API that stores jobs and serves results.
The CLI is distributed primarily via npm and secondarily via pip, both using the same compiled Go binary.

## Stack
- CLI core: Go
- npm distribution: JavaScript wrapper package for Go binary
- pip distribution: Python wrapper package for Go binary
- API: FastAPI (Python)
- Database: Postgres
- Object storage: MinIO locally, S3-compatible bucket in deployment
- Local orchestration: Podman + `podman-compose`
- Migrations: Alembic

## Architecture
- User runs `agnt` locally.
- CLI calls hosted API over HTTPS.
- API persists agents/jobs/results in Postgres.
- Third-party executors pull pending jobs and report accept/reject/progress/completion.
- Output files are stored in object storage and downloaded by CLI via API result responses.

## API Surface

### Buyer-facing endpoints
- `GET /v1/agents/search`
- `GET /v1/agents/{agent_id}`
- `POST /v1/jobs`
- `GET /v1/jobs`
- `GET /v1/jobs/{job_id}`
- `GET /v1/jobs/{job_id}/result`

### Executor-facing endpoints
- `GET /v1/executor/jobs?agent_id=...&status=pending`
- `POST /v1/executor/jobs/{job_id}/status`
- `POST /v1/executor/jobs/{job_id}/complete`

## Job Lifecycle
- `pending -> accepted|rejected`
- `accepted -> running -> completed|failed`
- `rejected` is terminal
- `failed` is terminal
- `completed` is terminal

## Data Model
- `agents`: id, name, description, tags, pricing, input_schema, output_schema, metadata timestamps
- `jobs`: id, agent_id, prompt, params_json, status, progress, decision_reason, created_at, started_at, updated_at, completed_at
- `job_results`: job_id, files_json (paths, sizes, mime), created_at

## CLI Scope (POC)
- `agnt search <query>`
- `agnt info <agent-id>`
- `agnt order <agent-id> --prompt <text> [--param key=value]`
- `agnt jobs`
- `agnt status <job-id>`
- `agnt result <job-id>`

All output is JSON only.


# ROADMAP

1. **API** — complete all buyer-facing and executor-facing endpoints with tests
2. **Object storage** — MinIO locally, S3-compatible in deployment; wire into job results
3. **CLI** — Go binary implementing all `agnt` commands, JSON output
4. **Distribution** — npm wrapper complete; pip wrapper package for the Go binary in progress
5. **Local orchestration** — Podman compose for full-stack local dev (API + Postgres + MinIO)
6. **Integration** — end-to-end flow: CLI → API → executor → result download


# BACKLOG

Near-term tasks to chip away at, roughly in order:

- [x] Add buyer-facing agent endpoints (search, detail)
- [x] Add buyer-facing job endpoints (list, detail)
- [x] Object storage setup (MinIO container, S3 client in API)
- [x] Wire file upload into job completion endpoint
- [x] Wire file download into job result endpoint
- [x] Go CLI scaffold (module init, cobra setup, config)
- [x] CLI HTTP client (`cli/internal/api/`) + `search` and `info` commands
- [x] CLI `order` command
- [x] CLI `jobs` and `status` commands
- [x] CLI `result` command (download files)
- [x] npm distribution package (JS wrapper for Go binary)
- [x] pip distribution package (Python wrapper for Go binary)
- [x] Local orchestration: API Dockerfile + compose + Makefile targets
- [x] Seed data: sample agents for local dev/testing
- [x] Fix presigned URLs for host access (`S3_PUBLIC_URL` config rewrite)
- [x] Integration: end-to-end script, Makefile target, and docs (`scripts/`)
- [x] Code review polish: S3 URL caching, test coverage, integration script hardening
- [x] Validate end-to-end flow: run `make integration` against the live stack ← current
