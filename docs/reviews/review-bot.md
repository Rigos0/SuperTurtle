# Code Review: Telegram Bot Core

**Date**: 2026-02-27
**Scope**: TypeScript source files in `super_turtle/claude-telegram-bot/src/`
**Phase**: Core files (index.ts, bot.ts, session.ts, codex-session.ts)

---

## Executive Summary

The core files implement a solid foundation for the Claude Telegram bot with good error handling patterns and defensive coding practices. However, several **critical race conditions** exist around concurrent file access to session/preference files, and **medium-severity issues** include type safety gaps, error suppression patterns, and unhandled edge cases in streaming logic.

**Issues Found**: 17 total
- **Critical**: 2 (data loss risks from concurrent writes)
- **Medium**: 10 (error handling gaps, type safety, edge cases)
- **Low**: 5 (minor safety concerns, hardcoded values)

---

## Critical Issues

### 1. Race Condition: Concurrent Session History Writes (ClaudeSession)

**File**: `src/session.ts`
**Lines**: 697-732 (saveSession method)
**Severity**: CRITICAL

**Issue**:
The `saveSession()` method reads SESSION_FILE, modifies it in memory, and writes it back without atomic operations or file locking. If two ClaudeSession instances save simultaneously, one write overwrites the other, causing data loss.

```typescript
const history = this.loadSessionHistory();  // Read
// ... modify in memory ...
Bun.write(SESSION_FILE, JSON.stringify(history, null, 2));  // Write
```

**Scenario**: Bot receives two messages → both trigger session saves → race condition → one session lost.

**Suggested Fix**:
- Use file locking (e.g., `proper-lockfile`)
- Or atomic write pattern (write to temp file, atomic rename)
- Or use a single global lock across all session instances

---

### 2. Race Condition: Concurrent Codex Session History Writes

**File**: `src/codex-session.ts`
**Lines**: 1029-1064 (saveSession method)
**Severity**: CRITICAL

**Issue**:
Same pattern as ClaudeSession. Concurrent saves to CODEX_SESSION_FILE will lose data, and this compounds across bot restarts since Codex sessions persist.

**Suggested Fix**:
Same as above — implement atomic file operations or locking.

---

## Medium Issues

### 3. Type Safety: Invalid Grammy Context Construction

**File**: `src/index.ts`
**Lines**: 257-277, 472-493
**Severity**: MEDIUM

**Issue**:
Code constructs a fake `grammy.Context` and casts it `as unknown as import("grammy").Context`, bypassing type checking. This could miss missing required methods.

```typescript
const cronCtx = ({
  from: { id: resolvedUserId, ... },
  // ... missing many Context properties
}) as unknown as import("grammy").Context;
```

**Suggested Fix**:
- Create proper interface `CronContext extends Partial<Context>`
- Or use a type-safe wrapper class instead of type casting

---

### 4. Error Handling: Unhandled Typing Loop Promise

**File**: `src/index.ts`
**Lines**: 506-515 (silent cron typing loop)
**Severity**: MEDIUM

**Issue**:
If an error occurs between line 517-574, `typingLoop` continues running in background, sending typing indicators even after job failure.

**Risk**: Typing indicators sent for minutes after job fails.

**Suggested Fix**:
- Add timeout to typing loop (max 30 seconds)
- Or ensure typingController.stop() called in catch block immediately

---

### 5. Error Handling: BOT_MESSAGE_ONLY Empty Payload Silently Skipped

**File**: `src/index.ts`
**Lines**: 462-470
**Severity**: MEDIUM

**Issue**:
Empty BOT_MESSAGE_ONLY messages skipped with only console.warn; user never notified.

```typescript
if (message.trim().length === 0) {
  console.warn(`Cron job ${job.id} skipped: BOT_MESSAGE_ONLY payload is empty`);
  continue;  // No Telegram notification
}
```

**Suggested Fix**:
Send error notification to user instead of silently skipping.

---

### 6. Null Check: Codex stdin Access Without Proper Guard

