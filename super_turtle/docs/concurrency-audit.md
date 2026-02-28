# Concurrency Audit

Status: in progress.

Completed in this revision:
- Backlog item 1: mapped shared mutable state and access patterns.
- Backlog item 2: audited `deferred-queue.ts` drain/enqueue concurrency and cron interaction.
- Backlog item 3: audited `handlers/text.ts` retry/interrupt overlap and shared `lastMessage`.
- Backlog item 4: audited `handlers/driver-routing.ts` (`isAnyDriverRunning`, preemption, stop fallback).

Pending:
- Race-condition and TOCTOU analysis for remaining modules (backlog items 5+).

## Shared Mutable State Inventory

### `src/session.ts` (ClaudeSession singleton)

Module-level mutable state:
- `session` singleton instance (`src/session.ts:840`), shared by many handlers/drivers.

File-backed mutable state:
- Preferences file (`PREFS_FILE`) is read at startup (`src/session.ts:120-127`) and written by setters (`src/session.ts:129-135`, `src/session.ts:173-190`).
- Session history file (`SESSION_FILE`) is read/written in `loadSessionHistory` and `saveSession` (`src/session.ts:729-781`).

Class fields (mutable):

| State | Declared | Mutated In | Read/Exposed In |
| --- | --- | --- | --- |
| `sessionId` | `src/session.ts:155` | `375`, `460`, `719`, `812` | `225-227`, `355`, `364-371`, persistence methods (`729+`) |
| `lastActivity` | `156` | `695`, `720`, `814` | status via driver snapshots (`src/drivers/claude-driver.ts:55`) |
| `queryStarted` | `157` | `391`, `679` | status (`src/handlers/commands.ts:1568-1569`) |
| `currentTool` | `158` | `392`, `531`, `680` | status (`src/handlers/commands.ts:1572-1573`) |
| `lastTool` | `159` | `532` | internal diagnostics/logging |
| `lastError` | `160` | `672`, `690`, `696` | status snapshots (`src/drivers/claude-driver.ts:56`) |
| `lastErrorTime` | `161` | `673`, `691`, `697` | status snapshots (`src/drivers/claude-driver.ts:57`) |
| `lastUsage` | `162` | `635` | status snapshots (`src/drivers/claude-driver.ts:58-63`) |
| `lastMessage` | `163` | external write in text handler (`src/handlers/text.ts:122`) | used for retry flow in text handler path |
| `conversationTitle` | `164` | `721`, `813`, plus external writes (`src/handlers/text.ts:129`, `src/handlers/voice.ts:147`, `src/handlers/audio.ts:106`, `src/handlers/video.ts:123`, `src/handlers/photo.ts:81`, `src/handlers/document.ts:260,346`) | used by `saveSession` (`src/session.ts:741`) |
| `_activeDriver` | `167` | constructor init (`196`), setter (`187`) and external writes through setter (`src/handlers/callback.ts:169,177,480,548`, `src/handlers/commands.ts:611,619`, `src/handlers/streaming.ts:319,331`) | `get activeDriver` (`185`) and routing (`src/handlers/driver-routing.ts:153,181`) |
| `_model` | `170` | constructor (`194`), setter (`175`), external via setter (`src/handlers/callback.ts:66`) | `get model` (`173`), options build (`346`) |
| `_effort` | `171` | constructor (`195`), setter (`181`), external via setter (`src/handlers/callback.ts:69,84`) | `get effort` (`179`), options build (`356`) |
| `abortController` | `202` | `389`, `678` | stop path (`278-281`), query setup (`410`) |
| `isQueryRunning` | `203` | `312`, `384`, `677` | `isRunning` (`229-231`), stop path (`278`) |
| `stopRequested` | `204` | `242`, `258`, `279`, `287`, `383`, `390` | pre-query cancel check (`379`), loop checks (`453`, `663`) |
| `_isProcessing` | `205` | `266`, `268` | `isRunning` (`229-231`), stop path (`286`) |
| `_wasInterruptedByNewMessage` | `206` | `239`, `251` | `consumeInterruptFlag` (`237-245`) |
| `_typingController` | `209` | setter (`211-213`), cleared in `stopTyping` (`221`) plus external writes via setter (`src/handlers/text.ts:137,256`, `src/deferred-queue.ts:87,117`, `src/handlers/callback.ts:302,342,474,494,542,562`) | stop path (`218-223`) |

