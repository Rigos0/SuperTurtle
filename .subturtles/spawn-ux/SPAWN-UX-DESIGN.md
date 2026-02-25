# SubTurtle Spawn UX Design

## 1. Proposed Flow (Before vs After)

### Scope of this section
Design the end-to-end flow from "user asks to build X" to "SubTurtle is running and supervised by cron."

### Current flow (before)

| Step | Actor | Action |
| --- | --- | --- |
| 1 | User | Asks meta agent to build something. |
| 2 | Meta agent | Decides to delegate and picks SubTurtle name/type. |
| 3 | Meta agent | Runs `mkdir -p .subturtles/<name>/`. |
| 4 | Meta agent | Writes `.subturtles/<name>/CLAUDE.md` manually. |
| 5 | Meta agent | Runs `ln -sf CLAUDE.md .subturtles/<name>/AGENTS.md`. |
| 6 | Meta agent | Runs `./super_turtle/subturtle/ctl start <name> --type <type> --timeout <duration>`. |
| 7 | Meta agent | Opens `cron-jobs.json`, appends recurring supervision job, writes file back. |
| 8 | Meta agent | Confirms spawn to user. |
| 9 | Cron | Fires later and starts supervision loop. |

### Proposed flow (after)

| Step | Actor | Action |
| --- | --- | --- |
| 1 | User | Asks meta agent to build something. |
| 2 | Meta agent | Decides to delegate and prepares SubTurtle task state (`CLAUDE.md` content). |
| 3 | Meta agent | Requests type choice via Telegram buttons (`ask_user`): `yolo`, `yolo-codex`, `slow` (with recommended default preselected in wording). |
| 4 | User | Taps one type button. |
| 5 | Meta agent | Executes one spawn command through `ctl` entry point (new `spawn` flow), passing task state + selected type. |
| 6 | `ctl` | Atomically: creates workspace, writes/links state files, starts SubTurtle, registers recurring cron check-in, returns summary. |
| 7 | Meta agent | Sends concise confirmation to user from `ctl` summary. |
| 8 | Cron | Fires later and starts supervision loop (already registered by `ctl`). |

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

Because `ask_user` currently supports string options only (no separate description fields), encode short guidance in the option labels and question text.

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

Remaining sections (cron cleanup rules, META_SHARED.md changes) are intentionally deferred to subsequent backlog items.
