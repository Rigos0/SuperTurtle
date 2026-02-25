# Next Project Intake Template

Use this template when starting new project work so kickoff is consistent and immediately spawn-ready.

## 1) Project definition

- Project name:
- Problem statement:
- Why this matters now:
- Primary users:

## 2) Scope

- In scope:
- Out of scope:
- Milestones (ordered):

## 3) Acceptance criteria

- Functional requirements:
- Non-functional requirements (performance, reliability, security):
- Definition of done:

## 4) Technical constraints

- Tech stack requirements:
- Deployment/runtime constraints:
- Integrations/dependencies:
- Testing expectations:

## 5) SubTurtle kickoff plan

- SubTurtle name:
- Loop type (`slow`, `yolo`, or `yolo-codex`):
- Timeout:
- Cron interval:
- Skills to load (if any):

## 6) Initial SubTurtle backlog (one commit per item)

- [ ] Item 1 <- current
- [ ] Item 2
- [ ] Item 3
- [ ] Item 4
- [ ] Item 5

## 7) Spawn command

Write the SubTurtle CLAUDE.md content, then spawn:

```bash
./super_turtle/subturtle/ctl spawn <name> \
  --type <slow|yolo|yolo-codex> \
  --timeout <duration> \
  --cron-interval <duration> \
  --state-file <path-or-"-">
```

If passing state on stdin:

```bash
cat /path/to/claude-state.md | ./super_turtle/subturtle/ctl spawn <name> --state-file -
```