Singleton sharing pattern (`session`):
- Imported broadly (`src/index.ts:32`, `src/handlers/text.ts:6`, `src/handlers/voice.ts:7`, `src/deferred-queue.ts:2`, `src/drivers/claude-driver.ts:1`, plus other handlers).
- Both read and write access exist outside `session.ts` (not just method calls). Most common external writes are:
  - response metadata (`lastMessage`, `conversationTitle`)
  - lifecycle (`startProcessing()`, `typingController`)
  - driver preferences (`activeDriver`, `model`, `effort`)

### `src/codex-session.ts` (CodexSession singleton)

Module-level mutable state:
- `cachedModelCatalog` cache (`src/codex-session.ts:317-322`), read in `getAvailableCodexModelsLive` (`575-578`), overwritten on fetch success (`583-586`).
- `codexSession` singleton instance (`src/codex-session.ts:1324`).

File-backed mutable state:
- Codex prefs (`CODEX_PREFS_FILE`) read/write (`src/codex-session.ts:41-56`).
- Codex session history (`CODEX_SESSION_FILE`) read/write (`src/codex-session.ts:1143-1194`).

Class fields (mutable):

| State | Declared | Mutated In | Read/Exposed In |
| --- | --- | --- | --- |
| `codex` | `src/codex-session.ts:597` | `688`, `693` | `ensureInitialized` guard (`670`) and thread creation/resume (`716`, `767`) |
| `thread` | `598` | `716`, `767`, `1280` | `sendMessage` guard (`811`), `isActive` (`1304-1306`) |
| `threadId` | `599` | `642`, `732`, `777`, `1281` | prefs/session persistence (`617`, `628`, `739`, `1144+`), getters (`1297-1299`) |
| `systemPromptPrepended` | `600` | `733`, `778`, `853`, `1282` | first-turn prompt branch (`831`) |
| `_model` | `601` | constructor (`638`), setter (`615`) and external setter use (`src/handlers/callback.ts:105`) | getter (`613`), thread config (`712`, `764`) |
| `_reasoningEffort` | `602` | constructor (`639`), setter (`626`) and external setter use (`src/handlers/callback.ts:136`) | getter (`624`), thread config (`713`, `765`) |
| `abortController` | `603` | `857` | stop path (`659-662`), streamed run signal (`863`) |
| `stopRequested` | `604` | `660`, `858`, `927` | loop abort checks (`940`, `1126`) |
| `isQueryRunning` | `605` | `809`, `816`, `820`, `1135` | stop guard (`659`), getter (`1311-1312`) |
| `queryStarted` | `606` | `859`, `1136` | getter (`1318-1319`) |
| `lastActivity` | `607` | `1110` | status snapshot (`src/drivers/codex-driver.ts:168`) |
| `lastError` | `608` | `746`, `783`, `1091`, `1111`, `1130` | status snapshot (`src/drivers/codex-driver.ts:169`) |
| `lastErrorTime` | `609` | `747`, `784`, `1092`, `1112`, `1131` | status snapshot (`src/drivers/codex-driver.ts:170`) |
| `lastMessage` | `610` | `826` | debug/diagnostics consumers |
| `lastUsage` | `611` | `1063` | status snapshot (`src/drivers/codex-driver.ts:171-174`) |

Singleton sharing pattern (`codexSession`):
- Primary mutating call-sites outside class:
  - driver run/stop/kill (`src/drivers/codex-driver.ts:109,137,145`)
  - model/reasoning changes and resume in callback handler (`src/handlers/callback.ts:105,136,522`)
  - new-thread operations in commands/streaming (`src/handlers/commands.ts:618`, `src/handlers/streaming.ts:318`)

