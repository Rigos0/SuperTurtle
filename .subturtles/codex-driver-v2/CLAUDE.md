# Current Task

Phase D (continued): Add AbortController support for Codex turns to enable /stop command. Wire AbortSignal through sendMessage streaming loop and thread.runStreamed(). Then: display token usage from lastUsage in /usage and /status commands.

# End Goal with Specs

The user can `/switch codex` and get the same experience as Claude: streaming responses, MCP tools (ask-user buttons, bot-control, send-turtle stickers), model switching, reasoning effort, multi-session history, retry on crash, and proper token usage reporting. The Codex driver should feel like a first-class citizen, not a fallback.

## SDK API Reference (from `@openai/codex-sdk` 0.105.0 types)

The SDK already supports everything we need natively:

```typescript
// Constructor
new Codex(options?: CodexOptions)
type CodexOptions = {
  codexPathOverride?: string;
  baseUrl?: string;
  apiKey?: string;
  config?: CodexConfigObject;  // --config key=value overrides (TOML)
  env?: Record<string, string>;
};

// Thread creation
codex.startThread(options?: ThreadOptions): Thread
codex.resumeThread(id: string, options?: ThreadOptions): Thread
type ThreadOptions = {
  model?: string;                        // e.g. "gpt-5.3-codex"
  sandboxMode?: SandboxMode;             // "read-only" | "workspace-write" | "danger-full-access"
  workingDirectory?: string;
  skipGitRepoCheck?: boolean;
  modelReasoningEffort?: ModelReasoningEffort;  // "minimal" | "low" | "medium" | "high" | "xhigh"
  networkAccessEnabled?: boolean;
  webSearchMode?: WebSearchMode;
  webSearchEnabled?: boolean;
  approvalPolicy?: ApprovalMode;         // "never" | "on-request" | "on-failure" | "untrusted"
  additionalDirectories?: string[];
};

// Running
thread.run(input: Input, turnOptions?: TurnOptions): Promise<Turn>
thread.runStreamed(input: Input, turnOptions?: TurnOptions): Promise<StreamedTurn>
type TurnOptions = { outputSchema?: unknown; signal?: AbortSignal; };
type Turn = { items: ThreadItem[]; finalResponse: string; usage: Usage | null; };
type StreamedTurn = { events: AsyncGenerator<ThreadEvent>; };

// Input types
type Input = string | UserInput[];
type UserInput = { type: "text"; text: string } | { type: "local_image"; path: string };

// Events (for streaming)
type ThreadEvent = ThreadStartedEvent | TurnStartedEvent | TurnCompletedEvent
  | TurnFailedEvent | ItemStartedEvent | ItemUpdatedEvent | ItemCompletedEvent | ThreadErrorEvent;

// Items (emitted via events)
type ThreadItem = AgentMessageItem | ReasoningItem | CommandExecutionItem
  | FileChangeItem | McpToolCallItem | WebSearchItem | TodoListItem | ErrorItem;

// Usage tracking
type Usage = { input_tokens: number; cached_input_tokens: number; output_tokens: number; };
```

## MCP Configuration for Codex

Codex reads MCP servers from `~/.codex/config.toml` OR can be passed via `config` option:
```typescript
const codex = new Codex({
  config: {
    mcp_servers: {
      "send-turtle": {
        command: "node",
        args: ["/path/to/send-turtle-server/dist/index.js"],
        env: { TELEGRAM_BOT_TOKEN: "...", ALLOWED_CHAT_ID: "..." }
      },
      "bot-control": {
        command: "node",
        args: ["/path/to/bot-control-server/dist/index.js"]
      },
      "ask-user": {
        command: "node",
        args: ["/path/to/ask-user-server/dist/index.js"],
        env: { TELEGRAM_BOT_TOKEN: "...", ALLOWED_CHAT_ID: "..." }
      }
    }
  }
});
```

Alternatively, the MCP servers may already be configured in `~/.codex/config.toml` on this machine. Check that file first — if the servers are already there, Codex will pick them up automatically and no `config` override is needed.

## Available Codex Models (as of Feb 2026)

- `gpt-5.3-codex` — Most capable (recommended default)
- `gpt-5.3-codex-spark` — Fast, real-time iteration (Pro only)
- `gpt-5.2-codex` — Previous gen, still available
- `gpt-5.1-codex` / `gpt-5.1-codex-max` — Older
- `gpt-5-codex` / `gpt-5-codex-mini` — Oldest

## Feature Parity Checklist (Claude vs Codex)

| Feature | Claude ✅ | Codex Current ❌ | What to do |
|---------|----------|-----------------|------------|
| MCP tools (ask-user, bot-control, send-turtle) | 3 MCP servers | None | Pass MCP config via SDK `config` option OR rely on ~/.codex/config.toml |
| Streaming responses | Real-time via SDK events | Buffered only | Use `runStreamed()` + process ThreadEvents |
| Model switching (`/model`) | 3 Claude models | No model support | Add model preference, pass to `startThread({ model })` |
| Reasoning effort | low/medium/high | None | Pass `modelReasoningEffort` to ThreadOptions |
| Multi-session history | 5 sessions, `/resume` | Single thread | Store thread history like Claude does |
| Retry on crash | Auto-retry once | No retry | Add retry logic in text handler |
| Token usage tracking | From SDK events | Estimated | Use `Usage` from TurnCompletedEvent |
| Abort/cancel | AbortController | None | Pass `signal` in TurnOptions |
| System prompt | SDK-level injection | Prepended to first message | Keep current approach (Codex SDK has no systemPrompt option) |
| Thinking keywords | ultrathink etc → budget | None | Map to `modelReasoningEffort` levels |

