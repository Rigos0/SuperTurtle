# SubTurtle Spawn UX Design

## 1. Proposed Flow (Before vs After)

### Scope of this section
Design the end-to-end flow from "user asks to build X" to "SubTurtle is running and supervised by cron."

### Side-by-side flow

| Step | Before (current) | After (proposed) |
| --- | --- | --- |
| 1 | User asks meta agent to build something. | User asks meta agent to build something. |
| 2 | Meta agent decides to delegate and picks SubTurtle name/type. | Meta agent decides to delegate and prepares SubTurtle task state (`CLAUDE.md` content). |
| 3 | Meta agent runs `mkdir -p .subturtles/<name>/`. | Meta agent requests type choice via Telegram buttons (`ask_user`): `yolo`, `yolo-codex`, `slow` (recommended option indicated in text). |
| 4 | Meta agent writes `.subturtles/<name>/CLAUDE.md` manually. | User taps a type button. |
| 5 | Meta agent runs `ln -sf CLAUDE.md .subturtles/<name>/AGENTS.md`. | Meta agent runs one command through `ctl` (`spawn`) with selected type + task state input. |
| 6 | Meta agent runs `./super_turtle/subturtle/ctl start <name> --type <type> --timeout <duration>`. | `ctl` atomically creates workspace, writes state, links `AGENTS.md`, starts SubTurtle, registers recurring cron, and returns summary. |
| 7 | Meta agent opens `cron-jobs.json`, appends recurring supervision job, writes file back. | Meta agent confirms spawn to user using returned summary fields. |
| 8 | Meta agent confirms spawn to user. | Cron fires later and supervision is already active (auto-registered). |
| 9 | Cron fires later and starts supervision loop. | Removed as manual step (covered by step 8 automation). |

### Before/after delta

- Manual spawning work drops from multiple shell/file-edit steps to one command invocation.
- Cron supervision becomes part of spawn success criteria, not a separate manual follow-up.
- Type choice becomes explicit and user-controlled via inline buttons.
- Failure mode improves: if spawn fails, no partial "running without cron" or "cron without running process" state.

### Sequence summary

`User request` -> `meta creates task spec` -> `user selects type` -> `ctl spawn` -> `subturtle running + cron scheduled` -> `meta confirms`.

---

## 2. `ctl spawn` Command

### Command shape

```bash
./super_turtle/subturtle/ctl spawn <name> [options]
```

`spawn` is the high-level "one-shot" entry point. It replaces manual mkdir/write/link/start/cron-edit steps with one command.

### Flags and defaults

| Flag | Meaning | Default |
| --- | --- | --- |
| `--type <slow|yolo|yolo-codex>` | SubTurtle loop type | `slow` |
| `--timeout <duration>` | Runtime timeout (`30m`, `1h`, `2h`, etc.) | `1h` |
| `--skill <name>` (repeatable) | Skills passed through to runtime | none |
| `--state-file <path>` | Read CLAUDE.md content from file (`-` means stdin) | unset |
| `--state-stdin` | Force state read from stdin | unset |
| `--cron-interval <duration>` | Recurring supervision interval | `5m` |
| `--cron-jobs-file <path>` | Cron store path | `super_turtle/claude-telegram-bot/cron-jobs.json` |
| `--cron-prompt-template <text>` | Prompt template with `{name}` placeholder | built-in template |
| `--json` | Emit machine-readable JSON summary | `false` |

### State input (stdin/file) behavior

`ctl spawn` must always receive CLAUDE.md content from either stdin or a file.

1. If `--state-file <path>` is set (and not `-`), read that file.
2. If `--state-file -` or `--state-stdin` is set, read stdin.
3. If no state flag is set but stdin is piped, read stdin automatically.
4. If no state source is available, fail with a clear error.
5. If both `--state-file <path>` and `--state-stdin` are passed, fail as ambiguous.
6. Empty state content fails validation.

### Spawn behavior (single command contract)

On success, `ctl spawn` does all of this:

1. Creates `.subturtles/<name>/` if missing.
2. Writes `.subturtles/<name>/CLAUDE.md` from input content.
3. Creates/refreshes `.subturtles/<name>/AGENTS.md -> CLAUDE.md` symlink.
4. Starts the SubTurtle process (equivalent runtime semantics to current `ctl start`).
5. Appends a recurring supervision job to `cron-jobs.json`.
6. Prints a summary (human or JSON).

