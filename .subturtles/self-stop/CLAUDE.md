## Current Task
All backlog items complete; no remaining `<- current` item.

## End Goal with Specs
SubTurtles can signal completion by writing a STOP directive to their CLAUDE.md. The Python loop checks for this after each iteration and breaks cleanly. Works for all 3 loop types.

**Acceptance criteria:**
- `_should_stop()` helper in `__main__.py` checks for `## Loop Control\nSTOP` in the state file
- All 3 loops (slow, yolo, yolo-codex) call `_should_stop()` after each iteration and `break` if true
- Prompts updated so agents know to write the directive when all backlog items are `[x]`
- `META_SHARED.md` section "Key design concept: SubTurtles cannot stop themselves" rewritten to document the new self-stop mechanism
- No other files changed

## Backlog
- [x] Add `STOP_DIRECTIVE` constant and `_should_stop(state_file, name)` helper function to `super_turtle/subturtle/__main__.py` after `RETRY_DELAY` line. The helper reads the state file and returns True if `## Loop Control\nSTOP` is present. Log `[subturtle:{name}] 🛑 agent wrote STOP directive — exiting loop` when detected.
- [x] Wire `_should_stop()` into all 3 loop functions: `run_slow_loop`, `run_yolo_loop`, `run_yolo_codex_loop`. Add `if _should_stop(state_file, name): break` after the try/except block in each loop. Fix the `_state_file` variable name in yolo and yolo-codex to `state_file` (remove underscore prefix) so it's accessible.
- [x] Update `REVIEWER_PROMPT` — add step 5 telling the reviewer to append `## Loop Control\nSTOP` to the state file when ALL backlog items are `[x]`.
- [x] Update `YOLO_PROMPT` — add step 6 telling the agent to append `## Loop Control\nSTOP` to the state file after committing when ALL backlog items are `[x]`, then amend the commit.
- [x] Rewrite the `## Key design concept: SubTurtles cannot stop themselves` section in `super_turtle/meta/META_SHARED.md` (around line 209) to document the new self-stop mechanism. Rename it to `## Key design concept: SubTurtle self-completion`. Explain: agent writes `## Loop Control\nSTOP` to CLAUDE.md, loop checks after each iteration, process exits cleanly. Watchdog and cron still exist as fallbacks.
- [x] Commit all changes

## Notes
- File: `super_turtle/subturtle/__main__.py` — all loop logic and prompts live here
- File: `super_turtle/meta/META_SHARED.md` — documentation to update (section at ~line 209)
- The `_state_file` variable in `run_yolo_loop` and `run_yolo_codex_loop` has an underscore prefix because it was unused — remove the prefix so `_should_stop` can use it
- Verification (2026-02-25): `python3 -m py_compile super_turtle/subturtle/__main__.py` passed.
