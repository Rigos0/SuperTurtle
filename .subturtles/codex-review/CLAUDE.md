# Current task

All subturtle type-system review items are complete <- current

# End goal with specs

Code review of the new subturtle type system (slow/yolo/yolo-codex). Review the following files for bugs, inconsistencies, and edge cases:

- `super_turtle/subturtle/__main__.py` — new YOLO_PROMPT, loop functions, dispatch, argparse
- `super_turtle/subturtle/ctl` — --type flag, removed auto-seed, meta file changes, list/status display
- `super_turtle/meta/META_SHARED.md` — documentation updates

Acceptance criteria:
- All bugs found are fixed and committed
- No regressions to existing slow loop behavior
- Prompt templates format correctly (single vs double braces)
- Bash script is correct (quoting, argv ordering, edge cases)
- Documentation matches the code

# Roadmap (Completed)

- (none yet)

# Roadmap (Upcoming)

- Review and fix pass

# Backlog

- [x] Review `super_turtle/subturtle/__main__.py` for bugs — check prompt formatting, error handling, function signatures, retry logic
- [x] Review `super_turtle/subturtle/ctl` for bash issues — quoting, argv flow, ensure_workspace error path, do_list/do_status column alignment
- [x] Review `super_turtle/meta/META_SHARED.md` for stale/contradictory docs
- [x] Fix any issues found, commit each fix separately (command path consistency + session ID guidance fixed)
- [x] Run a final consistency check across all three files