### `src/deferred-queue.ts` (module-global queue state)

Module-level mutable state:
- `queues: Map<number, DeferredMessage[]>` (`src/deferred-queue.ts:19`)
- `drainingChats: Set<number>` (`src/deferred-queue.ts:20`)

Mutation/read map:

| State | Mutated In | Read In | Notes |
| --- | --- | --- | --- |
| `queues` | enqueue path (`23-40`), dequeue path (`49-54`, `51` delete) | size/read (`58-60`), snapshot (`66-69`) | Per-chat array is mutable; map lives for process lifetime |
| `drainingChats` | add before drain loop (`77`), delete in `finally` (`121`) | guard check (`73`) | Re-entrancy guard for `drainDeferredQueue` per chat |

External shared access pattern:
- Voice handler enqueues while busy (`src/handlers/voice.ts:124-132`), then drains in finally (`181`).
- Text handler drains after request completion (`src/handlers/text.ts:257`).
- `/status` command reads a snapshot through `getAllDeferredQueues` (`src/handlers/commands.ts:1596`).

## Deferred Queue Concurrency Audit (`src/deferred-queue.ts`)

### Question 1: Can `drainDeferredQueue` race with `handleText`?

Conclusion: no same-chat re-entrancy race was found in current code.

Evidence:
- `handleText` calls `drainDeferredQueue` only in `finally` after clearing processing/typing (`src/handlers/text.ts:252-257`).
- `drainDeferredQueue` does guard check and `drainingChats.add(chatId)` synchronously, before the first `await` (`src/deferred-queue.ts:73-77`).
- For each dequeued item, it sets `session.startProcessing()` before awaiting driver work (`src/deferred-queue.ts:85-93`), so `isAnyDriverRunning()` flips true promptly via `session.isRunning` (`src/session.ts:229-231`, `265-269`; `src/handlers/driver-routing.ts:156-158`).

Why this matters:
- In a single Node/Bun event loop, there is no preemption inside that synchronous block. Another handler cannot observe the chat as "not draining" between line 73 and line 77.

### Question 2: What if two cron jobs fire simultaneously and both call `drainDeferredQueue`?

Conclusion: this path does not exist in current code.

Evidence:
- Cron execution uses `runMessageWithDriver(...)` directly for both silent and non-silent jobs (`src/index.ts:706-818`).
- `drainDeferredQueue` is invoked from text/voice handler finalizers (`src/handlers/text.ts:257`, `src/handlers/voice.ts:181`), not from cron loop.

Note:
- The cron comment claiming non-silent jobs route through `handleText` is stale (`src/index.ts:611-612`), but implementation is direct driver invocation.

### Question 3: Is `drainingChats` a sufficient guard?

Conclusion:
- Sufficient for preventing duplicate drains of the same chat.
- Not sufficient for global forward progress across chats.

## Finding DQ-1 (Medium): Cross-chat deferred queue starvation/liveness gap

Where:
- Enqueue happens in voice handler when any driver is running (`src/handlers/voice.ts:124-132`).
- Drain attempts are per-chat and opportunistic (`src/handlers/text.ts:257`, `src/handlers/voice.ts:181`).
- Drain bails immediately if any driver is running (`src/deferred-queue.ts:73-74`).

Scenario:
1. Chat A is running a long task.
2. Voice from chat B arrives, gets queued (`enqueueDeferredMessage`), then `drainDeferredQueue(chatB)` returns early because A is running.
3. A later finishes and drains chat A only.
4. If no further text/voice events arrive in chat B, chat B's deferred queue can remain indefinitely.

Impact:
- "Queued" voice transcripts are not guaranteed to run after current work completes unless another event later triggers a drain for that same chat.
- This is a concurrency/liveness issue (progress depends on unrelated future traffic).

Recommended fix:
1. Add a global idle drain scheduler in `src/deferred-queue.ts` that scans queued chat IDs and drains one-by-one whenever the system transitions to idle.
2. Trigger that scheduler from a central completion point (for example after `runMessageWithDriver` completes in cron/text/voice flows), not only from the current chat finalizer.
3. Keep `drainingChats` as the per-chat re-entrancy guard, but combine it with a process-wide "drain loop active" guard to avoid redundant global sweep invocations.

