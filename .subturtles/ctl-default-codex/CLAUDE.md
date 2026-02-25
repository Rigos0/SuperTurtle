# Current Task
All backlog items for changing the default SubTurtle loop type to `yolo-codex` in `ctl` are complete.

# End Goal with Specs
In `super_turtle/subturtle/ctl`:
1. Change `do_start()` default from `local loop_type="slow"` to `local loop_type="yolo-codex"` (line ~196)
2. Change `do_spawn()` default from `local loop_type="slow"` to `local loop_type="yolo-codex"` (line ~452)
3. Update `usage()` help text to indicate yolo-codex is the default (currently says "slow (default)")
4. Update the `type_str` fallback in `do_status()` from `"slow"` to `"yolo-codex"` (line ~589)
5. Update the `type_str` fallback in `do_list()` from `"slow"` to `"yolo-codex"` (line ~669)

File: `super_turtle/subturtle/ctl`

Acceptance criteria:
- `./super_turtle/subturtle/ctl spawn myturtle --state-file state.md` defaults to yolo-codex
- Help text shows yolo-codex as default
- No functional regressions (--type flag still overrides)

# Backlog
- [x] Read `super_turtle/subturtle/ctl` to confirm exact line numbers
- [x] Change default in `do_start()` from "slow" to "yolo-codex"
- [x] Change default in `do_spawn()` from "slow" to "yolo-codex"
- [x] Update `usage()` help text
- [x] Update fallback type display in `do_status()` and `do_list()`
- [x] Commit with descriptive message

## Loop Control
STOP