## Key Files

- `super_turtle/claude-telegram-bot/src/codex-session.ts` — Main file to overhaul
- `super_turtle/claude-telegram-bot/src/handlers/text.ts` — Codex path needs streaming + retry
- `super_turtle/claude-telegram-bot/src/handlers/commands.ts` — `/model` command routing when on Codex
- `super_turtle/claude-telegram-bot/src/handlers/streaming.ts` — May need Codex-aware streaming helpers
- `super_turtle/claude-telegram-bot/src/session.ts` — Reference for Claude's implementation patterns
- `super_turtle/claude-telegram-bot/src/config.ts` — Config constants
- `super_turtle/claude-telegram-bot/src/mcp-config.ts` — MCP server definitions (reuse for Codex)

## Implementation Approach

### Phase A: Streaming + Events
1. Switch from `thread.run()` to `thread.runStreamed()`
2. Process `ThreadEvent` stream: agent_message (text), reasoning, command_execution, file_change, mcp_tool_call, web_search, todo_list, error
3. Feed events into existing streaming callback infrastructure (same `statusCallback` pattern)
4. Show intermediate progress: thinking indicator, tool calls, file changes

### Phase B: MCP Integration
1. Check if `~/.codex/config.toml` already has our 3 MCP servers configured
2. If not, pass MCP config programmatically via `new Codex({ config: { mcp_servers: {...} } })`
3. Use the same MCP server paths from `mcp-config.ts`
4. Handle `McpToolCallItem` events in the streaming handler — these are our ask-user, bot-control, send-turtle calls
5. **Important**: MCP tool calls in Codex are handled by the SDK/CLI automatically — we just see the events. The ask-user MCP server handles its own Telegram interaction. We just need to make sure the servers are running.

### Phase C: Model & Reasoning
1. Add `codexModel` preference (default: "gpt-5.3-codex") — persisted in codex prefs
2. `/model` command when activeDriver === "codex": show Codex model picker
3. Map thinking keywords to `modelReasoningEffort`: "think" → "high", "ultrathink" → "xhigh", default → "medium"
4. Pass model + reasoning to `startThread({ model, modelReasoningEffort })`
5. When switching models, kill current thread and start fresh with new model

### Phase D: Session Management & Polish
1. Multi-session history (save up to 5 thread IDs with titles/timestamps)
2. `/resume` support when on Codex — list past threads, resume selected
3. Abort support — pass AbortSignal to `run()`/`runStreamed()`, wire to `/stop`
4. Retry logic — catch errors in text handler, retry once on crash
5. Token usage — capture from `TurnCompletedEvent.usage`, display in `/usage`
6. `/new` command — kill current thread, start fresh

# Backlog

- [x] Read all key files listed above to understand current architecture fully
- [x] Phase A: Replace `thread.run()` with `thread.runStreamed()`, process ThreadEvent stream, wire into statusCallback
- [x] Phase A: Handle all event types: agent_message (streaming text), reasoning (thinking), command_execution, file_change, mcp_tool_call, error, todo_list
- [x] Phase B: Check ~/.codex/config.toml for existing MCP servers. If missing, pass MCP config via Codex constructor's `config` option using paths from mcp-config.ts
- [ ] Phase B: Verify MCP tools work end-to-end (ask-user buttons appear, bot-control works, send-turtle sends stickers)
- [x] Phase C: Add codexModel + codexReasoningEffort preferences, wire /model command to show Codex models when activeDriver === "codex"
- [x] Phase C: Map thinking keywords (think/ultrathink/pensa) to modelReasoningEffort levels
- [x] Phase D: Multi-session history for Codex (save/resume up to 5 threads)
- [ ] Phase D: Add AbortController support (wire /stop and interrupt to Codex turns) <- current
- [x] Phase D: Add retry logic for Codex in text handler (match Claude's 1-retry pattern)
- [ ] Phase D: Capture token usage from TurnCompletedEvent, display in /usage and /status (token tracking done, display pending)
- [ ] Test everything works: /switch codex → send message → streaming response → MCP tools → /model switch → /stop → /resume
- [ ] Commit all changes

# Notes

- The Codex SDK uses the Codex CLI binary under the hood. It shells out to `codex exec` with the right flags.
- OAuth auth comes from `~/.codex/auth.json` (already working, no API key needed).
- MCP servers in Codex are handled by the CLI process — they start when the thread starts and stop when it ends. We don't manage their lifecycle.
- The `approvalPolicy` should be set to `"never"` for our bot use case (we don't want interactive approval prompts).
- Set `sandboxMode` to `"danger-full-access"` since the bot needs to read/write files freely.
- System prompt: keep the current approach of prepending META_SHARED.md to first message. The Codex SDK doesn't have a dedicated systemPrompt option.
- When the user does `/model` while on Codex, show Codex models (gpt-5.3-codex, gpt-5.2-codex, etc.) not Claude models.
- The `config` option on the Codex constructor accepts a JSON object that gets flattened to TOML `--config` flags. This is how we pass MCP server config programmatically.