Failure handling is atomic from the caller's perspective:

- If start fails, no cron job is written.
- If cron registration fails after start, `ctl spawn` stops the just-started SubTurtle and returns error.
- Workspace files may remain for debugging, but there is no "running without cron" success state.

### Output format

Default human output:

```text
[subturtle:spawn-ux] spawned as yolo-codex (PID 12345)
[subturtle:spawn-ux] workspace: .subturtles/spawn-ux
[subturtle:spawn-ux] timeout: 1h
[subturtle:spawn-ux] cron: recurring every 5m (job e7f8a9)
```

`--json` output:

```json
{
  "ok": true,
  "name": "spawn-ux",
  "type": "yolo-codex",
  "timeout": "1h",
  "timeout_seconds": 3600,
  "skills": [],
  "workspace": ".subturtles/spawn-ux",
  "state_file": ".subturtles/spawn-ux/CLAUDE.md",
  "agents_file": ".subturtles/spawn-ux/AGENTS.md",
  "pid": 12345,
  "log_file": ".subturtles/spawn-ux/subturtle.log",
  "cron": {
    "id": "e7f8a9",
    "interval_ms": 300000,
    "jobs_file": "super_turtle/claude-telegram-bot/cron-jobs.json"
  }
}
```

On failure with `--json`, return `{ "ok": false, "stage": "<validate|start|cron>", "error": "..." }` and non-zero exit code.

### Example invocations

Pipe state from meta agent:

```bash
cat /tmp/new-task.md | ./super_turtle/subturtle/ctl spawn spawn-ux --type yolo-codex --timeout 2h
```

Read state file directly:

```bash
./super_turtle/subturtle/ctl spawn spawn-ux --state-file /tmp/new-task.md --type slow --cron-interval 10m --json
```

---

## 3. Telegram Button Flow (Type Selection)

### Decision rule: when to show buttons

Default policy: show type-selection buttons for every new SubTurtle spawn. This keeps control explicit and aligns with the requirement that the user has final say.

Exception: allow "Quick spawn" only when all of these are true:

1. Task urgency is high and waiting for a click is materially slower (for example, user explicitly says "start now").
2. The meta agent has a strong default recommendation from heuristics.
3. The user has previously opted into quick mode (session-level preference).

If exception conditions are not met, always show buttons.

### Button set and wording

Use exactly three options mapped to runtime types:

- `yolo-codex` (fastest + cheapest for straightforward coding)
- `yolo` (fast for normal coding)
- `slow` (most thorough for complex/risky work)

Because `ask_user` currently supports string options only (no separate description fields, see `ask_user_mcp/server.ts` input schema), encode short guidance in the option labels and question text.

Recommended question template:

```text
I can delegate this to a SubTurtle. Pick execution mode (recommended: {recommended_type}):
```

Recommended option labels:

- `yolo-codex - fastest, lowest cost`
- `yolo - fast balanced`
- `slow - deepest review`

When one type is recommended, prefix that option with `[recommended]` in the options list so recommendation is visible without changing semantics.

### Interaction sequence

1. Meta agent drafts task state (`CLAUDE.md` content) and computes `recommended_type`.
2. Meta agent calls `ask_user` with question + 3 buttons.
3. Meta agent ends turn immediately (required by `ask_user` contract).
4. User taps a button; selected label comes back as the next user message.
5. Meta agent parses selected label to canonical type (`yolo-codex`, `yolo`, `slow`).
6. Meta agent runs `ctl spawn <name> --type <selected>` with prepared state input.
7. Meta agent posts spawn confirmation using `ctl` summary.

### Parsing and robustness rules

- Parsing should be prefix-based and case-insensitive so decorated labels still map correctly:
  - `[recommended] yolo-codex ...` -> `yolo-codex`
  - `yolo ...` -> `yolo`
  - `slow ...` -> `slow`
- If response cannot be parsed (unexpected free text), fall back to a two-step retry:
  - Show buttons again once with a short clarification.
  - If still ambiguous, use `recommended_type` and state that fallback was used.