**File**: `src/codex-session.ts`
**Lines**: 347-349
**Severity**: MEDIUM

**Issue**:
stdin checked at line 343, but accessed with `!` assertion at line 348. If process ends between checks, write will fail.

**Suggested Fix**:
```typescript
const send = (payload: Record<string, unknown>) => {
  if (!proc.stdin) return;
  proc.stdin.write(JSON.stringify(payload) + "\n");
};
```

---

### 7. Timeout: App-Server Request Could Exceed Deadline

**File**: `src/codex-session.ts`
**Lines**: 369-417
**Severity**: MEDIUM

**Issue**:
Loop could process a line after deadline has passed. While Promise.race sets timeout, loop continues if `Date.now() < deadline` at boundary.

**Suggested Fix**:
Check deadline again before processing each line.

---

### 8. Error Suppression: Cron Snapshot Prep Errors Not Surfaced

**File**: `src/index.ts`
**Lines**: 146-195
**Severity**: MEDIUM

**Issue**:
If state file or git log fails to read, snapshot sent with incomplete data. Critical failures masked from user.

**Suggested Fix**:
If multiple errors during prep, send error message instead of incomplete snapshot.

---

### 9. Type Assertion: Grammy Context Construction

**File**: `src/session.ts`
**Lines**: 277, 493
**Severity**: MEDIUM

**Issue**:
Cron context cast bypasses type checking, making it impossible to detect missing Context methods.

**Suggested Fix**:
Create minimal interface for cron contexts with only implemented methods.

---

### 10. Data Validation: Snapshot Queue Could Have Malformed Entries

**File**: `src/index.ts`
**Lines**: 250-320
**Severity**: MEDIUM

**Issue**:
`dequeuePreparedSnapshot()` could return incomplete snapshot. No validation before use.

```typescript
const snapshot = dequeuePreparedSnapshot();
if (!snapshot) break;
// snapshot fields never validated
```

**Suggested Fix**:
```typescript
if (!snapshot?.chatId || !snapshot?.jobId || !snapshot?.subturtleName) {
  console.error("Invalid snapshot in queue, skipping");
  continue;
}
```

---

## Low Issues

### 11. Hardcoded Italian Text

**File**: `src/session.ts`
**Line**: 709
**Severity**: LOW

**Issue**: `"Sessione senza titolo"` should be `"Untitled session"`

---

### 12. Type Suppression: Sticker Send Override

**File**: `src/index.ts`
**Lines**: 272, 488
**Severity**: LOW

**Issue**: `@ts-expect-error` for sticker sending indicates unresolved type mismatch.

---

### 13. Loose Type Narrowing: ThreadEvent Item Checking

**File**: `src/codex-session.ts`
**Lines**: 850-851
**Severity**: LOW

**Issue**: Type narrowing for ThreadEvent items doesn't fully narrow the type.

---

### 14. Mixed Models: Effort Level Inconsistency Between Drivers

**File**: `src/session.ts` vs `src/codex-session.ts`
**Severity**: LOW

**Issue**: Claude uses effort (low/medium/high), Codex uses reasoning_effort (minimal/low/medium/high/xhigh). No mapping documented.

---

### 15. Silent Deduplication: Model Variants Could Be Hidden

**File**: `src/codex-session.ts`
**Lines**: 474-480
**Severity**: LOW

**Issue**: Model deduplication by ID silently drops variants with different descriptions.

---

## Summary by Category

| Category | Count |
|----------|-------|
| **Race Conditions** | 2 critical |
| **Type Safety** | 3 medium, 2 low |
| **Error Handling** | 4 medium |
| **Data Validation** | 1 medium |
| **Localization** | 1 low |

---

## Recommended Action Plan

1. **URGENT**: Implement file locking for session saves in both ClaudeSession and CodexSession
2. **HIGH**: Fix type assertions for Grammy Context with proper wrapper interfaces
3. **MEDIUM**: Add error notification for failed BOT_MESSAGE_ONLY messages
4. **MEDIUM**: Add timeout to typing loop and deadline checks to app-server requests
5. **OPTIONAL**: Fix Italian text and improve model variant handling

