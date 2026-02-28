# Concurrency Audit Report

Scope: `super_turtle/claude-telegram-bot`.

This report consolidates the completed module audits into one document with:
- Shared State Map
- Findings (severity, file, line, description, recommended fix)
- Summary

Note: the already-fixed `isQueryRunning` TOCTOU race in `session.ts` and `codex-session.ts` is intentionally excluded from findings.

## Shared State Map

### `src/session.ts` (`ClaudeSession` singleton)

Module-level shared mutable state:
- `session` singleton (`src/session.ts:840`) shared across handlers/drivers.

File-backed mutable state:
- `PREFS_FILE` read/write via `loadPrefs` and setters (`src/session.ts:173-190`).
- `SESSION_FILE` read/write via `loadSessionHistory`/`saveSession` (`src/session.ts:729-781`).

Class mutable state and access patterns:

| Variable | Declared | Mutated | Read/Exposed |
| --- | --- | --- | --- |
| `sessionId` | `src/session.ts:155` | new/resume/kill flows (`375`, `719`, `812`) | `isActive` (`225-227`), send path (`364-376`), persistence (`729+`) |
| `lastActivity` | `156` | response/restore flows (`720`, `814`) | driver status snapshot (`src/drivers/claude-driver.ts:55`) |
| `queryStarted` | `157` | send start/finally (`391`, `679`) | `/status` snapshot paths |
| `currentTool` | `158` | stream processing (`392`, `531`, `680`) | `/status` snapshot paths |
| `lastTool` | `159` | stream processing (`532`) | diagnostics |
| `lastError` | `160` | error paths (`672`, `690`, `696`) | driver status snapshot (`src/drivers/claude-driver.ts:56`) |
| `lastErrorTime` | `161` | error paths (`673`, `691`, `697`) | driver status snapshot (`src/drivers/claude-driver.ts:57`) |
| `lastUsage` | `162` | usage extraction (`635`) | driver status snapshot (`src/drivers/claude-driver.ts:58-63`) |
| `lastMessage` | `163` | text handler write (`src/handlers/text.ts:122`) | singleton shared field |
| `conversationTitle` | `164` | session title writes (`src/handlers/text.ts:129`, `src/handlers/voice.ts:147`, media handlers) and resume (`src/session.ts:813`) | session persistence (`src/session.ts:741`) |
| `_activeDriver` | `167` | constructor/setter and callbacks/commands (`src/session.ts:187`, `src/handlers/callback.ts:480,548`, `src/handlers/commands.ts:611,619`) | routing (`src/handlers/driver-routing.ts:83,153,181`) |
| `_model` | `170` | constructor/setter (`194`, `175`) and callback settings | send options (`src/session.ts:346`) |
| `_effort` | `171` | constructor/setter (`195`, `181`) and callback settings | send options (`src/session.ts:356`) |
| `abortController` | `202` | query setup/cleanup (`389`, `678`) | stop path (`278-281`) |
| `isQueryRunning` | `203` | send lock/finally (`312`, `384`, `677`) | `isRunning` (`229-231`) |
| `stopRequested` | `204` | stop/interrupt/query lifecycle (`242`, `258`, `279`, `287`, `383`, `390`) | pre-start cancel check (`378-385`) |
| `_isProcessing` | `205` | `startProcessing` (`266`, `268`) | `isRunning` (`229-231`) |
| `_wasInterruptedByNewMessage` | `206` | interrupt helpers (`239`, `251`) | `consumeInterruptFlag` (`237-245`) |
| `_typingController` | `209` | setter and stop paths (`211-213`, `218-223`) and external handler writes (`src/handlers/text.ts:137,257`, `src/handlers/callback.ts:302,342,474,494,542,562`) | stop handling (`218-223`) |

### `src/codex-session.ts` (`CodexSession` singleton)

Module-level shared mutable state:
- `cachedModelCatalog` cache (`src/codex-session.ts:317-322`, updated in model fetch path).
- `codexSession` singleton (`src/codex-session.ts:1324`).

File-backed mutable state:
- `CODEX_PREFS_FILE` via `loadCodexPrefs`/`saveCodexPrefs`.
- `CODEX_SESSION_FILE` via `loadSessionHistory`/`saveSession` (`src/codex-session.ts:1143-1194`).

Class mutable state and access patterns:

| Variable | Declared | Mutated | Read/Exposed |
| --- | --- | --- | --- |
| `codex` | `src/codex-session.ts:597` | init (`688`, `693`) | initialization and thread ops |
| `thread` | `598` | start/resume/kill (`716`, `767`, `1280`) | `isActive` (`1304-1306`), send path (`811`) |
| `threadId` | `599` | constructor/start/resume/kill (`642`, `732`, `777`, `1281`) | prefs/history/getters (`617`, `628`, `739`, `1144+`, `1297-1299`) |
| `systemPromptPrepended` | `600` | first-send/kill (`853`, `1282`) | first-turn branch (`831`) |
| `_model` | `601` | constructor/setter (`638`, `615`) | thread config (`712`, `764`) |
| `_reasoningEffort` | `602` | constructor/setter (`639`, `626`) | thread config (`713`, `765`) |
| `abortController` | `603` | send setup (`857`) | stop path (`659-662`, signal at `863`) |
| `stopRequested` | `604` | stop/send/stall handling (`660`, `858`, `927`) | cancellation handling (`1126`) |
| `isQueryRunning` | `605` | send lock/finally (`809`, `816`, `820`, `1135`) | `isRunning` getter (`1311-1312`) |
| `queryStarted` | `606` | send lifecycle (`859`, `1136`) | `runningSince` (`1318-1319`) |
| `lastActivity` | `607` | response completion (`1110`) | driver status snapshot (`src/drivers/codex-driver.ts:168`) |
| `lastError` | `608` | init/send error paths (`746`, `783`, `1091`, `1111`, `1130`) | driver status snapshot (`src/drivers/codex-driver.ts:169`) |
| `lastErrorTime` | `609` | error paths (`747`, `784`, `1092`, `1112`, `1131`) | driver status snapshot (`src/drivers/codex-driver.ts:170`) |
| `lastMessage` | `610` | send path write (`826`) | diagnostics |
| `lastUsage` | `611` | usage extraction (`1063`) | driver status snapshot (`src/drivers/codex-driver.ts:171-174`) |

### `src/deferred-queue.ts` (module-global queue state)

Module-level shared mutable state:
- `queues: Map<number, DeferredMessage[]>` (`src/deferred-queue.ts:19`)
- `drainingChats: Set<number>` (`src/deferred-queue.ts:20`)

Access patterns:
- Enqueue/dequeue/peek mutate and read `queues` (`src/deferred-queue.ts:22-69`).
- Drain re-entrancy guard mutates and reads `drainingChats` (`src/deferred-queue.ts:72-122`).
- Producers/consumers in voice/text handlers (`src/handlers/voice.ts:124-132,181`, `src/handlers/text.ts:257`).

### Process-wide singleton sharing pattern

- `session` and `codexSession` are imported broadly from handlers, drivers, and index loop.
- State writes happen outside class internals (for example `session.activeDriver`, `session.typingController`, `session.lastMessage`, `session.conversationTitle`).
- Admission control relies on process-global checks (`isAnyDriverRunning`) rather than strict global queueing.

## Findings

### DQ-1
- Severity: Medium
- File/line: `src/deferred-queue.ts:72-79`, `src/handlers/voice.ts:124-132`, `src/handlers/text.ts:257`
- Description: Per-chat drain logic plus global busy short-circuit can leave queued work in another chat indefinitely (liveness gap) when no future event retriggers that chat's drain.
- Recommended fix: Add a global idle drain scheduler that scans queued chat IDs and drains while system is idle; keep `drainingChats` for per-chat re-entrancy.

### TX-1
- Severity: High
- File/line: `src/handlers/text.ts:175-213`, `src/utils.ts:227-235`, `src/session.ts:378-385`, `src/index.ts:536-539`
- Description: On stall retry, an interrupted request can continue retrying while a superseding `!` message starts, because interruption is modeled as a shared flag cleared by timer and retry loop lacks request ownership checks.
- Recommended fix: Introduce request ownership/epoch tokens and abort retries when ownership changed; remove timer-based stop-flag clearing in this handoff.

### TX-2
- Severity: Low
- File/line: `src/session.ts:163`, `src/handlers/text.ts:122`
- Description: `session.lastMessage` is a process-global mutable scalar overwritten by concurrent text flows without ownership semantics.
- Recommended fix: Remove if unused or scope by run identity/chat instead of singleton scalar.

### DR-1
- Severity: High
- File/line: `src/codex-session.ts:657-667`, `src/codex-session.ts:809,857`, `src/handlers/driver-routing.ts:174-182`
- Description: Codex `stop()` can return false while run is active in a pre-abort-controller window (`isQueryRunning=true`, `abortController=null`), so preemption may falsely report nothing to stop.
- Recommended fix: Mirror Claude semantics: return `"pending"` when query is running but abort handle not ready, and honor that as a valid preemption state.

