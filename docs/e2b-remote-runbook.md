# E2B Remote Runbook Research

Date checked: 2026-02-27

## Scope

Research current, official E2B capabilities for:
- Persistent sandboxes
- Pause/resume lifecycle
- Template strategy for Codex and Claude Code
- API/CLI surfaces we can use for `super_turtle/e2b/*` scripts

## Official sources

- E2B sandbox persistence docs: https://e2b.dev/docs/sandbox/persistence
- E2B JS SDK reference (`Sandbox`): https://e2b.dev/docs/sdk-reference/js-sdk/v2.3.4/sandbox
- E2B sandbox lifecycle overview: https://e2b.dev/docs/sandbox
- E2B CLI overview: https://e2b.dev/docs/cli
- E2B CLI list sandboxes: https://e2b.dev/docs/cli/list-sandboxes
- E2B CLI create sandbox: https://e2b.dev/docs/cli/create-sandbox
- E2B CLI connect to sandbox: https://e2b.dev/docs/cli/connect-to-sandbox
- E2B CLI execute command: https://e2b.dev/docs/cli/exec-command
- E2B CLI shutdown sandboxes: https://e2b.dev/docs/cli/shutdown-sandboxes
- E2B lifecycle events API: https://e2b.dev/docs/sandbox/lifecycle-events-api
- E2B templates quickstart: https://e2b.dev/docs/template/quickstart
- E2B template start/ready commands: https://e2b.dev/docs/template/start-ready-command
- E2B Codex sandbox guide: https://e2b.dev/docs/agents/codex
- E2B Claude Code sandbox guide: https://e2b.dev/docs/agents/claude-code
- E2B API key docs: https://e2b.dev/docs/api-key

## Findings

### 1. Persistence and pause/resume are available now (beta)

From E2B persistence docs:
- Persistence is public beta.
- Pause preserves filesystem and memory state, including running processes.
- State model is `running -> paused -> running` and terminal `killed`.
- Resume is done through `connect` (resume-on-connect behavior).
- Paused sandboxes can stay paused until explicitly resumed or killed.
- Pausing drops external client connections; clients must reconnect on resume.
- Continuous runtime limits apply while running (Base/Pro tiers), and reset after pause/resume.

Implementation meaning for Super Turtle:
- We can safely implement `pause`/`resume` as first-class controls for long-running work.
- We must treat reconnect as mandatory for long-lived sockets/streams after resume.

### 2. SDK has the lifecycle primitives we need

Relevant JS SDK surfaces:
- `Sandbox.create(...)` for normal creation.
- `Sandbox.betaCreate(...)` with `autoPause` support.
- `Sandbox.connect(sandboxId, ...)` for resume/reconnect.
- `Sandbox.betaPause(...)` for pausing.
- `Sandbox.kill(...)` for hard stop.
- `Sandbox.list({ query: { state: [...] } })` for state-aware discovery.

Also documented:
- `connect` resets timeout to default unless custom timeout is passed.

Implementation meaning for Super Turtle:
- State file should always persist `sandboxId` and last known timeout intent.
- `resume` should call connect with explicit timeout to avoid unintentional short TTLs.

### 3. CLI supports scriptable lifecycle management

Current docs expose sandbox CLI commands for:
- list (`e2b sandbox list`, including `--state` and JSON output)
- create (`e2b sandbox create <template>`)
- connect (`e2b sandbox connect <sandbox-id>`)
- exec (`e2b sandbox exec ...`, including `--background`)
- kill/shutdown (`e2b sandbox kill ...`, including `--all` and filters)

Implementation meaning for Super Turtle:
- `super_turtle/e2b/*.sh` can be shell-first with no extra runtime dependency.
- We can use `exec --background` for remote bot/run-loop bootstrapping.
- `status` can be built from list output + locally persisted `.state.json`.

### 4. Codex and Claude templates exist as first-party E2B guides

From E2B “Agents in sandbox” docs:
- Prebuilt template names are documented for both `codex` and `claude`.
- Codex headless pattern uses `codex exec` with automation flags and `CODEX_API_KEY`.
- Claude headless pattern uses `claude -p --dangerously-skip-permissions` and `ANTHROPIC_API_KEY`.
- Both guides show extending via `Template().fromTemplate('codex'|'claude')` + `Template.build(...)`.

Implementation meaning for Super Turtle:
- We can start with first-party templates for bootstrap speed.
- We should support a user-overridable template in local state/config.
- Entrypoint parity requirements are clear for remote headless runs:
  - Codex: `codex` binary + `CODEX_API_KEY` when API-key auth is used.
  - Claude: `claude` binary + `ANTHROPIC_API_KEY` (or authenticated CLI flow).

### 5. Template readiness controls can reduce remote boot noise

From template docs:
- `start` and `ready` commands are supported in template definitions.
- Readiness checks gate when a template snapshot is considered ready.

Implementation meaning for Super Turtle:
- For stable remote starts, a custom template can preinstall dependencies and prewarm runtime services, then publish a readiness gate.
- This is useful if `up` currently spends too long in first-run dependency installation.

## Recommended design constraints for upcoming implementation tasks

- Treat pause/resume as explicit state transitions, not process stop/start hacks.
- Always persist and reuse `sandboxId` locally to avoid accidental duplicate sandboxes.
- Make timeout explicit on resume/connect.
- Prefer idempotent command behavior:
  - `status` should succeed even with missing/partial local state.
  - `pause`, `resume`, `stop` should be safe when sandbox is already in target state.
- Keep template configurable; default to one known-good template per selected driver.

## Notes for backlog item sequencing

This research supports the next items directly:
1. `remote.sh` command router can map to documented E2B lifecycle operations.
2. `state.sh` can store enough metadata for safe resume and stale-state recovery.
3. `up.sh` can begin with first-party templates, then evolve to custom templates if startup cost is too high.
4. `reconcile-cron.sh` must account for disconnected windows during pause.
