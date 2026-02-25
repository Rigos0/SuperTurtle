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

Remaining sections (`ctl spawn` CLI details, Telegram button policy, cron cleanup rules, META_SHARED.md changes) are intentionally deferred to subsequent backlog items.
