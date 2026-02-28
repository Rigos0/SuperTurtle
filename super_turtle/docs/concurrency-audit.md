# Concurrency Audit

Status: in progress.

Completed in this revision:
- Backlog item 1: mapped shared mutable state and access patterns.
- Backlog item 2: audited `deferred-queue.ts` drain/enqueue concurrency and cron interaction.

Pending:
- Race-condition and TOCTOU analysis for each module (backlog items 3+).

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
