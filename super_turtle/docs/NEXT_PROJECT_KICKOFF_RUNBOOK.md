# Next Project Kickoff Runbook

Use this runbook when new work arrives so the first SubTurtle can be spawned in minutes with consistent quality.

## 1) Capture intake

Start from `docs/NEXT_PROJECT_INTAKE_TEMPLATE.md` and fill it completely:

- project definition
- scope and milestones
- acceptance criteria
- technical constraints
- SubTurtle kickoff plan
- initial backlog (one commit per item)

## 2) Write initial SubTurtle state

Create a scoped state file at `.subturtles/<name>/CLAUDE.md` (or a temp file piped to stdin). Keep backlog items small and ordered.

Recommended headings:

- `# Current Task`
- `# End Goal with Specs`
- `# Backlog`
- `## Progress Notes`

## 3) Choose loop type and runtime defaults

- `slow` for multi-step or high-risk work
- `yolo` for well-scoped implementation work
- `yolo-codex` for cost-sensitive straightforward tasks

Defaults unless the project needs otherwise:

- timeout: `1h`
- cron interval: `5m`

## 4) Spawn the worker

Using file input:

```bash
./super_turtle/subturtle/ctl spawn <name> \
  --type <slow|yolo|yolo-codex> \
  --timeout 1h \
  --cron-interval 5m \
  --state-file .subturtles/<name>/CLAUDE.md
```

Using stdin:

```bash
cat /path/to/state.md | ./super_turtle/subturtle/ctl spawn <name> --state-file -
```

Add skills as needed:

```bash
./super_turtle/subturtle/ctl spawn <name> --state-file - --skill <skill-name>
```

## 5) Verify spawn succeeded

Run:

```bash
./super_turtle/subturtle/ctl status <name>
./super_turtle/subturtle/ctl logs <name>
```

Confirm workspace + state artifacts:

- `.subturtles/<name>/CLAUDE.md`
- `.subturtles/<name>/AGENTS.md` (symlink)
- `.subturtles/<name>/subturtle.meta` includes `CRON_JOB_ID`

## 6) Supervision cadence

Cron is auto-registered by `ctl spawn`. Review at each check-in:

- latest commit progress
- backlog state (`<- current` pointer)
- whether to continue, course-correct, or stop

## 7) Completion handling

When backlog is complete:

1. Stop worker: `./super_turtle/subturtle/ctl stop <name>`
2. Verify cron cleanup in logs
3. Summarize shipped work and next project options
