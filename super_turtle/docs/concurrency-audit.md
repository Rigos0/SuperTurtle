# Concurrency Audit

Status: in progress.

Completed in this revision:
- Backlog item 1: mapped shared mutable state and access patterns.

Pending:
- Race-condition and TOCTOU analysis for each module (backlog items 2+).

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

## Notes for Next Backlog Item

The shared-state map above is the baseline for item 2 (`deferred-queue.ts` race audit). Focus areas:
- `drainDeferredQueue` guard sequence (`src/deferred-queue.ts:73-77`)
- interplay between `isAnyDriverRunning()` checks and `session.startProcessing()` in queue drain (`79-87`)
- concurrent cron/user entry points that can call drain in parallel.