## Text Handler Concurrency Audit (`src/handlers/text.ts`)

### Question 1: Can stall recovery overlap with a new incoming message?

Conclusion: yes, overlap is possible on the `!` interrupt path and can allow the stalled request to continue retrying while the new message starts.

Evidence:
- `!` messages bypass per-chat sequentialization (`src/index.ts:536-539`), so they can execute concurrently with an in-flight `handleText`.
- The retry loop in `handleText` resets local `state`/`statusCallback` and immediately `continue`s on stall (`src/handlers/text.ts:175-213`), without checking whether the request was superseded.
- Interrupt handling sets `stopRequested`, then unconditionally clears it after a fixed sleep (`src/utils.ts:227-235`).
- A stop request set during `_isProcessing` only cancels if it is still present when `sendMessageStreaming` reaches the pre-start check (`src/session.ts:286-290`, `378-385`).

Race timeline:
1. Request A stalls and enters retry catch path (`src/handlers/text.ts:163-213`).
2. User sends `!new message`; `checkInterrupt` runs concurrently, marks interrupt, calls `session.stop()` (often returns `"pending"` in this gap), then clears `stopRequested` (`src/utils.ts:227-235`).
3. Request A continues retry path and can start a new attempt because no ownership/interruption guard exists before `continue`.
4. Request B also proceeds, so both runs can overlap in the shared singleton/session surface.

Impact:
- The "interrupt current run and replace with new message" contract is not guaranteed during stall recovery windows.
- Overlap increases risk of duplicate side effects and inconsistent status/cleanup behavior.

Recommended fix:
1. Add per-request ownership token/epoch in `handleText` and `session` (or driver-routing), and refuse retries if ownership changed.
2. Remove fixed-time `clearStopRequested()` usage for interrupts; clear only when the superseding request has actually acquired execution ownership.
3. Before each retry `continue`, explicitly re-check interruption/supersession state and abort the older request if set.

## Finding TX-1 (High): Interrupted stalled run can continue retrying concurrently with superseding `!` message

Where:
- Retry continue path (`src/handlers/text.ts:175-213`)
- Interrupt flow (`src/utils.ts:227-235`)
- Stop pre-start gate (`src/session.ts:378-385`)
- Sequentialization bypass for interrupts (`src/index.ts:536-539`)

Why this is a race:
- Stop intent is represented by one mutable shared flag (`stopRequested`) and is cleared on timer, not by request ownership.
- Retry logic has no "still current request?" guard.

### Question 2: Can `session.lastMessage` be clobbered unsafely?

Conclusion: yes. `session.lastMessage` is a shared singleton field and is overwritten on every text request with no concurrency guard.

Evidence:
- Global write in text handler: `session.lastMessage = message` (`src/handlers/text.ts:122`).
- Field is process-global mutable state on singleton (`src/session.ts:163`).
- `handleText` is not globally serialized: only non-command/non-`!` text is per-chat sequentialized (`src/index.ts:531-553`), so cross-chat and bypass paths can overlap.

Impact:
- Current impact is low because no live reader exists today.
- Future readers (debug, retry resume, crash recovery) can observe unrelated prompt data from another in-flight request.

Recommended fix:
1. Either remove `lastMessage` (if unused), or scope it by driver/chat/request (`Map` keyed by run identity) instead of singleton scalar.
2. If retained, only update once request ownership is established and clear it in request finalizers to avoid stale cross-run bleed.

## Finding TX-2 (Low): `session.lastMessage` is unsafely shared mutable state

Where:
- Declaration: `src/session.ts:163`
- Write site: `src/handlers/text.ts:122`

Why this is unsafe:
- Non-atomic shared overwrite with no ownership semantics in a concurrently-invoked handler path.

## Driver Routing Concurrency Audit (`src/handlers/driver-routing.ts`)