### DR-2
- Severity: High
- File/line: `src/handlers/driver-routing.ts:166-169`, `src/handlers/callback.ts:293-298`, `src/drivers/claude-driver.ts:25-29`, `src/drivers/codex-driver.ts:136-140`
- Description: Fixed sleep (`100ms`) is used as a stop/preempt handshake; this is not a synchronization barrier and allows overlap when teardown takes longer.
- Recommended fix: Replace fixed sleeps with bounded wait-for-idle polling (`isAnyDriverRunning()==false`) and timeout fallback to defer/queue new work.

### DR-3
- Severity: Medium
- File/line: `src/handlers/driver-routing.ts:175-182`, `src/session.ts:185-187`, `src/handlers/callback.ts:480,548`, `src/handlers/commands.ts:611,619`
- Description: `stopActiveDriverQuery()` derives fallback driver using mutable `session.activeDriver` after awaiting current stop, so concurrent driver switch can mis-target fallback.
- Recommended fix: Capture active driver ID at function entry and derive fallback from captured value only; optionally stop both drivers deterministically.

### CR-1
- Severity: Medium
- File/line: `src/index.ts:623,629-642`, `src/handlers/callback.ts:580-593`
- Description: Cron loop snapshots due jobs once, then awaits per-job execution. A job canceled during that await can still execute from stale snapshot.
- Recommended fix: Re-check job existence immediately before execution, and use claim-then-execute semantics instead of long-lived stale iteration.

### CR-2
- Severity: Medium
- File/line: `src/index.ts:637-642`, `src/index.ts:770-777`, `src/index.ts:821-827`, `src/handlers/driver-routing.ts:160-171`
- Description: Cron jobs are removed/advanced before execution; if preempted by interactive traffic, one-shot runs can be lost and recurring runs silently skip intervals.
- Recommended fix: Track execution outcome (`success`/`failed`/`preempted`) and requeue preempted work rather than treating it as completed.

### ST-1
- Severity: Low
- File/line: `src/handlers/streaming.ts:436-443`, `src/handlers/streaming.ts:531-681`
- Description: `createStatusCallback` mutates shared callback state (`toolMessages`, maps) without internal serialization/finalization guard; currently safe only because producers await callbacks sequentially.
- Recommended fix: Add internal callback queue/mutex and finalized flag so callback ordering remains safe even if producer behavior changes.

### SP-1
- Severity: High
- File/line: `src/handlers/stop.ts:71-78`, `src/handlers/driver-routing.ts:174-183`, `src/index.ts:531-550`
- Description: `stopAllRunningWork()` returns after issuing stop request, without waiting for actual quiescence. New interactive work can start before prior run fully exits.
- Recommended fix: Add bounded wait-for-idle in stop flow and gate post-stop admissions using run ownership/epoch semantics.

### SP-2
- Severity: Medium
- File/line: `src/session.ts:285-290`, `src/drivers/claude-driver.ts:25-29`, `src/session.ts:378-385`
- Description: Timer-based `clearStopRequested()` can erase pending cancellation before the pre-start check consumes it, causing stop intent to be lost.
- Recommended fix: Remove timer-based clearing and clear stop intent only at deterministic ownership boundaries.

### VC-1
- Severity: Medium
- File/line: `src/handlers/callback.ts:473-488`, `src/handlers/callback.ts:541-556`, `src/index.ts:548-550`
- Description: Resume recap callback paths dispatch driver work without `isAnyDriverRunning()` gate; callbacks are non-sequentialized, so overlap with active runs is possible.
- Recommended fix: Apply same admission policy as other interactive paths (preempt + wait for quiescence, or defer) before recap dispatch.

## Summary

- Shared mutable state is concentrated in two process-wide session singletons (`session`, `codexSession`) plus deferred-queue globals (`queues`, `drainingChats`).
- The dominant concurrency risk is missing synchronization barriers during stop/preempt handoffs, not data-structure corruption.
- Highest-priority fixes are:
  1. Replace fixed stop/preempt sleeps with explicit wait-for-idle handshakes.
  2. Add request ownership/epoch gating for retries and stop replacement flows.
  3. Close Codex stop pre-abort window by supporting `pending` cancellation semantics.
- Secondary fixes are stale cron snapshot handling, deferred queue liveness guarantees across chats, and defensive serialization in streaming callback internals.
