# Current Task
Read context-command.ts and write context-command.test.ts.

## End Goal with Specs
Fill the critical gaps in bot test coverage with pure unit tests. No Telegram API mocking needed — focus on exported pure functions.

**Test framework:** `bun:test` (import from "bun:test", use describe/it/expect)

**Files to create:**

### 1. `src/security.test.ts`
Source: `src/security.ts`

Tests for:
- `RateLimiter.check()`:
  - Fresh limiter allows requests
  - Rapid requests eventually get rejected (bucket empties)
  - After waiting, bucket refills and requests succeed again
- `RateLimiter.getStatus()`:
  - Returns correct remaining/total counts
- `isAuthorized(userId)`:
  - Valid user ID from ALLOWED_USERS returns true
  - Unknown user ID returns false
- `checkCommandSafety(command)`:
  - Safe commands pass (e.g., `ls`, `git status`, `npm test`)
  - Dangerous patterns blocked (e.g., `rm -rf /`, commands with `sudo`)
  - Edge cases: empty string, very long commands
- `isPathAllowed(path)`:
  - Paths within WORKING_DIR allowed
  - Paths outside WORKING_DIR rejected
  - Traversal attempts (`../../etc/passwd`) rejected

### 2. `src/cron.test.ts`
Source: `src/cron.ts`

Tests for:
- `normalizeJob(raw)`:
  - Valid job object passes through
  - Missing required fields rejected
  - Default values filled in
- `addJob()` + `loadJobs()`:
  - Round-trip: add a job, load jobs, job is present
  - Use a temp file for the JSON store
- `removeJob(id)`:
  - Existing job removed successfully
  - Missing job ID handled gracefully
- `getDueJobs(now)`:
  - Job with fire_at <= now is returned
  - Job with fire_at > now is not returned
  - Multiple due jobs all returned
- `advanceRecurringJob(job)`:
  - fire_at bumped by interval_ms
  - One-shot job not advanced (no interval_ms)

### 3. `src/context-command.test.ts`
Source: `src/context-command.ts`

Tests for:
- `contentToString(content)`:
  - String content returns as-is
  - Array of content objects joined correctly
  - Null/undefined returns empty string
- `extractLocalCommandStdout(text)`:
  - Extracts content between XML tags
  - Returns empty string if no tags found
  - Handles malformed tags
- `findLatestContextOutput(logs)`:
  - Finds most recent context output from log array
  - Returns null if no context output found

### 4. `src/dashboard.test.ts`
Source: `src/dashboard.ts`

Tests for:
- `isAuthorized(request)`:
  - Token in query param `?token=X` passes
  - Token in Authorization header passes
  - Missing token rejected
  - Wrong token rejected
- `safeSubstring(str, maxLen)`:
  - Short strings unchanged
  - Long strings truncated with ellipsis
  - Edge: empty string, maxLen=0

### 5. `src/handlers/streaming.test.ts`
Source: `src/handlers/streaming.ts`

Tests for:
- `isAskUserPromptMessage(text)`:
  - ask_user prompt messages detected
  - Regular messages not detected
- `createAskUserKeyboard(options)`:
  - Correct button layout for 2 options
  - Correct button layout for 6 options (max)
  - Callback data format: `askuser:<id>:<index>`

**Important:** Read each source file first to understand exact function signatures and behavior before writing tests. Some functions may not be exported — only test exported functions.

## Backlog
- [x] Read security.ts and write security.test.ts
- [x] Read cron.ts and write cron.test.ts
- [ ] Read context-command.ts and write context-command.test.ts <- current
- [ ] Read dashboard.ts and write dashboard.test.ts
- [ ] Read streaming.ts and write streaming.test.ts
- [ ] Run `bun test` to verify all new tests pass alongside existing tests
- [ ] Commit
