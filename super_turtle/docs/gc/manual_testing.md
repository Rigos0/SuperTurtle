# Conductor State GC: Manual Edge Case Testing

This guide provides 10 manual test scenarios to verify the resilience and safety of the `ctl gc-state` command.

---

### 1. Malformed JSON Resilience
**Goal:** Verify GC doesn't crash if a state file contains garbage.
1. Create `state/workers/garbage.json` with text `{{{NOT_JSON}}`.
2. Create a valid old wakeup to ensure GC still runs.
3. Run: `./super_turtle/subturtle/ctl gc-state --max-age 1`
4. **Result:** SUCCESS. GC finished with summary showing 1 wakeup pruned. `garbage.json` was preserved and skipped as expected.
5. **Test Procedure:** Used `echo` to create garbage file and valid wakeup, then ran `ctl gc-state` with 1 second retention.

### 2. Active Run Protection
**Goal:** Ensure we don't prune wakeups for a worker that is still running.
1. Create `state/workers/active.json` with `lifecycle_state: "running"` and `run_id: "active_123"`.
2. Create `state/wakeups/old_sent.json` with `delivery_state: "sent"`, `run_id: "active_123"`, and a very old timestamp.
3. Run: `./super_turtle/subturtle/ctl gc-state --max-age 1`
4. **Result:** SUCCESS. `old_sent.json` was **preserved** because its `run_id` was matched against an active worker state.
5. **Test Procedure:** Created active worker and old wakeup with matching `run_id`, verified file remains after GC.

### 3. Pending Wakeup Protection
**Goal:** Ensure a worker record is NOT pruned if it still has pending wakeups.
1. Create an archived worker `state/workers/archived.json` with `run_id: "pending_run"`.
2. Create a pending wakeup `state/wakeups/pending.json` with `delivery_state: "pending"` and `run_id: "pending_run"`.
3. Run: `./super_turtle/subturtle/ctl gc-state --max-age 1`
4. **Result:** SUCCESS. Both files were **preserved**. The archived worker stays until all its wakeups are delivered.
5. **Test Procedure:** Created archived worker and pending wakeup with matching `run_id`, verified both remain.

### 4. Binary Data in Logs
**Goal:** Verify rotation doesn't crash on non-UTF8 or binary junk in `.jsonl`.
1. Append binary data to `events.jsonl`: `printf "BIN\x80\xFFJUNK\n" > .superturtle/state/events.jsonl`
2. Add a valid old line after it.
3. Run: `./super_turtle/subturtle/ctl gc-state --max-age 1`
4. **Result:** SUCCESS (after fix). The GC was updated with `errors="replace"` in `_rotate_jsonl` to handle non-UTF8 bytes. Binary junk was preserved in the main file (since it lacked a valid timestamp), and the old line was archived.
5. **Test Procedure:** Injected binary bytes into `events.jsonl`, ran GC, verified no crash and correct rotation.

### 5. Non-UTC Timestamp Lexicographical Check
**Goal:** Verify GC handles `+00:00` offset correctly (since it uses string comparison).
1. Create an inbox item with `updated_at: "2020-01-01T00:00:00+00:00"`.
2. Run: `./super_turtle/subturtle/ctl gc-state --max-age 7d`
3. **Result:** SUCCESS. Item was pruned. ISO8601 strings with offsets still sort correctly for year-based pruning.
4. **Test Procedure:** Created inbox item with `+00:00` timestamp, verified pruning.

### 6. Missing `inbox/` Directory
**Goal:** Resilience when the TypeScript-owned inbox dir hasn't been created yet.
1. Delete the `state/inbox` directory: `rm -rf .superturtle/state/inbox`
2. Run: `./super_turtle/subturtle/ctl gc-state`
3. **Result:** SUCCESS. GC finished gracefully with `Inbox items pruned: 0`.
4. **Test Procedure:** Deleted `inbox` dir, verified no errors during GC run.

### 7. Dry Run Integrity
**Goal:** Absolute guarantee that `--dry-run` modifies nothing.
1. Create an old worker and an old log line.
2. Run: `./super_turtle/subturtle/ctl gc-state --max-age 1 --dry-run`
3. **Result:** SUCCESS. Summary reported items *would* be pruned, but no files were deleted and no archive was created.
4. **Test Procedure:** Created old state, ran with `--dry-run`, verified files remained and no `.jsonl.1` was created.

### 8. Atomic Rotation (Interruption Simulation)
**Goal:** Verify rotation uses a temp file to prevent data loss.
1. Review implementation for `_rotate_jsonl`.
2. **Result:** SUCCESS. Implementation uses `tmp_path.replace(jsonl_path)`, which is an atomic operation on Unix. No leftover `.tmp` files were found after runs.
3. **Test Procedure:** Verified logic in `conductor_gc.py` and checked for leftover files.

### 9. Multiple Archive Rotations
**Goal:** Verify we append to `events.jsonl.1` instead of overwriting.
1. Create `events.jsonl.1` with some "Old Archive" text.
2. Create an old entry in `events.jsonl`.
3. Run: `./super_turtle/subturtle/ctl gc-state --max-age 1`
4. **Result:** SUCCESS. `events.jsonl.1` contained both the original text and the newly rotated entry.
5. **Test Procedure:** Pre-populated archive file, ran GC, verified line count in archive.

### 10. Max Age "0s" (Prune Everything Possible)
**Goal:** Verify behavior at the limit.
1. Create recent states (e.g., from today).
2. Run: `./super_turtle/subturtle/ctl gc-state --max-age 0`
3. **Result:** SUCCESS. All terminal/archived records were pruned regardless of age.
4. **Test Procedure:** Created "recent" sent wakeup and log entry, ran with `--max-age 0`, verified both were pruned/archived.
