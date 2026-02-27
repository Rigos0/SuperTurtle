## Current Task
Completed: `/sub` UX now supports `/subs` + `/subtitles` and shows structured state summaries from `CLAUDE.md`.

## End Goal with Specs
`/sub`, `/subs`, `/subtitles` all work. Output is user-friendly: shows each SubTurtle with current task/backlog progress and a short root state summary, not raw logs.

## Backlog
- [x] Locate `/sub` command handler and current output logic
- [x] Add command aliases `/subs` and `/subtitles`
- [x] Replace log output with parsed SubTurtle backlog + root `CLAUDE.md` summary
- [x] Update tests or docs if present
- [x] Update state and stop

## Notes
Likely in `super_turtle/claude-telegram-bot/src/handlers/commands.ts` or similar. Use existing SubTurtle state files `.subturtles/<name>/CLAUDE.md` and root `CLAUDE.md`.

## Loop Control
STOP