---

---

# Code Review Phase 2: Cron System

**Date**: 2026-02-27
**Files**: cron.ts, cron-supervision-queue.ts, silent-notifications.ts

---

## Executive Summary

The cron system has solid architectural patterns with good error recovery, but shares the same **critical race condition** around concurrent file writes found in session management. The in-memory snapshot queue is well-designed for bounded memory, and the silent notification filtering is pragmatic though fragile.

**Issues Found**: 6 total
- **Critical**: 1 (race condition in job persistence)
- **Medium**: 2 (design concerns, performance)
- **Low**: 3 (fragility, edge cases)

---

## Critical Issues

### 1. Race Condition: Concurrent Job File Writes

**File**: `src/cron.ts`
**Lines**: 109-111 (saveJobs)
**Severity**: CRITICAL

**Issue**:
The `saveJobs()` function writes synchronously to the job file without atomic operations or locking. If `addJob()`, `removeJob()`, and `advanceRecurringJob()` are called concurrently by multiple processes (meta agent + bot), writes will race.

```typescript
export function saveJobs(): void {
  writeFileSync(CRON_JOBS_FILE, JSON.stringify(jobsCache, null, 2));
}
```

**Scenario**: Meta agent schedules job → saveJobs() called. Meanwhile bot's cron timer also calls saveJobs() → one write lost.

**Suggested Fix**:
- Use atomic write pattern (write to temp file, rename atomically)
- Or add a global lock using `proper-lockfile`
- Or use a database for job persistence

---

## Medium Issues

### 2. Race Condition: Load-Modify-Save Window

**File**: `src/cron.ts`
**Lines**: 119-156 (addJob), 162-174 (removeJob), 199-212 (advanceRecurringJob)
**Severity**: MEDIUM

**Issue**:
Each operation calls `loadJobs()` first to read the latest state, then modifies in memory, then calls `saveJobs()`. Between the read and write, another process could modify the file, causing the first operation's changes to overwrite the second.

```typescript
export function addJob(...): CronJob {
  loadJobs();  // Read
  // ... modify jobsCache ...
  jobsCache.push(job);
  saveJobs();  // Write — other process might have written between read/write
}
```

**Risk**: Job loss if operations are interleaved.

**Suggested Fix**:
- Implement exclusive locking around the read-modify-write sequence
- Or use a single writer pattern with a queue

---

### 3. Inefficient Job Counting in Queue Management

**File**: `src/cron-supervision-queue.ts`
**Lines**: 27-33 (countByJob)
**Severity**: MEDIUM

**Issue**:
The `countByJob()` function iterates through the entire queue on every enqueue. While acceptable for MAX_TOTAL=200, this is O(n) for every snapshot, which could be slow with many concurrent SubTurtles.

```typescript
function countByJob(jobId: string): number {
  let count = 0;
  for (const item of queue) {
    if (item.jobId === jobId) count++;  // Linear scan
  }
  return count;
}
```

**Risk**: Snapshot enqueueing could become slow with large queues.

**Suggested Fix**:
```typescript
const countByJobMap = new Map<string, number>();

export function enqueuePreparedSnapshot(...): PreparedSupervisionSnapshot {
  const jobCount = (countByJobMap.get(input.jobId) || 0);
  while (jobCount >= MAX_PER_JOB) {
    // Remove oldest for this job and update count
  }
  // ...
  countByJobMap.set(input.jobId, jobCount + 1);
}
```

---

## Low Issues

### 4. Fragile Marker-Based Notification Filtering

**File**: `src/silent-notifications.ts`
**Lines**: 32-36
**Severity**: LOW

**Issue**:
Silent notifications are filtered based on emoji markers. If a legitimate response happens to contain 🎉 by chance, it will be surfaced even if it's not notable.