### Question 1: Can one driver's `isRunning` getter lag and make `isAnyDriverRunning()` miss active work?

Conclusion:
- No direct getter-lag bug was found in `isAnyDriverRunning()` itself.
- Both drivers now acquire query locks at method entry (`src/session.ts:300-313`, `src/codex-session.ts:799-810`), and `isAnyDriverRunning()` is a direct OR (`src/handlers/driver-routing.ts:156-158`).
- Remaining risk is in stop/preemption handoff rather than the getter read.

## Finding DR-1 (High): Codex pre-abort window can make stop/preempt report "nothing to stop" while a run is active

Where:
- Codex stop requires both `isQueryRunning` and `abortController` (`src/codex-session.ts:657-667`).
- Codex marks running before creating abort controller (`src/codex-session.ts:809`, `857`), with async thread setup in between (`811-815`).
- Driver-routing stop path relies on that result (`src/handlers/driver-routing.ts:174-182`).

Race scenario:
1. Codex run starts and sets `isQueryRunning = true` (`src/codex-session.ts:809`).
2. Before `abortController` is assigned (`857`), user callback/background preempt calls `stopActiveDriverQuery`.
3. `codexSession.stop()` returns `false` (`659-666`) even though the run is active.
4. Caller can proceed as if no active run exists, and start new work.

Impact:
- Preemption can silently fail in an active run window.
- Follow-up work (for example callback answer continuation) can overlap with the still-running Codex turn.

Recommended fix:
1. Mirror Claude semantics in Codex stop: if `isQueryRunning` but abort controller is not ready, set `stopRequested = true` and return `"pending"` (similar to `src/session.ts:285-290`).
2. Add an early `stopRequested` check in Codex `sendMessage` before entering streamed run (parallel to `src/session.ts:378-385`).
3. Treat `"pending"` as a successful preemption request in caller paths.

## Finding DR-2 (High): Time-based preemption handshake leaves a race window for overlapping runs

Where:
- Preemption helper uses one fixed sleep after stop request (`src/handlers/driver-routing.ts:166-169`).
- Callback handler does the same pattern before starting replacement work (`src/handlers/callback.ts:293-298`, `309-316`).
- Drivers also use fixed sleep after stop (`src/drivers/claude-driver.ts:25-29`, `src/drivers/codex-driver.ts:136-140`).

Why this is a race:
- `stop()` acknowledges an abort request, not guaranteed completion of stream teardown.
- A fixed 100ms delay is not a synchronization guarantee; teardown can exceed that budget.
- New work can be started immediately after sleep without re-checking quiescence.

Impact:
- Concurrent overlapping runs are still possible during stop/preempt transitions.
- Increases risk of duplicate side effects and interleaved status output.

Recommended fix:
1. Replace fixed sleeps with a bounded wait loop that polls `isAnyDriverRunning()` until false (or timeout).
2. Gate replacement work on confirmed idle state, not just "stop requested".
3. If timeout hits, queue/defer the new request instead of starting immediately.

## Finding DR-3 (Medium): `stopActiveDriverQuery()` fallback target can be wrong if `activeDriver` changes mid-call

Where:
- Current driver is captured first (`src/handlers/driver-routing.ts:175`), then `await current.stop()` (`176`), then fallback is computed from mutable `session.activeDriver` (`181`).
- `session.activeDriver` can change at runtime from command/callback handlers (`src/handlers/callback.ts:164-177`, `src/handlers/commands.ts:608-620`).

Race scenario:
1. `stopActiveDriverQuery` captures current driver object.
2. While awaiting `current.stop()`, another update switches `session.activeDriver`.
3. Fallback driver ID is derived from the new driver selection, not the originally captured one.
4. Fallback call can target the same driver twice and skip the other driver's stop path.

Impact:
- "Stop both possibilities" behavior is not deterministic under concurrent driver switches.

Recommended fix:
1. Capture `currentDriverId` once at function entry.
2. Derive fallback from that captured ID only.
3. Optionally stop both drivers in deterministic order when preempting background runs.
