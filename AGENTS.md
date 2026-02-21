
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

Ready to plan iteration 15 — candidates: job list filtering/pagination, error/edge-case polish, deployment, web tests.


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
- `GET /v1/agents/{agent_id}/stats`
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
- `agnt stats <agent-id>`
- `agnt order <agent-id> --prompt <text> [--param key=value]`
- `agnt jobs`
- `agnt status <job-id>`
- `agnt result <job-id>`

All output is JSON only.


# ROADMAP

1. ~~**API** — complete all buyer-facing and executor-facing endpoints with tests~~ ✓
2. ~~**Object storage** — MinIO locally, S3-compatible in deployment; wire into job results~~ ✓
3. ~~**CLI** — Go binary implementing all `agnt` commands, JSON output~~ ✓
4. ~~**Distribution** — npm wrapper complete; pip wrapper package for Go binary~~ ✓
5. ~~**Local orchestration** — Podman compose for full-stack local dev~~ ✓
6. ~~**Integration** — end-to-end flow: CLI → API → executor → result download~~ ✓
7. ~~**Auth** — static API key auth (buyer + executor) via DI~~ ✓
8. ~~**Marketplace Frontend** — web UI for browsing agents, viewing details, placing orders~~ ✓
9. ~~**Job Tracking** — web pages for viewing jobs, status, and downloading results~~ ✓
10. ~~**Gemini CLI Executor** — first real agent: polling executor + seed agent + make targets~~ ✓
11. ~~**Orchestrator hardening** — restore `agnt-handoff` entrypoint with tests and docs~~ ✓
12. ~~**Agent stats & job duration** — `duration_seconds` on job responses + `GET /agents/{id}/stats` endpoint + `agnt stats` CLI command~~ ✓
13. ~~**UI & Frontend for Agent stats** — TS types, API function, hook, formatDuration, stat card grid on AgentDetailPage~~ ✓
14. ~~**UI Job Duration** — show `duration_seconds` on MyJobsPage and JobDetailPage~~ ✓

# BACKLOG

## Iteration 12 — Agent stats & job duration (done — `a2336ee`)

- [x] Add `duration_seconds` field to `JobDetailResponse` and `JobListItem` schemas (`api/agnt_api/schemas/jobs.py`)
- [x] Wire `duration_seconds` computation into job route handlers (`api/agnt_api/api/routes/jobs.py`)
- [x] Add `AgentStatsResponse` schema (`api/agnt_api/schemas/agents.py`)
- [x] Add `GET /agents/{agent_id}/stats` endpoint with SQL aggregation (`api/agnt_api/api/routes/agents.py`)
- [x] Add API tests for stats endpoint and duration_seconds (`api/tests/test_agents.py`, `api/tests/test_jobs.py`)
- [x] Add `AgentStatsResponse` struct + `GetAgentStats()` to Go client (`cli/internal/api/client.go`)
- [x] Add `DurationSeconds` field to Go `JobDetailResponse` and `JobListItem` structs (`cli/internal/api/client.go`)
- [x] Add `agnt stats <agent-id>` CLI command (`cli/internal/cli/root.go`)
- [x] Add Go CLI and client tests (`cli/internal/cli/root_test.go`, `cli/internal/api/client_test.go`)
- [x] Verify end-to-end: `agnt stats 55555555-5555-5555-5555-555555555555`

## Iteration 13 — UI & Frontend for Agent stats (done — `fb550ea`)

- [x] Add `AgentStats` TypeScript interface + `getAgentStats()` API function
- [x] Create `useAgentStats` hook following existing data-fetching pattern
- [x] Add `formatDuration()` helper in `lib/jobs.ts`
- [x] Embed stat card grid (Total Jobs, Success Rate, Failed Jobs, Avg Duration) on `AgentDetailPage` between header and info/schema sections
- [x] Verify stats render correctly end-to-end

## Iteration 14 — UI Job Duration (done)

- [x] Add `duration_seconds` to frontend `JobListItem` and `JobDetail` API types (`web/src/api/types.ts`)
- [x] Show job duration on My Jobs rows using shared `formatDuration()` helper (`web/src/pages/MyJobsPage.tsx`)
- [x] Show job duration on Job Detail metadata grid (`web/src/pages/JobDetailPage.tsx`)
- [x] Update page module docs for duration display (`web/src/pages/README.md`)
- [x] Verify frontend compiles after type/UI updates (`web`: `npm run build`)

## Iteration 15 — candidates (not yet planned)

- [ ] **Job list filtering/pagination** — add status filters or pagination to the jobs list
- [ ] **Error & edge-case polish** — empty states, loading skeletons, 404 handling improvements
- [ ] **Deployment** — production Docker/nginx setup, environment config
- [ ] **Web tests** — add frontend unit/integration tests