```typescript
const hasMarker = SILENT_NOTIFICATION_MARKERS.some((marker) =>
  output.includes(marker)
);
return hasMarker ? output : null;
```

**Risk**: False positives could cause unnecessary notifications.

**Suggested Fix**:
Consider more robust detection:
- Check if marker is at line start: `output.match(/^[🎉⚠️❌🚀🔔]/m)`
- Or use explicit API signals from assistant (e.g., JSON markers)

---

### 5. Job ID Collision Risk (Extremely Low)

**File**: `src/cron.ts`
**Lines**: 131
**Severity**: LOW

**Issue**:
Job IDs are generated using `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`. If two jobs are created in the same millisecond with the same random suffix (probability ~1 in 36^7 ≈ 1 in 78 billion), collision occurs.

```typescript
const id = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
```

**Risk**: Extremely low probability, but not impossible.

**Suggested Fix**:
```typescript
const id = `${Date.now()}_${Math.random().toString(36).slice(2)}_${(Math.random() * 1e9 | 0)}`;
```

---

### 6. Silent Error Recovery Could Hide Persistent Corruption

**File**: `src/cron.ts`
**Lines**: 98-101 (loadJobs error handling)
**Severity**: LOW

**Issue**:
If `loadJobs()` fails to parse the job file, the error is logged but the existing cache is kept. If the file is persistently corrupt, this silently hides the problem.

```typescript
} catch (error) {
  console.error("Failed to load cron jobs (keeping existing cache):", error);
  // Leave jobsCache as-is so in-memory jobs survive a transient read/parse error
}
```

**Risk**: Corrupt job files could go unnoticed if in-memory cache has stale data.

**Suggested Fix**:
- Track parse failures and alert after N consecutive failures
- Or provide a recovery command to rebuild job file from scratch

---

## Summary by Category

| Category | Count |
|----------|-------|
| **Race Conditions** | 2 (1 critical, 1 medium) |
| **Performance** | 1 medium |
| **Error Handling** | 1 low |
| **Fragility** | 1 low |
| **Security (ID)** | 1 low |

---

## Recommended Fixes

1. **URGENT**: Implement file locking for all job persistence operations to prevent data loss
2. **HIGH**: Add range-based load-modify-save locking for each operation
3. **MEDIUM**: Optimize countByJob with a Map-based counter
4. **OPTIONAL**: Improve notification marker detection with pattern matching
5. **OPTIONAL**: Strengthen job ID generation and add collision detection

---

## Files to Review Next

- [ ] Handlers: `handlers/` (all files)
- [ ] Drivers: `drivers/` (registry, types, claude-driver, codex-driver)
- [ ] MCP servers: `ask_user_mcp/`, `send_turtle_mcp/`, `bot_control_mcp/`

---

# Code Review Phase 3: Handler Layer

**Date**: 2026-02-27
**Files**: index.ts, text.ts, commands.ts, streaming.ts, driver-routing.ts, callback.ts

---

## Executive Summary

The handler layer is well-structured with good authorization patterns, rate limiting, and error handling. However, several **medium-severity issues** exist around file operation safety in MCP request handling, command parsing fragility, and potential security gaps in /tmp file access.

**Issues Found**: 8 total
- **Critical**: 0
- **Medium**: 4 (file safety, parsing fragility, auth gaps)
- **Low**: 4 (error suppression, edge cases)

---

## Medium Issues

### 1. File Operation Security: Unsanitized /tmp File Access

**File**: `src/handlers/streaming.ts`
**Lines**: 66-100, 110-149
**Severity**: MEDIUM

**Issue**:
Code scans `/tmp/ask-user-*.json` and `/tmp/send-turtle-*.json` without validating file ownership. An attacker with /tmp access could inject malicious options or URLs.

```typescript
const glob = new Bun.Glob("ask-user-*.json");
for await (const filename of glob.scan({ cwd: "/tmp", absolute: false })) {
  const filepath = `/tmp/${filename}`;
  const data = JSON.parse(await Bun.file(filepath).text());
  // No validation that file was created by MCP server
```

