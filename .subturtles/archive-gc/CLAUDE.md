# Current Task

Update the case statement at bottom of script to wire up `archive`, `gc`, and `list --archived`.

# End Goal with Specs

Two new commands in `ctl`:

1. **`archive <name>`** — moves a stopped SubTurtle's workspace from `.subturtles/<name>/` to `.subturtles/.archive/<name>/`. Refuses if the SubTurtle is currently running. Overwrites any existing archive entry with the same name.

2. **`gc [--max-age DURATION]`** — archives ALL stopped SubTurtles whose workspace was last modified more than `--max-age` ago. Default max-age: `1d` (1 day). Uses the existing `parse_duration()` helper for the duration string. Prints each SubTurtle it archives.

3. **`list` update** — current `do_list` should skip `.archive/` directory (it already will since `.archive` isn't a SubTurtle workspace, but verify). Add a `--archived` flag that lists archived SubTurtles instead (name + archive date).

4. **Usage text** — update the `usage()` function to document `archive`, `gc`, and `list --archived`.

**Acceptance criteria:**
- `ctl archive cron` moves `.subturtles/cron/` to `.subturtles/.archive/cron/`
- `ctl archive cron` when cron is running → error, exits non-zero
- `ctl gc` archives all stopped SubTurtles older than 1 day
- `ctl gc --max-age 0m` archives ALL stopped SubTurtles (useful for manual cleanup)
- `ctl list` does NOT show archived SubTurtles
- `ctl list --archived` shows only archived SubTurtles
- All existing commands still work exactly as before

# Backlog

- [x] Read the full `ctl` script to understand structure and helpers
- [x] Add `do_archive()` function: validate not running, mkdir -p `.subturtles/.archive`, mv workspace
- [x] Add `do_gc()` function: iterate stopped SubTurtles, check mtime vs max-age, call do_archive for each
- [x] Update `do_list()` to skip `.archive` dir and support `--archived` flag
- [x] Update `usage()` text with new commands
- [ ] Update the case statement at bottom of script to wire up `archive`, `gc`, and `list --archived` <- current
- [ ] Test: run `ctl list`, `ctl archive` on a stopped SubTurtle, `ctl gc --max-age 0m`, `ctl list --archived`
- [ ] Commit

# Notes

- File to modify: `super_turtle/subturtle/ctl` (bash script, ~840 lines)
- Reuse existing helpers: `parse_duration()`, `is_running()`, `workspace_dir()`
- Archive dir: `.subturtles/.archive/<name>/` (flat, no date suffix needed — name is unique)
- For mtime checking in `do_gc`, use `stat -f '%m'` on macOS to get epoch seconds, compare against `$(date +%s) - max_age_seconds`
- Do NOT use `find` — iterate the directories manually like `do_list` does
