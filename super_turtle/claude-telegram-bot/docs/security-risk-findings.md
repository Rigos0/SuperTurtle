# Security Risk Findings (Telegram + MCP)

Date: 2026-02-27
Scope: `super_turtle/claude-telegram-bot` runtime and bundled MCP servers (`ask_user_mcp`, `send_turtle_mcp`, `bot_control_mcp`).

## Severity Summary

- High: 2
- Medium: 4
- Low: 1

## Findings

### ST-SEC-001 (High) - Codex path runs with dangerous defaults and no command/file safety gate

Category: injection, file operations

Evidence:
- `src/config.ts:53-96` defaults Codex policy to `danger-full-access`, approval `never`, network `true`.
- `src/codex-session.ts:680-689` and `src/codex-session.ts:731-740` apply those settings when starting/resuming threads.
- `src/codex-session.ts:930-945` only reports command/file events; no equivalent to `checkCommandSafety` / `isPathAllowed` is enforced.

Risk:
- Prompt injection or model misbehavior on Codex can run unrestricted commands and file changes.

Recommended direction:
- Apply the same safety hooks used in Claude flow to Codex tool events, or move default Codex policy to least privilege.

### ST-SEC-002 (High) - Credentials are exposed to high-privilege agent runtime

Category: token handling, injection

Evidence:
- Tokens are loaded from environment (`src/config.ts:36`, `src/config.ts:46`).
- Claude runs with bypass permissions (`src/session.ts:336-337`).
- No env scrubbing/isolation is applied before agent execution (`src/session.ts:331-344`, `src/codex-session.ts:816-818`).
- Telegram file downloads embed bot token in URL (`src/handlers/photo.ts:40-42`, `src/handlers/document.ts:73-75`, `src/handlers/audio.ts:188-190`).

Risk:
- If model output is influenced by malicious input, it can read/exfiltrate secrets from process environment or logs.

Recommended direction:
- Launch agent subprocesses with a reduced env allowlist and avoid passing long-lived tokens unless strictly required.

### ST-SEC-003 (Medium) - MCP `/tmp` IPC trusts local filesystem without integrity checks

Category: update validation, file operations

Evidence:
- Runtime consumes every matching `/tmp` request file by glob (`src/handlers/streaming.ts:73-77`, `src/handlers/streaming.ts:120-122`, `src/handlers/streaming.ts:172-177`).
- It executes privileged bot-control actions from those files (`src/handlers/streaming.ts:186-203`, `src/handlers/streaming.ts:385-407`).
- MCP servers write plain JSON request files into `/tmp` (`ask_user_mcp/server.ts:95-96`, `send_turtle_mcp/server.ts:179-180`, `bot_control_mcp/server.ts:152-153`).

Risk:
- Any local process with same-host access can forge request files and trigger bot actions (including restart/session control) or inject chat output.

Recommended direction:
- Move IPC to a private directory with strict permissions and authenticate request origin (nonce/HMAC/owner check).

### ST-SEC-004 (Medium) - Global chat context is mutable and shared across requests

Category: update validation

Evidence:
- Chat context is written into global env (`src/session.ts:302-304`, `src/drivers/codex-driver.ts:22`).
- MCP servers read that global env for routing (`ask_user_mcp/server.ts:83`, `send_turtle_mcp/server.ts:167`, `bot_control_mcp/server.ts:141`).

Risk:
- In multi-chat/multi-user runs, concurrent requests can overwrite `TELEGRAM_CHAT_ID`, causing cross-chat routing mistakes.

Recommended direction:
- Replace global env routing with per-request IDs passed through structured context.

### ST-SEC-005 (Medium) - Cron job source is implicitly trusted and executes as privileged actor

Category: update validation, injection

Evidence:
- Jobs are loaded from disk (`src/cron.ts:26`, `src/cron.ts:76-95`) and note external writes are expected (`src/cron.ts:74`).
- Due jobs execute with synthesized trusted identity (`src/index.ts:596-607`, `src/index.ts:635-656`).

Risk:
- Local modification of `cron-jobs.json` can inject arbitrary privileged prompts without passing normal Telegram auth path.

Recommended direction:
- Protect cron job store permissions and add authenticity checks for externally written jobs.

### ST-SEC-006 (Medium) - Archive extraction lacks explicit anti-traversal/anti-bomb controls

Category: file operations

Evidence:
- Archive extraction delegates to system tools with permissive flags (`src/handlers/document.ts:145-147`).
- No explicit checks for path traversal entries, symlinks/hardlinks, extracted size ceilings, or extraction count limits before extraction.

Risk:
- Malicious archives may cause filesystem abuse or resource exhaustion.

Recommended direction:
- Pre-validate archive entries and enforce extraction quotas before unpacking.

### ST-SEC-007 (Low) - Callback-derived file paths are not constrained to safe identifiers

Category: file operations, update validation

Evidence:
- `askuser` request id from callback data is used directly in a file path (`src/handlers/callback.ts:213-218`).
- Subturtle name from callback data is interpolated into log path (`src/handlers/callback.ts:325`, `src/handlers/callback.ts:332`).

Risk:
- If callback payload tampering occurs, path traversal/read attempts become possible.

Recommended direction:
- Validate callback identifiers with strict regex (e.g. `^[a-zA-Z0-9_-]+$`) before filesystem use.

## Quick Wins for Next Task (small/low-risk fixes)

1. Add strict regex validation for callback `requestId` and `subturtle` name (ST-SEC-007).
2. Replace global `TELEGRAM_CHAT_ID` with per-request context object in MCP handoff (partial mitigation for ST-SEC-004).
3. Move MCP IPC files from shared `/tmp` to a private runtime dir with mode `0700` (partial mitigation for ST-SEC-003).