**Risk**: Malicious /tmp files could add fake options, replace URLs, or cause DOS.

**Suggested Fix**:
- Use restricted directory: `/tmp/.claude-telegram-bot-${process.pid}/`
- Or validate file ownership/permissions

---

### 2. Command Parsing: Fragile Regex for ctl List Output

**File**: `src/handlers/commands.ts`
**Lines**: 85-150
**Severity**: MEDIUM

**Issue**:
The `parseCtlListOutput` function uses multiple nested regex patterns. If ctl output format changes, parsing fails silently without warning.

```typescript
const baseMatch = line.match(/^(\S+)\s+(\S+)\s*(.*)$/);
const typeMatch = remainder.match(/^(yolo-codex-spark|yolo-codex|slow|yolo)\b/);
const pidMatch = remainder.match(/^\(PID\s+(\d+)\)\s*(.*)$/);
// ... more nested patterns
```

**Risk**: UI displays corrupted SubTurtle info if format changes.

**Suggested Fix**:
- Add format validation with warnings on mismatch
- Or export ctl output as JSON instead of text

---

### 3. Model Selection: Doesn't Clear Pending ask_user Requests

**File**: `src/handlers/callback.ts`
**Lines**: 77-96
**Severity**: MEDIUM

**Issue**:
Switching Codex models starts a fresh thread but doesn't clear pending ask_user requests from the previous session.

**Risk**: Old ask_user options shown after model switch, confusing user.

**Suggested Fix**:
Clear request files before starting new thread:
```typescript
const glob = new Bun.Glob("ask-user-*.json");
for await (const filename of glob.scan({ cwd: "/tmp" })) {
  try { unlinkSync(`/tmp/${filename}`); } catch {}
}
```

---

### 4. Error Handling: Silent Failure in Photo Download Fallback

**File**: `src/handlers/streaming.ts`
**Lines**: 128-139
**Severity**: MEDIUM

**Issue**:
Photo download fails → fallback to link. But if link send also fails, error is swallowed and marked as "sent".

```typescript
try {
  // Download and send as sticker
} catch (photoError) {
  await ctx.reply(`🐢 ${url}`);  // Could also fail
}
photoSent = true;  // Marked sent regardless
```

**Risk**: File status marked "sent" even when both attempts failed.

**Suggested Fix**:
Wrap fallback in try/catch and set status based on actual result.

---

## Low Issues

### 5. Error Suppression: Corrupt Request Files Retried Infinitely

**File**: `src/handlers/streaming.ts`
**Lines**: 95-96, 146-147
**Severity**: LOW

**Issue**:
Corrupt request files cause errors but are never cleaned up, causing infinite retries.

```typescript
} catch (error) {
  console.warn(`Failed to process ask-user file ${filepath}:`, error);
}
// File never deleted, will be retried next check
```

**Suggested Fix**:
Delete corrupt files instead of retrying.

---

### 6. Type Safety: Effort Level Cast Without Validation

**File**: `src/handlers/callback.ts`
**Line**: 63
**Severity**: LOW

**Issue**:
Effort level cast before validation:
```typescript
const effort = callbackData.replace("effort:", "") as EffortLevel;
if (effort in EFFORT_DISPLAY) {  // Checked after
```

---

### 7. Chat ID Comparison: Type Coercion Issue

**File**: `src/handlers/streaming.ts`
**Lines**: 78, 122
**Severity**: LOW

**Issue**:
```typescript
if (data.chat_id && String(data.chat_id) !== String(chatId)) continue;
```
Unnecessary string conversion; could fail if chatId is undefined.

---

### 8. Unused Import: resetAllDriverSessions

**File**: `src/handlers/callback.ts`
**Line**: 19
**Severity**: LOW

**Issue**:
The `resetAllDriverSessions` is imported but never used. Suggests incomplete refactoring.

---

## Summary by Category

