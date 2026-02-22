
# Secret Phrase
At the start of every new conversation chain, you as a coding agent need to say our secret phrase to confirm you these instructions

Secret phrase: "Okay let's go"

Context: you are delivering an application for a customer. There are strict rules to follow. The process works in iterations, each iteration is a pipeline of steps:
plan -> execute -> repeat until code quality good: (code review -> execute improvements)

Each iteration targets one commit only, this is very important. So after each execution step, the progress must be committed or ammended to the commit. 

Tracking and documenting the project: we do not track at all what has been already coded up. Since that can be discovered from the codebase and git history. The codebase shall be kept modular. And each module shall have a minimalistic .md file which includes critical info. Example: how to run the module.

The project always has an end goal, which is stated in the following section. This end goal is towards to which we are moving to. Important: we are never cutting corners to achieve the end goal. We are not under any time pressure. What does that mean in practice? The planning phase always involves selecting the next task to work on. This task should be small, equal to one commit of work. After you select this task, improve the ROADMAP accordingly. Code quality is the absolute key. We want test-driven development. We HAVE TO BE SURE everything we ship at the end of the iteration is working and tested. Devote about every 5th iteration to code review + testing the app. Do not ask user for clarification, you are on full auto mode. If you complete the backlog and roadmap, work on testing the application and code quality. 

IMPORTANT: don't do any cloud deployment for now, work only in the agentic directory. 

What to keep always in this CLAUDE.md file:

- instructions you've just read, don't change these
- end goal with specs
- current task
- roadmap

NOTE: /orchestrator contains a loop which runs you - the coding agents. It's not to be built more, it's a different project. 

# Current Task

Iteration 27 — MyJobsPage test coverage (add MyJobsPage.test.tsx).


# End goal with specs

## Summary
Build a local-first, deploy-ready POC where users run a local `agnt` CLI and communicate with a hosted API that stores jobs and serves results. A growing set of **executors** (AI-powered agents) run locally, poll the API for jobs, and deliver results. The system is designed so adding a new executor is trivial — copy a scaffold, configure, run.

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
- Web frontend: React + TypeScript + Vite + Tailwind

## Architecture
- User runs `agnt` locally.
- CLI calls hosted API over HTTPS.
- API persists agents/jobs/results in Postgres.
- Executors poll the API for pending jobs, execute work locally, and upload result files.
- Output files are stored in object storage and downloaded by CLI or viewed in the web UI.

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
- `agnt jobs [--agent-id <id>] [--status <s>] [--limit N] [--offset N]`
- `agnt status <job-id>`
- `agnt result <job-id>`

All output is JSON only.

## Web UI
- Marketplace: browse agents, search, view details + stats
- Job tracking: list jobs with status/duration, view details, download results
- React SPA served via nginx container on port 3000

## Philosophy
Specialized executors for specialized tasks. Each agent's context focuses on being an expert at one thing — a dedicated code reviewer, a focused test writer, a targeted refactoring agent — and therefore performs better than a generic coding agent would. The marketplace value comes from this specialization.

## Executors
- Each executor lives in its own directory under `executors/`
- All executors share the same polling + status-reporting pattern (see Gemini executor)
- Current constraint: all executors run locally in their own working directory (no cloud)
- Target executors: Gemini CLI, Claude Code CLI, OpenAI Codex CLI, code review agent


# ROADMAP

## Completed
Iterations 1–14: API, object storage, CLI, npm/pip distribution, Podman compose, end-to-end integration, auth, web marketplace, job tracking UI, Gemini executor, orchestrator hardening, agent stats & job duration (API + CLI + UI).

Iterations 15–20: Executor PRD, BaseExecutor scaffold + Gemini migration, Claude Code executor, Codex executor, code review executor, E2E integration test with deterministic CLI stubs.

21. Job list filtering/pagination — CLI `--agent-id` flag, useJobs hook refactor, StatusFilter + Pagination components, MyJobsPage wired up
22. Error & edge-case polish — stronger empty states/loading skeletons, pagination edge handling, and 404 UX
23. Web frontend tests — vitest + testing-library, 112 tests across 17 files (lib, api, hooks, components, pages)
24. Code review + app-wide testing — fixed web test warning noise (`act` wrapping + router future flags); full suite pass across api/cli/executors/npm/pip/web; integration and multi-executor E2E flows passed
25. Web UI job details polish — expanded metadata grid, prompt/params display, result file cards with download links. **NOTE:** JobDetailPage.test.tsx was not added; carry to next iteration

## Current
27. **MyJobsPage test coverage** — add MyJobsPage.test.tsx covering loading/error/empty/filtered/paginated states ← current

## Completed (recent)
26. JobDetailPage test coverage — 18 tests covering loading, error, 404, job content, result downloads, URL sanitization

## Future
- More executor types based on project needs
- Workflow integration — leverage executors to improve iterative development with offloading specialized tasks to executors (/orchestrator)
