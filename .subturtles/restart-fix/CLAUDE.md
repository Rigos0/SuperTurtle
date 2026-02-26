## Current Task
Replace `process.exit(0)` with: spawn detached child using `process.argv`, then exit.

## End Goal with Specs
`/restart` must work regardless of how the bot was launched (directly via `bun run src/index.ts` OR via `run-loop.sh`). After restart, the bot should:
1. Send "🔄 Restarting bot..." message
2. Save restart info to `.restart-pending.json`
3. Actually restart the process
4. On startup, detect `.restart-pending.json` and edit the message to "✅ Bot restarted"
5. Send the session overview

**Root cause:** `handleRestart()` in `commands.ts` calls `process.exit(0)` expecting `run-loop.sh` to restart it. But when run directly (`bun run src/index.ts`), nothing restarts — the process just dies.

**Fix approach:** Replace `process.exit(0)` with a self-re-exec pattern. Use `Bun.spawn()` to launch a new instance of the same process, then exit the current one. This works whether or not `run-loop.sh` wraps us:

- If run via `run-loop.sh`: the `process.exit(0)` still works as before (loop catches it and restarts). Keep exit(0) as the mechanism.
- If run directly: we need to detect this and handle it differently.

**Best approach:** Check if we're running under `run-loop.sh` (check parent process or env var). If yes, `process.exit(0)` as before. If not, use `Bun.spawn()` to start a detached child with the same args, then exit.

**Simpler approach (preferred):** Always spawn a detached replacement process before exiting. The new process starts, the old one exits. If `run-loop.sh` is wrapping us, it will also restart — but the detached process will detect the port is in use (grammY `deleteWebhook` + long polling) and the first one wins. Actually this gets messy.

**Simplest correct approach:** 
1. In `handleRestart()`, spawn a detached child: `Bun.spawn(["bun", "run", "src/index.ts", "run:live"], { detached, stdio: "ignore" })` with `unref()`.
2. Then call `process.exit(0)`.
3. If run-loop.sh is wrapping, it will also try to restart — but the new process will already be running. To avoid a double-start, set an env var (e.g., `BOT_RESTARTING=1`) that the new process checks on startup — if set, it proceeds normally. The run-loop.sh instance will hit a conflict and the polling will fail gracefully.

**Actually simplest:** Just always use `process.exit(0)` AND spawn a new detached process. To prevent double-start from run-loop.sh, write a `.restart-self-handled` marker file before spawning. In `run-loop.sh`, check for this file — if present, delete it and don't restart (exit the loop). And in the new process startup, just proceed normally.

**WAIT — even simpler:** The real issue is just that the user runs `bun run src/index.ts` directly without the loop wrapper. The fix: make the restart handler spawn a new process using `process.argv` (same command that started it), detached, then exit. No need to coordinate with run-loop.sh at all:

```typescript
// Re-exec ourselves
const child = Bun.spawn(process.argv, {
  cwd: import.meta.dir + "/..",
  stdin: "ignore",
  stdout: "ignore",  
  stderr: "ignore",
});
child.unref();
process.exit(0);
```

If run-loop.sh is wrapping us, it sees exit code 0 and also restarts — now there are two instances. So we need to handle that.

**Final approach (use this):**
1. Set env var `RESTART_SELF=1` before spawning child.
2. In `run-loop.sh`, after the bot exits with code 0, check if `RESTART_SELF=1` was set by reading a marker file `.restart-self`. If marker exists, delete it and exit the loop (the bot already restarted itself).
3. In `handleRestart()`:
   - Write `.restart-self` marker file
   - Spawn detached child with same `process.argv`
   - `process.exit(0)`

This way:
- Direct run: child spawns, parent exits, child takes over ✅
- run-loop.sh: child spawns, parent exits, loop sees marker file, loop exits. Child takes over ✅

## Backlog
- [x] Add `.restart-self` marker file write in `handleRestart()` before spawning
- [ ] Replace `process.exit(0)` with: spawn detached child using `process.argv`, then exit <- current
- [ ] Update `run-loop.sh` to check for `.restart-self` marker and exit cleanly if found
- [ ] Test: run bot directly with `bun run src/index.ts`, send `/restart`, verify bot comes back
- [ ] Commit with clear message

## Notes
- File: `super_turtle/claude-telegram-bot/src/handlers/commands.ts` — function `handleRestart()` (line ~1512)
- File: `super_turtle/claude-telegram-bot/run-loop.sh` — restart loop
- The RESTART_FILE (`.restart-pending.json`) logic for updating the "Restarting..." message should remain unchanged
- `process.argv` in Bun gives the full command used to start, e.g. `["bun", "run", "src/index.ts"]`
- Use `cwd` of the bot directory (resolve from `import.meta.dir`)