| Category | Count |
|----------|-------|
| **Security** | 1 medium |
| **Parsing** | 1 medium |
| **State Management** | 1 medium |
| **Error Handling** | 1 medium, 2 low |
| **Type Safety** | 1 low |
| **Code Quality** | 1 low |

---

## Recommended Fixes

1. **HIGH**: Restrict /tmp file access to process-owned directory or validate ownership
2. **HIGH**: Add validation to ctl parsing with warnings on format mismatches
3. **MEDIUM**: Clear pending requests when switching models
4. **MEDIUM**: Implement proper error handling in photo fallback
5. **LOW**: Delete corrupt request files instead of retrying
6. **LOW**: Remove unused imports

---

## Files to Review Next

- [ ] Drivers: `drivers/registry.ts`, `types.ts`, `claude-driver.ts`, `codex-driver.ts`
- [ ] MCP servers: `ask_user_mcp/`, `send_turtle_mcp/`, `bot_control_mcp/`

---

# Code Review Phase 4: Driver Layer

**Date**: 2026-02-27
**Files**: registry.ts, types.ts, claude-driver.ts, codex-driver.ts

---

## Executive Summary

The driver layer is clean and simple, serving as an abstraction between handlers and session implementations. The architecture is sound, but **medium-severity issues** exist around error detection heuristics, timing assumptions, and resource cleanup patterns.

**Issues Found**: 6 total
- **Critical**: 0
- **Medium**: 3 (error detection heuristics, timing assumptions, concurrency)
- **Low**: 3 (code efficiency, conventions, type validation)

---

## Medium Issues

### 1. Overly Broad Error Detection Heuristics

**File**: `src/drivers/claude-driver.ts`, `src/drivers/codex-driver.ts`
**Lines**: 38-47 (Claude), 148-160 (Codex)
**Severity**: MEDIUM

**Issue**:
Error classification uses substring matching that could produce false positives.

```typescript
// claude-driver.ts
isCrashError(error: unknown): boolean {
  return String(error).includes("exited with code");  // Too specific for Claude
}

// codex-driver.ts
isCrashError(error: unknown): boolean {
  const errorStr = String(error).toLowerCase();
  return errorStr.includes("crashed") || errorStr.includes("failed");  // Too broad
}
```

**Risk**: Codex's "failed" match could catch validation errors, rate limit errors, etc. and misclassify them as crashes.

**Suggested Fix**:
```typescript
isCrashError(error: unknown): boolean {
  const msg = String(error).toLowerCase();
  return msg.includes("crashed") || msg.includes("exited") || msg.includes("segmentation");
}
```

---

### 2. Tool Name Normalization Assumes Naming Convention

**File**: `src/drivers/codex-driver.ts`
**Line**: 26
**Severity**: MEDIUM

**Issue**:
The driver normalizes tool names by replacing `-` with `_`, assuming a specific naming convention.

```typescript
const normalizedTool = tool.replace(/-/g, "_");

if (normalizedTool === "ask_user") { ... }
if (normalizedTool === "send_turtle") { ... }
if (normalizedTool === "bot_control") { ... }
```

**Risk**: If MCP tool names change from kebab-case to camelCase or other formats, matching silently fails.

**Suggested Fix**:
```typescript
const normalizedTool = tool.toLowerCase().replace(/[-_]/g, "_");
console.log(`Processing MCP tool: ${tool} (normalized: ${normalizedTool})`);
```

---

### 3. Timing Assumptions in MCP Polling

**File**: `src/drivers/codex-driver.ts`
**Lines**: 32, 54, 73, 123
**Severity**: MEDIUM

**Issue**:
The driver uses hardcoded delays (200ms initial, 100ms retry, 300ms final) to wait for MCP server file writes. These are fragile timing assumptions.

```typescript
// Small delay to let MCP server write the file
await new Promise((resolve) => setTimeout(resolve, 200));

// Retry a few times in case of timing issues
for (let attempt = 0; attempt < 3; attempt++) {
  const buttonsSent = await checkPendingAskUserRequests(...);
  if (buttonsSent) {
    return true;  // Only breaks if successful
  }
  if (attempt < 2) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
```