### Quick spawn mode

Quick spawn is an explicit optimization mode, not the default behavior.

- Trigger: user says equivalent of "quick spawn" / "don't ask mode" / "always use defaults for now".
- Behavior: skip `ask_user`, use `recommended_type`, and immediately run `ctl spawn`.
- Confirmation message must include:
  - chosen type
  - that quick mode bypassed buttons
  - one-tap way to re-enable prompts (for example: "say 'prompt me for type' anytime")
- Scope: session-local only (do not persist across unrelated future sessions unless a persistent preference system is introduced).

---

## 4. Cron Auto-Registration and Cleanup

### Goal

`ctl spawn` must make supervision automatic and safe by ensuring:

1. A recurring check-in job is created as part of spawn success.
2. The created job is traceable to the SubTurtle.
3. `ctl stop` removes that recurring job so stale wake-ups do not accumulate.

### Cron job payload written by `ctl spawn`

`ctl spawn` appends one recurring job object to `super_turtle/claude-telegram-bot/cron-jobs.json`:

```json
{
  "id": "e7f8a9",
  "prompt": "Check SubTurtle spawn-ux: run `./super_turtle/subturtle/ctl status spawn-ux`, inspect `.subturtles/spawn-ux/CLAUDE.md`, and review `git log --oneline -10`. If backlog is complete, stop SubTurtle spawn-ux and report shipped work. If stuck/off-track, stop it, diagnose, and restart with corrected state. If progressing, let it run.",
  "type": "recurring",
  "fire_at": 1772014983135,
  "interval_ms": 300000,
  "created_at": "2026-02-25T10:00:00Z"
}
```

Notes:

- `chat_id` is omitted; bot runtime defaults it at fire time.
- `id` uses 6 lowercase hex chars for parity with existing manual workflow.
- `fire_at` is computed as `now + interval_ms`.

### Prompt template

Default template (internal constant in `ctl`), parameterized by `{name}`:

```text
Check SubTurtle {name}: run `./super_turtle/subturtle/ctl status {name}`, inspect `.subturtles/{name}/CLAUDE.md`, and review `git log --oneline -10`. If backlog is complete, stop SubTurtle {name} and report shipped work. If stuck/off-track, stop it, diagnose, and restart with corrected state. If progressing, let it run.
```

`--cron-prompt-template` allows override, with required `{name}` token. If missing, `ctl spawn` fails validation to avoid ambiguous prompts.

### Interval defaults and overrides

- Default interval: `5m` (`300000` ms).
- Override via `--cron-interval <duration>` (same duration parser as timeout flags).
- Validation rules:
  - minimum `1m`
  - maximum `24h`
  - non-recurring intervals are rejected (spawn supervision is always recurring)

### State linkage for cleanup

After writing cron job successfully, `ctl spawn` stores linkage in `.subturtles/<name>/subturtle.meta`:

```text
CRON_JOB_ID=e7f8a9
CRON_INTERVAL_MS=300000
CRON_JOBS_FILE=super_turtle/claude-telegram-bot/cron-jobs.json
```

This gives `ctl stop` deterministic cleanup without fuzzy matching.

### Cleanup behavior in `ctl stop`

`ctl stop <name>` is extended to:

1. Read `CRON_JOB_ID` from meta.
2. Remove that job from cron store if present.
3. Continue stop flow even if cron removal fails (process stop is higher priority), but print warning.

Idempotency rules:

- If job is already missing, stop still succeeds.
- Repeated `ctl stop` calls remain safe.

### Timeout and crash cleanup

Primary cleanup path is `ctl stop`, but watchdog timeouts can bypass manual stops. To prevent orphan recurring jobs:

- Add `ctl cron-cleanup <name>` helper (non-interactive; removes `CRON_JOB_ID` job if present).
- Watchdog timeout path calls `ctl cron-cleanup <name>` before deleting meta/PID files.

If watchdog cannot run cleanup (rare hard kill), next meta-agent check-in sees dead SubTurtle and invokes `ctl stop <name>` once, which performs the same cron cleanup.

### Duplicate and conflict handling

Before appending a job, `ctl spawn` checks for an existing recurring job linked to the same SubTurtle:

- match by `CRON_JOB_ID` if meta exists
- fallback match by canonical prompt prefix: `Check SubTurtle <name>:`

Behavior:

- If existing job is found, `ctl spawn` updates its `interval_ms`, `fire_at`, and `prompt` instead of creating a duplicate.
- If no job exists, create new one.

This avoids duplicate supervision loops across restart cycles.

---

## 5. Meta Agent Behavior Changes (`META_SHARED.md`)

### Behavioral shift

Current meta instructions require manual multi-step spawn (`mkdir`, write state, symlink, `ctl start`, edit cron file).  
New instructions should treat spawn as a single high-level action through `ctl spawn`, with user type selection handled by `ask_user` unless quick mode is active.

### What the meta agent does differently

Old behavior:

- choose type internally
- run manual workspace/file setup commands
- run `ctl start`
- manually append recurring cron job

New behavior:

1. Draft SubTurtle state content (`CLAUDE.md`) for `.subturtles/<name>/CLAUDE.md`.
2. Choose a `recommended_type` using existing heuristics.
3. If quick mode is off, call `ask_user` with 3 type buttons and end turn.
4. Parse returned button choice into canonical type.
5. Call one command:
   ```bash
   ./super_turtle/subturtle/ctl spawn <name> --type <selected_type> [--timeout DURATION]
   ```
   passing state via stdin or `--state-file`.
6. Report concise spawn summary to the user (name, type, timeout, cron interval).

The meta agent no longer edits `cron-jobs.json` directly during normal spawn flow.

### Type-selection policy in meta instructions

Add explicit policy text:

- Default: always prompt the user with buttons (`yolo-codex`, `yolo`, `slow`) before spawn.
- Include a recommendation in prompt text (for example: "recommended: yolo-codex").
- Quick mode exception: skip buttons only when user opted in and urgency is high/explicit.
- If selection parsing fails, re-prompt once; then fall back to `recommended_type` and disclose fallback.

### Proposed replacement for "Starting new work" section

Replace the current numbered workflow with:

1. Ask what the user wants to build and why.
2. Update root `CLAUDE.md` with project-level state.
3. Prepare SubTurtle task state content (future `.subturtles/<name>/CLAUDE.md`).
4. Determine `recommended_type` (`slow`, `yolo`, or `yolo-codex`).
5. If quick mode is not active, present Telegram type buttons via `ask_user` and wait for selection.
6. Spawn via one command (`ctl spawn`) with state input + selected type (+ optional timeout).
7. Confirm: SubTurtle started and supervision check-ins are scheduled automatically.

### Proposed wording snippet for `META_SHARED.md`

```markdown
## Starting new work

When delegating a new coding task:

1. Ask clarifying questions and update root `CLAUDE.md`.
2. Draft the SubTurtle state (`CLAUDE.md` content) with a clear end goal and backlog.
3. Recommend a loop type, then ask the user to choose via buttons: `yolo-codex`, `yolo`, `slow`.
4. Spawn with one command:
   `./super_turtle/subturtle/ctl spawn <name> --type <selected> [--timeout DURATION]`
   Pass state via stdin or `--state-file`.
5. Confirm the spawn briefly (type, timeout, cron interval).

Do not manually create workspace directories, symlinks, or cron entries during normal spawn; `ctl spawn` owns that workflow.
```

### Autonomous supervision section adjustments

Update supervision text to match ownership boundaries:

- Keep the rule: every delegated SubTurtle must be supervised on a recurring interval.
- Change implementation detail: supervision is auto-registered by `ctl spawn` (default 5m), not manually scheduled by meta.
- Keep judgment-call table (backlog complete / stuck / off-track / progressing / dead), unchanged in intent.
- Keep cleanup requirement: when stopping a SubTurtle, ensure cron is removed; operationally this happens through `ctl stop`.

### Migration and compatibility notes

- During rollout, `META_SHARED.md` may include a temporary fallback:
  - if `ctl spawn` is unavailable, use legacy manual flow.
- Once `ctl spawn` is shipped and stable, remove fallback instructions to reduce drift.
- Canonical entry point remains `ctl`; meta instructions should avoid direct cron file mutation except emergency repair.
