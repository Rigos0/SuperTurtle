# Current Task
Create `src/logger.ts` with shared pino config and subsystem child loggers.

## End Goal with Specs
Every log call in the bot produces structured JSON via pino. A single log file that can be tailed with `pino-pretty` for a clean, colored, real-time view of everything happening — both Claude and Codex activity, cron jobs, MCP tools, SubTurtle operations.

**What changes:**
1. Add `pino` + `pino-pretty` as dependencies
2. Create a shared logger module (`src/logger.ts`) that exports a configured pino instance
3. Replace all `console.log/error/warn` calls with structured pino calls
4. Add request correlation: each user message and cron job gets a unique `reqId` that flows through the entire lifecycle
5. Write to both stdout (for live.sh/tmux capture) AND a dedicated structured log file at `/tmp/claude-telegram-bot.log.jsonl`
6. Add child loggers for each subsystem: `bot`, `cron`, `claude`, `codex`, `mcp`, `streaming`, `commands`

**Logger module spec (`src/logger.ts`):**
```typescript
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    targets: [
      { target: "pino-pretty", options: { destination: 1 } },  // stdout (pretty)
      { target: "pino/file", options: { destination: "/tmp/claude-telegram-bot.log.jsonl" } }  // file (JSON)
    ]
  }
});

// Child loggers for subsystems
export const botLog = logger.child({ module: "bot" });
export const cronLog = logger.child({ module: "cron" });
export const claudeLog = logger.child({ module: "claude" });
export const codexLog = logger.child({ module: "codex" });
export const mcpLog = logger.child({ module: "mcp" });
export const streamLog = logger.child({ module: "streaming" });
export const cmdLog = logger.child({ module: "commands" });
```

**Note on pino + Bun compatibility:** pino works with Bun per community reports. If the transport system has issues (it uses worker threads which Bun may not fully support), fall back to simple `pino({ destination: ... })` without transports and pipe through `pino-pretty` externally: `bun run src/index.ts | pino-pretty`.

**Files to modify (replace console.log/error/warn → pino):**

Core:
- `src/index.ts` — startup, shutdown, cron loop, background runs (~30 calls)
- `src/config.ts` — config loading (~5 calls)
- `src/session.ts` — Claude session lifecycle (~20 calls)
- `src/codex-session.ts` — Codex session lifecycle (~25 calls)
- `src/utils.ts` — audit log, transcription (~5 calls)
- `src/cron.ts` — job loading/saving (~3 calls)
- `src/cron-supervision-queue.ts` — snapshot prep (~3 calls)
- `src/dashboard.ts` — dashboard startup (~2 calls)
- `src/turtle-greetings.ts` — greeting sends (~2 calls)

Drivers:
- `src/drivers/codex-driver.ts` — MCP completions (~5 calls)
- `src/drivers/claude-driver.ts` — (currently no logging, add basic lifecycle)

Handlers:
- `src/handlers/streaming.ts` — MCP polling, message edits (~20 calls)
- `src/handlers/text.ts` — message handling (~5 calls)
- `src/handlers/commands.ts` — command execution (~3 calls)
- `src/handlers/callback.ts` — button callbacks (~10 calls)
- `src/handlers/stop.ts` — stop intent (~2 calls)
- `src/handlers/photo.ts`, `video.ts`, `audio.ts`, `document.ts`, `media-group.ts` — media (~15 calls total)

MCP servers:
- `bot_control_mcp/server.ts` (~1 call)
- `ask_user_mcp/server.ts` (~1 call)
- `send_turtle_mcp/server.ts` (~3 calls)

**Structured fields to include:**
- All logs: `ts`, `level`, `module`, `msg`
- User messages: `userId`, `username`, `msgType`, `reqId`
- Cron jobs: `cronJobId`, `cronType`, `driverUsed`, `reqId`
- Driver activity: `driver` (claude/codex), `sessionId`, `reqId`
- MCP tools: `tool`, `action`, `requestId`
- Errors: `err` (pino serializes error objects automatically)
- Performance: `elapsed` (ms) where timing makes sense

**Acceptance criteria:**
- `bun test` still passes (no broken imports)
- Bot starts and handles messages normally
- `tail -f /tmp/claude-telegram-bot.log.jsonl | npx pino-pretty` shows structured, colored output
- Both Claude and Codex queries appear in logs with driver identified
- Cron jobs show execution with job ID
- Zero `console.log/error/warn` calls remaining in source (except in test files)

## Backlog
- [x] Install pino + pino-pretty: `cd super_turtle/claude-telegram-bot && bun add pino pino-pretty`
- [ ] Create src/logger.ts with pino config and child loggers <- current
- [ ] Replace console calls in core files: index.ts, config.ts, session.ts, codex-session.ts, utils.ts
- [ ] Replace console calls in cron files: cron.ts, cron-supervision-queue.ts, cron-scheduled-prompt.ts
- [ ] Replace console calls in drivers: claude-driver.ts, codex-driver.ts
- [ ] Replace console calls in handlers: streaming.ts, text.ts, commands.ts, callback.ts, stop.ts
- [ ] Replace console calls in media handlers: photo.ts, video.ts, audio.ts, document.ts, media-group.ts
- [ ] Replace console calls in MCP servers: bot_control, ask_user, send_turtle
- [ ] Replace console calls in remaining files: dashboard.ts, turtle-greetings.ts
- [ ] Verify zero console.log/error/warn remaining (grep check)
- [ ] Run `bun test` to verify nothing broke
- [ ] Commit