**Risk**: On slow systems, 200ms might not be enough; on fast systems, it's wasted time.

**Suggested Fix**:
- Use file existence/content change detection instead of fixed delays
- Or make delays configurable via environment variables
- Or implement exponential backoff

---

## Low Issues

### 4. Code Duplication: Triple Pending Checks

**File**: `src/drivers/codex-driver.ts`
**Lines**: 92-105 (polling loop), 124-131 (final flush)
**Severity**: LOW

**Issue**:
The same pending request checks are done three times:
1. In the background polling loop (lines 95-97)
2. After sendMessage (lines 125-127)
3. In MCP completion callback (lines 25-89)

This is intentional for robustness but creates maintenance burden.

**Suggested Fix**:
Extract the check sequence into a helper function:
```typescript
async function flushPendingMcpRequests() {
  await checkPendingAskUserRequests(ctx, chatId);
  await checkPendingSendTurtleRequests(ctx, chatId);
  await checkPendingBotControlRequests(codexSession, chatId);
}
```

---

### 5. Missing Validation: lastUsage Property Access

**File**: `src/drivers/claude-driver.ts`, `src/drivers/codex-driver.ts`
**Lines**: 50-64, 163-177
**Severity**: LOW

**Issue**:
The drivers access `lastUsage` properties without validating structure.

```typescript
lastUsage: session.lastUsage
  ? {
      inputTokens: session.lastUsage.input_tokens || 0,  // Assumes property exists
      outputTokens: session.lastUsage.output_tokens || 0,
      cacheReadInputTokens: session.lastUsage.cache_read_input_tokens,
    }
  : null,
```

**Risk**: If session.lastUsage has wrong structure, runtime error occurs.

**Suggested Fix**:
```typescript
lastUsage: session.lastUsage && typeof session.lastUsage === "object"
  ? {
      inputTokens: Number(session.lastUsage.input_tokens) || 0,
      outputTokens: Number(session.lastUsage.output_tokens) || 0,
      cacheReadInputTokens: session.lastUsage.cache_read_input_tokens,
    }
  : null,
```

---

### 6. Global State Mutation: Process.env TELEGRAM_CHAT_ID

**File**: `src/drivers/codex-driver.ts`
**Line**: 22
**Severity**: LOW

**Issue**:
The driver mutates global process.env to pass context to MCP handlers.

```typescript
process.env.TELEGRAM_CHAT_ID = String(input.chatId);
```

While this works (drivers are singletons), it's fragile and could cause issues if drivers were ever instantiated multiple times.

**Suggested Fix**:
- Pass chatId through Context instead of global env
- Or use AsyncLocalStorage for context isolation

---

## Summary by Category

| Category | Count |
|----------|-------|
| **Error Handling** | 1 medium |
| **Naming/Convention** | 1 medium |
| **Timing** | 1 medium |
| **Code Quality** | 1 low |
| **Validation** | 1 low |
| **Architecture** | 1 low |

---

## Recommended Fixes

1. **MEDIUM**: Improve error detection heuristics with more specific patterns
2. **MEDIUM**: Validate tool names more robustly, log unexpected tools
3. **MEDIUM**: Replace hardcoded delays with file existence checks or backoff
4. **LOW**: Extract repeated pending check sequences into helper function
5. **LOW**: Validate lastUsage structure before accessing properties
6. **LOW**: Consider alternative to global process.env for passing chatId context

---

## Overall Code Quality Assessment

**Driver Layer Summary**: Clean abstraction with solid error handling patterns. The layer successfully isolates Claude and Codex differences, making the handler layer driver-agnostic. Main issues are cosmetic (duplication) and robustness (timing assumptions).

---

## Files to Review Next

- [ ] MCP servers: `ask_user_mcp/`, `send_turtle_mcp/`, `bot_control_mcp/` <- current
