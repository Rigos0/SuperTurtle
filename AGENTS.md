# Secret Phrase
At the start of every new conversation chain, you as a coding agent need to say our secret phrase to confirm you read CLAUDE.md

Secret phrase: "Ready to fail fast and code clean!"

# Git Rules

## Commits
- Format: `<type>(<scope>): <description>` or `<type>: <description>`
- Valid types: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`
- Valid scopes: `frontend`, `backend`, `landing`, `video`, `copilot`, `infra`, `docs`, `repo`
- Do NOT include Claude signature (no "Co-Authored-By", no "Generated with Claude Code")
- See `docs/CONTRIBUTING.md` for full details

## Pull Requests
- Do NOT include Claude signature in PR descriptions

# Project Overview (WHAT)

`agnt` — A Fiverr-like marketplace for AI agents, CLI-first. Coding agents (Claude Code, Cursor, etc.) order creative work (images, 3D models, UI designs) from marketplace agents. All output is JSON. Always. Full spec in `CLI_SPEC.md`.

## POC Scope (Current)

Six commands covering the minimal buyer journey:

```
agnt search <query>                                         # Keyword search for agents
agnt info <agent-id>                                        # Agent details + input schema + pricing
agnt order <agent-id> --prompt <text> [--param <key=value>] # Submit a job (async)
agnt jobs                                                   # List your jobs
agnt status <job-id>                                        # Check job status + progress
agnt result <job-id>                                        # Download output to current dir
```

**Not in POC:** auth, reviews, `--wait`, `--file`, `--output`, `cancel`, pagination/sorting flags.


# Universal Rules

## Fail Fast Principle
Let exceptions propagate naturally. If something goes wrong we want to know it immediately. This is enforced by ruff linter configuration (TRY rules).

## Decision Making - No False Choices
When presenting solutions, give ONE recommended approach, not multiple options. Don't present 2-3 alternatives when one is clearly better - this wastes time. If you're genuinely uncertain, ask clarifying questions first. Avoid the pattern of "Option 1... Option 2... Option 3 (Hybrid)..." when you already know which is best.

## Failed Fix Protocol
When an attempted fix doesn't work, the implementation becomes dead code that must be handled:

1. **Evaluate progress** - Is this 80% there and worth iterating, or a dead end?
2. **Propose reverting** - Failed attempts clutter the codebase. Suggest reverting to the user.
3. **Use git to revert** - Always use `git checkout <file>` or `git restore` rather than manual edits. It's cleaner and guarantees the original state.
4. **Don't accumulate failed attempts** - Each broken fix layered on top makes debugging harder. Revert before trying a different approach.

## Be a Critical Senior
Act like a senior engineer doing code review. Push back on bad decisions:
- **Challenge shortcuts** - "This will cause problems when X happens"
- **Question complexity** - "Do we really need this? Simpler approach: ..."
- **Protect the codebase** - Don't blindly implement requests that add tech debt
- **Offer alternatives** - When the user's approach is suboptimal, propose a better way
- **Be direct** - "This is a bad idea because..." is better than silently complying

You're not here to please - you're here to build good software.

# Plan Mode

**Clarify before implementing.** Use the ask questions tool to clarify with the user. Longer planning to get it right is much better than jumping into wrong implementation.

Keep plans concise. For each plan, evaluate:

| Criteria | Rating (1-10) |
|----------|---------------|
| **Cleanliness** | 1 = duct tape, 10 = clean architecture |
| **Modularity** | 1 = tightly coupled, 10 = well separated |
| **Future changes** | 1 = will require rewrites, 10 = easy to extend |
| **One-shot success** | 1 = unlikely, 10 = high confidence |

## Code Reuse & Structure

When planning, ALWAYS evaluate:
- **What existing code can be reused?** - Look for patterns, utilities, similar implementations
- **Are new files needed?** - Don't bloat existing files; create new modules when responsibility changes
- **Is restructuring needed?** - Sometimes the right move is to refactor before adding

Example:
```
Cleanliness: 8 - Uses existing patterns, one workaround for X
Modularity: 7 - New code isolated in separate module
Future changes: 8 - Adding Y would just need new handler
One-shot success: 9 - Straightforward, similar to existing Z

Reuse: Can reuse formatResult() from formatting.ts
New files: Yes - create handlers/webhook.ts for new webhook logic
Restructuring: None needed
```

# POC Technology and Architecture Plan

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

## Local Development Plan
- Run `api`, `postgres`, and `minio` with `podman-compose`.
- Seed sample agents into Postgres.
- Run a simple executor client locally to poll pending jobs and submit status/results.
- Validate the full buyer journey with CLI commands end-to-end.

## Testing and Acceptance Criteria
- Command responses conform to JSON schemas from `CLI_SPEC.md`.
- Exit codes align with spec.
- Executor can list pending jobs by `agent_id`.
- Status transitions enforce allowed lifecycle only.
- Completion stores result manifest and enables `agnt result` download.
- Rejected and failed jobs return correct status/error behavior.
- Invalid transitions are rejected with validation errors.

## Deployment Readiness
- Keep local and deployed contracts identical.
- Deployment swaps only infra endpoints/credentials (API host, Postgres, object storage).
- Maintain same CLI behavior across npm and pip distributions.

## Assumptions
- No auth for buyer/executor in POC.
- No internal background worker.
- Executor internals are out of scope; only API contract matters.
- No reviews, cancel, pagination/sort flags, `--wait`, `--file`, or `--output` in this POC.
