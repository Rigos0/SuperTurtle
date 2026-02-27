# steipete's GitHub Projects: Research & Applicability Analysis

**Date**: 2026-02-27
**Total Repositories Cataloged**: 92
**Owned Original Repos**: ~82 (excluding forks)
**Primary Focus Areas**: CLI tools, AI agent infrastructure, macOS automation, MCP servers

---

## Executive Summary

Peter Steinberger (@steipete) is a prolific open-source developer with a strong focus on:
- **AI agent infrastructure** — MCP servers, orchestration patterns, agent frameworks
- **CLI tooling** — Terminal applications for Google services, macOS apps, streaming APIs
- **macOS automation** — Accessibility, screenshots, system control, app automation
- **Swift/TypeScript polyglot** — Deep expertise in both compiled (Swift) and scripted (TypeScript/Go) ecosystems

### Key Recommendations for Agentic System

1. **Highest Priority**: Study `agent-rules`, `agent-scripts`, `mcporter`, `claude-code-mcp` — direct applicability to our SubTurtle system
2. **High Priority**: `Peekaboo`, `poltergeist`, `macos-automator-mcp` — visual testing and file watching patterns
3. **Medium Priority**: `oracle`, `Tachikoma`, `VibeMeter` — multi-model abstraction patterns (we already use this concept)
4. **Reference**: `brabble`, `VibeTunnel`, `sweetlink` — agent control loops and human interaction patterns
5. **Future Consideration**: `mcp-agentify`, `conduit-mcp`, `notarium-mcp` — advanced MCP composition

---

## Deep Dive: OpenClaw Architecture vs. SubTurtle System

**Date**: 2026-02-27
**Focus**: Subagent orchestration, workspace isolation, session model comparison

### 1. Subagent Orchestration

#### OpenClaw Approach

**Command Structure:**
- Slash commands: `/subagents spawn`, `/subagents list`, `/subagents kill`, `/subagents log`, `/subagents send/steer`
- Tool-based spawning via `sessions_spawn` tool: required (task), optional (label, model override, timeout)
- Returns immediately with acceptance: `{ status: "accepted", runId, childSessionKey }`

**Lifecycle Management:**
- Non-blocking execution with immediate run ID return
- Completion messages auto-announce to requester chat channel with result, status, runtime/token stats
- Auto-archive after configurable time (default: 60 minutes)
- `/stop` in requester chat cascades to all spawned sub-agents

**Hierarchy & Depth Constraints:**
- Default: max spawn depth = 1 (no nesting)
- Configurable: max spawn depth 2-5 enables orchestrator pattern (main → orchestrator → workers)
- Max children per agent: configurable (default: 5) to prevent runaway fan-out
- Tool restrictions: subagents always have ≤ parent capabilities (cannot escalate)
- Orchestrator-tier agents (depth 1+) get `sessions_spawn` tool; leaf agents get all tools except session-management

**State Passing & Communication:**
- Parent-child communication via `sessions_*` tool family (spawn, list, history, send)
- Subagents can only communicate upward to parent (no direct sibling communication)
- Session isolation: each sub-agent runs in format `agent:<agentId>:subagent:<uuid>`
- Results announce upward through parent chain before reaching users

**SubTurtle Comparison:**
- **SubTurtle**: Single-level spawning only (`ctl spawn` CLI); Python-based loops
- **OpenClaw**: Multi-level (2-5 depth configurable); JavaScript-based with chat-native UX
- **SubTurtle**: Spawn/stop are blocking operations with log files
- **OpenClaw**: Spawn is non-blocking with immediate run ID + later auto-announcement
- **SubTurtle**: Direct log access via `ctl logs`; no broadcast to users
- **OpenClaw**: Results broadcast to requester's channel automatically

---

### 2. Workspace Isolation

#### OpenClaw Approach

**Docker Sandbox Implementation:**
- Three modes: `off` (no isolation), `non-main` (sandbox non-main sessions), `all` (sandbox everything)
- Per-scope isolation: `agent` (one container per agent) or `session` (one per session, most isolated)
- Network config: "none" (default) prevents outbound access from sandboxed sessions
- File system access controlled by mount mode: `none` (default), `ro` (read-only), `rw` (read-write)

**Workspace Directory Structure:**
- Default: `~/.openclaw/workspace/` (configurable per agent)
- Core files (loaded each session):
  - `AGENTS.md` — Operating instructions and memory guidelines
  - `SOUL.md` — Persona, tone, boundaries
  - `USER.md` — User profile conventions
  - `IDENTITY.md` — Agent name, character, emoji
  - `TOOLS.md` — Local tool notes
- Operational files:
  - `memory/YYYY-MM-DD.md` — Daily memory logs (append-only)
  - `MEMORY.md` — Curated long-term memory (loaded only in private sessions)
  - `skills/` — Workspace-specific skill overrides

**Session-Scoped Isolation:**
- Sessions isolated per agent and channel via `session.dmScope`:
  - `main` (default): all DMs share one context
  - `per-channel-peer`: each channel+sender = isolated context
  - `per-account-channel-peer`: account-aware for shared inboxes
- Emphasis: tool policy + exec approvals + sandboxing + channel allowlists (not multi-tenant secure boundary)

**SubTurtle Comparison:**
- **SubTurtle**: Directory-based isolation only (workspace dirs per instance)
- **OpenClaw**: Docker container + mount mode (ro/rw/none) combination
- **SubTurtle**: No tool execution sandboxing (runs on host)
- **OpenClaw**: Both gateway-level + per-tool sandbox configuration
- **SubTurtle**: Manual workspace setup via `ctl spawn --dir`
- **OpenClaw**: Declarative workspace.access per agent in config with env injection

---

### 3. Session Model

#### OpenClaw Approach

**Session Creation & Storage:**
- Sessions owned by Gateway (master of truth)
- Session keys derived from transport type (DMs follow dmScope; group chats isolated per channel)
- Storage:
  - Store file: `~/.openclaw/agents/<agentId>/sessions/sessions.json` (maps keys → metadata)
  - Transcripts: `~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl` (JSONL message history)

**Lifecycle Management:**
- Reset policy evaluated on each inbound message (daily reset at 4:00 AM default, idle reset optional)
- Automated maintenance:
  - Prunes entries older than `pruneAfter` (default 30 days)
  - Caps entries at `maxEntries` (default 500)
  - Enforces disk budgets via `maxDiskBytes`
  - Rotates sessions.json at `rotateBytes` (default 10MB)

**RPC Mode & Serialization:**
- Agent runtime runs embedded RPC mode within Gateway process
- Agents call Gateway RPC for tool calls, context reads, session operations
- Per-session lane execution: guarantees only one active run per session at a time
- Prevents tool/session races and keeps history consistent

**Tool Streaming & Sessions_Spawn:**
- `sessions_spawn`: Spawns isolated sub-agent, always non-blocking
- Tool streaming: Assistant deltas streamed, block streaming on message_end
- Session tools available: `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`
- Memory integration:
  - Daily logs (append-only) + long-term memory (durable facts)
  - `memory_search`: semantic recall (BM25+vector with MMR re-ranking)
  - Memory flush before compaction: soft threshold at contextWindow - 20,000 tokens

**SubTurtle Comparison:**
- **SubTurtle**: Cron-based check-ins; no persistent session RPC
- **OpenClaw**: Embedded RPC within Gateway; sessions as first-class entities
- **SubTurtle**: CLAUDE.md per SubTurtle for state persistence
- **OpenClaw**: JSONL transcripts + Markdown workspace files
- **SubTurtle**: Cron fires independent loops (yolo/yolo-codex/slow)
- **OpenClaw**: Per-session lane serialization ensures ordering without explicit cron
- **SubTurtle**: No memory system; tasks are ephemeral
- **OpenClaw**: Rich memory toolkit (daily logs, semantic search, durable long-term)

---

### 4. Additional Architectural Insights

**Gateway as Control Plane:**
- Single WebSocket hub on `ws://127.0.0.1:18789` (default)
- Acts as source of truth for all sessions, channel routing, tool orchestration
- Authentication: nonce-based challenge + device identity + signed handshake
- All clients (CLI, web UI, macOS/iOS apps) connect to same Gateway

**Skills System:**
- SKILL.md files with YAML frontmatter + instructions
- Loading hierarchy: bundled → managed (~/.openclaw/skills) → workspace (highest priority)
- Gating via `metadata.openclaw.requires`: binary deps, env vars, OS, config flags
- Compact list (~195 + ~97 per skill chars) injected into prompts

**Multi-Model Support:**
- OpenRouter integration + 14+ built-in providers
- Routing strategies: automatic cost-based, task-based intelligence delegation, model tiering, multi-agent routing
- Fallback chains for resilience

---

### 5. Key Differences Summary

| Aspect | SubTurtle | OpenClaw |
|--------|-----------|----------|
| **Core Runtime** | Python loops + cron | JavaScript + embedded RPC |
| **Subagent Control** | `ctl spawn` CLI | Slash commands + `sessions_spawn` tool |
| **Execution Model** | Loop types (yolo/slow/yolo-codex) | Per-session RPC lanes + global queue |
| **State Persistence** | CLAUDE.md files | JSONL transcripts + Markdown workspace |
| **Supervision** | Cron jobs (scheduled polling) | Per-session lanes (ordering guarantee) |
| **Workspace Isolation** | Directory-based only | Docker sandbox + mount mode (ro/rw/none) |
| **Session Lifecycle** | Implicit (task complete = exit) | Explicit (reset, idle, pruning, archival) |
| **Memory System** | None | Daily logs + semantic search |
| **Tool Execution** | No sandboxing | Docker sandbox + tool policy |
| **Multi-Model** | Single model per loop | 14+ providers + cost-based routing |
| **Communication** | Parent ← → child via AGENTS.md | Parent ← → child via RPC tools |
| **Nesting Depth** | 1 level max | 2-5 levels configurable |
| **Configuration** | Implicit in CLAUDE.md | Central openclaw.json with hot-reload |

---

### Takeaways for SubTurtle

**What OpenClaw Does Better:**
1. **Session isolation & lifecycle**: Explicit reset, idle cleanup, archival — prevents stale sessions
2. **RPC-based ordering**: Per-session lane guarantees vs. cron-based polling race conditions
3. **Memory toolkit**: Daily logs + semantic search beats ephemeral task approach
4. **Multi-level nesting**: 2-5 depth enables orchestrator pattern
5. **Tool policy & sandboxing**: Docker + mount mode is more secure than no isolation

**What SubTurtle Does Better:**
1. **Simplicity**: Python-based loops are easier to understand and debug than RPC + Gateway
2. **Cost efficiency**: Cron-based supervision is cheaper than persistent RPC connections
3. **Language flexibility**: Can spawn agents in any language (not JavaScript-locked)
4. **Silent operations**: Cron check-ins don't spam users with status messages

**Patterns Worth Adopting:**
1. **Per-session lifecycle management**: Add reset/idle/archival logic to SubTurtle
2. **Explicit memory system**: Add daily logs + memory persistence (not just CLAUDE.md)
3. **Configurable nesting depth**: Allow 2-level spawning (main → orchestrator) for complex workflows
4. **Session state files**: Consider JSON transcripts alongside CLAUDE.md for better history

---

## Deep Dive: mcporter MCP Runtime vs. Manual MCP Registration

**Date**: 2026-02-27
**Focus**: Evaluating mcporter as a replacement for our manual MCP tool discovery and registration system

### 1. Current System: Manual MCP Registration

Our agentic system currently:
1. **Defines MCP servers in `mcp-config.ts`**: A static TypeScript object maps server names to command/HTTP configurations
2. **Dynamic import in `config.ts`**: Loads the MCP_SERVERS export at startup
3. **Passes to Claude Agent SDK**: The `mcpServers` option in `query()` receives the configuration
4. **Manual server definition**: Each new MCP server requires:
   - Adding an entry to `mcp-config.ts` with command/args or HTTP URL
   - Ensuring the referenced server file exists and is runnable
   - Managing OAuth credentials via environment variables (e.g., TELEGRAM_CHAT_ID)
   - Handling stdio/HTTP transport manually

**Current Code Flow**:
```
mcp-config.ts (manual definition)
    ↓
config.ts (dynamic import + export)
    ↓
session.ts (passes MCP_SERVERS to query({options: {mcpServers}}))
    ↓
Claude Agent SDK (distributes tools to Claude)
```

**Strengths**:
- Simple and transparent — easy to debug
- Minimal dependencies — just the SDK
- Full control over server lifecycle and configuration
- Fast startup — no discovery overhead

**Weaknesses**:
- Manual effort to register each server
- Duplicate definitions if same server used across projects
- No automatic OAuth handling (must manage tokens manually)
- No daemon mode support for stateful servers (chrome-devtools, etc.)
- No CLI generation — servers are model-only, not shareable as CLI tools
- No introspection — no way to discover available tools without server metadata

### 2. mcporter: Zero-Config Discovery + CLI Generation

mcporter provides:

**Architecture**:
- **Discovery Engine**: Auto-scans config files from home, project, and multiple editors (Cursor, Claude, Codex, Windsurf)
- **Runtime API**: `createRuntime()` returns connection pool + `createServerProxy()` for typed tool calls
- **CLI Generator**: `generate-cli` packages any MCP server as a standalone command-line tool
- **TypeScript Codegen**: `emit-ts` produces `.d.ts` and client wrappers
- **Transport Abstraction**: Unified interface for stdio, HTTP, SSE with OAuth caching
- **Daemon Mode**: Auto-spawns persistent daemons for stateful servers (chrome-devtools, etc.)

**Key Features**:

1. **Zero-Config Discovery**:
   ```typescript
   // No config file needed — mcporter reads ~/.mcporter/mcporter.json
   // Merges with $PROJECT/config/mcporter.json
   // Expands ${ENV} placeholders
   // Auto-imports from Cursor, Claude, Codex, Windsurf configs
   const runtime = await createRuntime();
   const chrome = createServerProxy(runtime, "chrome-devtools");
   ```

2. **Multiple Invocation Styles**:
   ```bash
   # CLI: colon-delimited
   mcporter call linear.create_issue title:Bug team:ENG

   # CLI: function-call style
   mcporter call 'linear.create_issue(title: "Bug", team: "ENG")'

   # TypeScript: camelCase proxy
   const result = await server.createIssue({ title: "Bug", team: "ENG" });
   ```

3. **CLI Generation**:
   ```bash
   mcporter generate-cli linear --bundle dist/linear.js
   # Creates shareable CLI tool from MCP server definition
   ```

4. **OAuth Auto-Handling**:
   ```bash
   mcporter auth vercel  # Interactive OAuth setup
   # Token cached in ~/.mcporter/auth.json
   # Automatically refreshed on next invocation
   ```

5. **Daemon Mode**:
   ```bash
   mcporter daemon status
   mcporter daemon start|stop|restart
   # Auto-spawns persistent process for stateful servers
   ```

### 3. Detailed Comparison

| Aspect | Manual Registration | mcporter |
|--------|-------------------|----------|
| **Server Definition** | Static TypeScript objects | Auto-discovered from config files |
| **Syntax** | `{ command: "bun", args: [...] }` | `mcpServers.{name}.command` + env expansion |
| **Configuration Merging** | Single project file | Home + Project + Editor imports |
| **OAuth Handling** | Manual (env vars) | Automatic with browser handshake + token cache |
| **Token Management** | Per-project .env | Centralized ~/.mcporter/auth.json |
| **CLI Support** | No | Yes (`generate-cli` + bundling) |
| **TypeScript Generation** | No | Yes (`emit-ts` for `.d.ts` + client wrappers) |
| **Daemon Mode** | Manual subprocess management | Automatic with lifecycle control |
| **Environment Variables** | Plain `process.env` | `${VAR}` and `$env:VAR` interpolation |
| **Discovery** | Manual | Automatic from 4+ config sources |
| **Startup Overhead** | None | Discovery + config merge (~100ms) |
| **Dependencies** | @modelcontextprotocol/sdk | mcporter + 10 deps (acorn, zod, rolldown, etc.) |
| **Tool Introspection** | Via `ListToolsRequest` | Yes, plus schema export |

### 4. Integration Scenarios

**Scenario A: Minimal Integration** (keep current system)
- No change to `mcp-config.ts`
- Benefit: Zero risk, zero overhead
- Cost: Manual registration continues, no CLI generation capability

**Scenario B: mcporter for Discovery + CLI Generation** (hybrid)
- Keep manual `mcp-config.ts` as primary source
- Add `mcporter generate-cli` step in CI/CD to create shareable CLIs for each server
- Gradually migrate to mcporter's config format
- Benefits: CLI generation + auto-discovery within 1 project
- Cost: Moderate refactor (2-3 hours), adds mcporter dependency

**Scenario C: Full mcporter Adoption** (max benefit)
- Replace `mcp-config.ts` with `config/mcporter.json`
- Use `createRuntime()` API in Claude Agent SDK integration
- Enable OAuth for API-based servers (linear, github, etc.)
- Daemon mode for stateful servers
- Generate CLIs for internal tools
- Benefits: Unified config, OAuth support, CLI generation, daemon mode
- Cost: Significant refactor (8-10 hours), breaking change to config format

### 5. Architectural Constraints

**Why mcporter might NOT fit our system perfectly**:

1. **SDK Integration Mismatch**:
   - Claude Agent SDK uses `mcpServers: Record<string, McpServerConfig>` directly
   - mcporter's `createRuntime()` returns `ServerProxy` objects, not raw `McpServerConfig`
   - Would need to bridge: `runtime.getConfig()` → `McpServerConfig` for SDK
   - **Status**: Feasible but requires adapter layer

2. **Codex Integration**:
   - Codex runs as subprocess with environment injection
   - mcporter expects environment already set or reads from file
   - Would need wrapper: `MCPORTER_HOME=... codex query ...`
   - **Status**: Doable with environment wiring

3. **Static Config vs. Dynamic Discovery**:
   - Our `mcp-config.ts` is TypeScript, evaluated at load time
   - mcporter config is JSON, allowing dynamic updates
   - Trade-off: TypeScript is more flexible, JSON is simpler
   - **Status**: JSON approach is fine for our use case

4. **Dependency Weight**:
   - mcporter pulls in: rolldown (bundler), acorn (parser), zod, etc.
   - Our current system has zero extra dependencies
   - Adds ~5MB to node_modules
   - **Status**: Acceptable if benefits justify it

### 6. Cost-Benefit Analysis

**Option A: Stay with Manual Registration**
- Pro: Zero dependencies, simple, transparent
- Pro: Fast startup, no discovery overhead
- Con: No CLI generation, no OAuth support, no daemon mode
- Con: Duplicate config across projects
- **Effort to Maintain**: Low
- **Recommendation**: ✅ **Viable if no external API servers**

**Option B: Hybrid (mcporter for CLI gen + discovery in future)**
- Pro: Keep current system, add CLI generation capability
- Pro: Path toward full mcporter adoption
- Con: Moderate complexity, mcporter dependency
- Con: Config duplication (mcp-config.ts + config/mcporter.json)
- **Effort to Integrate**: 2-3 hours
- **Recommendation**: ✅ **Good middle ground**

**Option C: Full Adoption**
- Pro: Single config source, OAuth auto-handling, daemon mode, CLI generation
- Pro: Aligns with broader ecosystem (Cursor, Claude)
- Con: 8-10 hour refactor, breaking change
- Con: SDK integration requires adapter layer
- Con: Adds dependency weight
- **Effort to Integrate**: 8-10 hours
- **Recommendation**: ⏰ **Defer to Phase 2 if we add API-based tools (Linear, GitHub)**

### 7. Decision & Recommendation

**Verdict: KEEP MANUAL REGISTRATION for now, Plan Hybrid Adoption**

**Immediate Action (Current Sprint)**:
- ✅ No change to current system
- Rationale: Our system works, adding mcporter now has no immediate ROI

**Short-term (Next Month)**:
- If we need to package our custom MCP servers as CLI tools → Implement `generate-cli` wrapper around each server
- If we need OAuth for external APIs (Linear, GitHub, etc.) → Evaluate mcporter's OAuth handling
- Prototype: Test mcporter's discovery with our current `mcp-config.ts` migration

**Medium-term (Q2 2026)**:
- Once API-based servers become critical, migrate to full mcporter + OAuth
- Create `config/mcporter.json` as primary config
- Update session.ts to use `createRuntime()` adapter
- Migrate Codex integration to mcporter environment injection

**Long-term (H2 2026)**:
- If mcporter becomes standard in Claude/Cursor ecosystem, full adoption is natural
- Could enable third-party agent MCP composition via `./mcporter call`

### 8. Key Takeaway

mcporter is **excellent for ecosystem integration**, but **our manual approach is sufficient for current scope**. It's a "nice-to-have" optimization, not a blocking gap. Priority should be:

1. Ensuring our custom servers (ask-user, send-turtle, bot-control) work reliably ✅
2. Adding external tools only when needed (Linear, GitHub, Slack)
3. Then mcporter becomes a clear win for OAuth + CLI gen

---

## Tier 1: Direct Agent Infrastructure (Highest Priority)

These repos directly address problems we're solving in agentic.

### agent-rules (5,600 ⭐) — **Shell**
- **What**: Rules and knowledge base for working better with agents (Claude Code, Cursor)
- **Applicability**: ✅ **HIGH** — Directly relevant to our agent guardrails and operational discipline
- **Recommendation**: **Study + Port**
  - Examine how steipete codified agent best practices
  - Extract patterns applicable to our Meta agent and SubTurtle workflows
  - Consider versioning `agent-rules` as a submodule in agentic

### agent-scripts (2,078 ⭐) — **TypeScript**
- **What**: Shared agent helper scripts (committer, docs-list, browser-tools, AGENTS.md pointers)
- **Applicability**: ✅ **VERY HIGH** — We already use AGENTS.md pointer pattern (they pioneered it!)
- **Recommendation**: **Adopt Components**
  - `committer` — disciplined git commit helper for agents. Compare against our commit patterns.
  - `docs-list.ts` — docs walker with front-matter enforcement. Could improve our documentation audit.
  - `browser-tools` — Chrome DevTools helpers. Valuable for frontend work in SubTurtles.
  - These are zero-repo-specific and portable by design.

### mcporter (2,198 ⭐) — **TypeScript**
- **What**: MCP runtime & CLI. Auto-discovers MCP servers from editor configs. Provides JS API + CLI generation.
- **Applicability**: ✅ **HIGH** — We currently manually wire MCP tools. This could abstract it.
- **Recommendation**: **Evaluate for Use**
  - Could replace manual MCP tool discovery in our driver layer
  - CLI generation feature could help us package skills as standalone MCP servers
  - Study how it handles OAuth and daemon mode
  - **Caveat**: Adds a dependency. Consider if manual wiring is simpler for our use case.

### claude-code-mcp (1,139 ⭐) — **JavaScript**
- **What**: Claude Code as a one-shot MCP server to embed an agent inside another agent
- **Applicability**: ✅ **VERY HIGH** — Directly enables nested agent execution
- **Recommendation**: **Study + Prototype**
  - This is the MCP-ified version of what we do with SubTurtles
  - Could enable third-party agents to spawn SubTurtles via MCP
  - Evaluate if this is better than our current subprocess model

### oracle (1,538 ⭐) — **TypeScript**
- **What**: Invoke advanced LLMs (GPT-5 Pro) with custom context and files
- **Applicability**: ✅ **MEDIUM** — Similar to our driver abstraction, but OpenAI-specific
- **Recommendation**: **Reference Only**
  - Our driver abstraction already handles multi-model routing (Claude, Codex, Spark)
  - oracle is OpenAI-focused. Study the pattern but our implementation is already superior.

### Tachikoma (224 ⭐) — **Swift**
- **What**: One interface for every AI model. Swift SDK to interface with AI providers
- **Applicability**: ✅ **MEDIUM** — Multi-model abstraction (we do this in Python)
- **Recommendation**: **Reference**
  - Study how it abstracts model differences
  - We already do this in our driver layer. Not immediately actionable, but good pattern reference.

---

## Tier 2: Visual Testing & Automation (High Priority)

### Peekaboo (2,413 ⭐) — **Swift**
- **What**: macOS CLI & optional MCP server that captures screenshots for AI agents with visual QA
- **Applicability**: ✅ **HIGH** — Enables visual testing of frontend work by SubTurtles
- **Recommendation**: **Adopt as MCP Server**
  - Excellent for visual QA of landing page redesigns
  - Install as MCP server, make available to SubTurtles
  - Could replace manual screenshot verification in reviews
  - **Use Case**: When a SubTurtle finishes landing page work, Peekaboo can verify contrast, layout, mobile responsiveness

### macos-automator-mcp (687 ⭐) — **TypeScript**
- **What**: MCP server to run AppleScript and JXA (JavaScript for Automation) on macOS
- **Applicability**: ✅ **MEDIUM-HIGH** — Enables UI automation without shell scripting
- **Recommendation**: **Deploy as Shared MCP**
  - Great for SubTurtles that need to automate native macOS apps
  - Browser-based agents could use this to control system apps
  - Lower priority than Peekaboo but useful infrastructure

### poltergeist (331 ⭐) — **TypeScript**
- **What**: Universal hot reload, file watcher, build automation for any language
- **Applicability**: ✅ **MEDIUM** — Improves dev server management in SubTurtles
- **Recommendation**: **Study + Potentially Adopt**
  - Our start-tunnel.sh already does file watching. Poltergeist is a more general abstraction.
  - Could improve how SubTurtles manage dev servers during frontend work
  - Not critical, but could reduce boilerplate in SubTurtle spawn scripts

---

## Tier 3: Agent Control & Communication

### brabble (108 ⭐) — **Go**
- **What**: Local wake-word daemon. "Hey, Computer" from Star Trek. Runs hooks after trigger commands.
- **Applicability**: ✅ **LOW-MEDIUM** — Voice interface for agents (future enhancement)
- **Recommendation**: **Future Consideration**
  - Out of scope for current work, but interesting for accessibility
  - Could enable voice commands to Telegram bot in the future

### VibeTunnel — **Referenced in steipete's work**
- **What**: Browser-to-terminal, command agents from mobile (mentioned in CLAUDE.md context)
- **Applicability**: ✅ **MEDIUM** — Tunnel pattern similar to our cloudflared approach
- **Recommendation**: **Reference Architecture**
  - Study how it handles mobile-to-terminal bridging
  - Our start-tunnel.sh is simpler but achieves same goal
  - Good reference if we need to expand tunnel capabilities

### sweetlink (104 ⭐) — **TypeScript**
- **What**: Connect your agent to your web app. Like playwright, but works in your current tab.
- **Applicability**: ✅ **MEDIUM** — Agent-driven web automation without browser control
- **Recommendation**: **Study + Consider**
  - Alternative to browser-based testing in SubTurtles
  - Could be used for real-time agent feedback loops
  - Evaluate vs. our current Playwright-based approach

---

## Tier 4: Infrastructure & Tooling (Reference Value)

### RepoBar (1,072 ⭐) — **Swift**
- **What**: GitHub repo status in menu bar and terminal (CI, issues, PRs, releases)
- **Applicability**: ✅ **LOW** — Monitoring tool, not execution infrastructure
- **Recommendation**: **Skip**
  - Not applicable to agentic system
  - Interesting pattern for status dashboards but outside scope

### CodexBar (6,845 ⭐) — **Swift**
- **What**: Show OpenAI Codex and Claude Code usage stats without login
- **Applicability**: ✅ **LOW** — We track usage programmatically via our driver
- **Recommendation**: **Skip**
  - We already implement quota management in META_SHARED.md
  - Their menubar pattern is interesting but not applicable to CLI-first system

### VibeMeter (371 ⭐) — **Swift**
- **What**: Measure costs for Cursor and other AI providers
- **Applicability**: ✅ **LOW-MEDIUM** — Usage tracking pattern
- **Recommendation**: **Reference Only**
  - We already track Claude Code quota usage
  - Study the cost calculation patterns but implement in Python, not Swift

### conduit-mcp (60 ⭐) — **TypeScript**
- **What**: MCP server to read, write, find, list across filesystems & web; webpage-to-Markdown, image processing, diffing, archiving
- **Applicability**: ✅ **MEDIUM** — Rich file/web handling for agents
- **Recommendation**: **Study + Deploy**
  - Excellent for SubTurtles that need to process files and web content
  - Deploy as shared MCP server for agent use
  - Webpage-to-Markdown feature is useful for research SubTurtles

### mcp-agentify (19 ⭐) — **TypeScript**
- **What**: MCP orchestrator that converts MCP servers to agents
- **Applicability**: ✅ **LOW** — Interesting but not immediately applicable
- **Recommendation**: **Future Reference**
  - Could enable MCP servers to spawn as SubTurtles
  - Not critical for current work

---

## Tier 5: CLI Tools & Utilities (Reference for Patterns)

These are excellent CLI implementations but not directly applicable to agentic orchestration.

### gogcli (5,047 ⭐) — **Go**
- Gmail, Google Calendar, Google Drive, Google Contacts CLI
- **Applicability**: LOW — Could be useful for agent integrations with Google Services
- **Use**: Potentially useful for future integrations (scheduling, email, etc.)

### summarize (4,491 ⭐) — **TypeScript**
- URL/YouTube/Podcast/file summarization with CLI + Chrome extension
- **Applicability**: MEDIUM — Could be a useful agent tool for research
- **Recommendation**: Study for pattern; consider as shareable MCP tool

### imsg (771 ⭐) — **Swift**
- CLI for Apple Messages so agents can send/receive iMessages
- **Applicability**: LOW — Alternative messaging channel for Telegram
- **Recommendation**: Reference for multi-channel agent communication

### wacli (546 ⭐) — **Go**
- WhatsApp CLI
- **Applicability**: LOW — Alternative to Telegram bot
- **Recommendation**: Reference for multi-channel support

### sonoscli (95 ⭐) — **Go**
- Control Sonos speakers from terminal
- **Applicability**: LOW — Entertainment automation, not development infrastructure
- **Recommendation**: Skip

### remindctl (125 ⭐) — **Swift**
- CLI for Apple Reminders
- **Applicability**: LOW — Could schedule agent work via reminders
- **Recommendation**: Interesting pattern but low priority

### spogo (132 ⭐) — **Go**
- Spotify terminal client using web cookies
- **Applicability**: LOW — Not applicable to coding agents
- **Recommendation**: Skip

### camsnap (60 ⭐) — **Go**
- CLI to capture snapshots, clips, motion detection against RTSP/ONVIF cameras
- **Applicability**: LOW — Could be useful for monitoring but not core functionality
- **Recommendation**: Skip

### bslog (52 ⭐) — **TypeScript**
- Better Stack log fetcher with ClickHouse SQL style
- **Applicability**: MEDIUM — Could help SubTurtles query logs during debugging
- **Recommendation**: Study for log aggregation patterns

---

## Tier 6: Development Utilities (Swift/macOS Specific)

These are valuable for macOS development but not applicable to agentic.

### AXorcist (187 ⭐) — **Swift**
- Chainable Swift wrapper for macOS Accessibility
- **Applicability**: LOW — UI automation on macOS but we don't need this for agentic
- **Recommendation**: Reference for accessibility patterns

### Trimmy (453 ⭐) — **Swift**
- Paste once, run once - flatten multi-line shell snippets
- **Applicability**: LOW — QoL tool for macOS, not applicable to agents
- **Recommendation**: Skip

### TauTUI (112 ⭐) — **Swift**
- TUI library for Swift
- **Applicability**: LOW — We use Python/TypeScript, not Swift for TUIs
- **Recommendation**: Reference pattern only

### Matcha (56 ⭐) — **Swift**
- Beautiful TUI library for Swift
- **Applicability**: LOW — Same as above
- **Recommendation**: Reference pattern

### Demark (180 ⭐) — **Swift**
- HTML to Markdown converter
- **Applicability**: MEDIUM-LOW — Could be useful for converting HTML docs to Markdown
- **Recommendation**: Study, but implement in TypeScript/Python if needed

### Markdansi (37 ⭐) — **TypeScript**
- Markdown to ANSI formatting with URL, table, list support
- **Applicability**: MEDIUM — Useful for terminal output formatting in agents
- **Recommendation**: Study for terminal UI patterns

### CodeLooper (132 ⭐) — **Swift**
- Loop-focused development pattern
- **Applicability**: LOW — Not applicable
- **Recommendation**: Skip

### Commander (23 ⭐) — **Swift**
- Swifty argument parser alternative to ArgumentParser
- **Applicability**: LOW — We use Python argparse, not Swift
- **Recommendation**: Reference pattern

### xcsentinel (77 ⭐) — **Swift**
- Xcode build helper
- **Applicability**: LOW — Not applicable to agentic
- **Recommendation**: Skip

---

## Tier 7: Third-Party Integrations & SDKs

### ElevenLabsKit (79 ⭐) — **Swift**
- ElevenLabs voice streaming SDK
- **Applicability**: LOW-MEDIUM — Could enable voice synthesis for agents
- **Recommendation**: Future enhancement for voice-based agent outputs

### sag (203 ⭐) — **Go**
- Modern CLI for macOS say command with modern voices
- **Applicability**: LOW — Entertainment utility
- **Recommendation**: Skip

### aibench (10 ⭐) — **Go**
- OpenAI API benchmarking tool
- **Applicability**: MEDIUM — Could help benchmark model performance
- **Recommendation**: Reference for performance testing

### inngest (57 ⭐) — **TypeScript**
- CLI to query Inngest jobs
- **Applicability**: LOW — Job scheduling service integration
- **Recommendation**: Reference if we use Inngest

### eightctl (47 ⭐) — **Go**
- Eight Sleep CLI to control smart bed pods
- **Applicability**: LOW — IoT control, not applicable
- **Recommendation**: Skip

### tokentally (45 ⭐) — **TypeScript**
- One tiny library for LLM token + cost math
- **Applicability**: ✅ **MEDIUM-HIGH** — Directly useful for our quota tracking
- **Recommendation**: **Adopt**
  - Use in our quota management system (already implemented but could improve)
  - Integrates with our usage-aware resource management

### stats-store (34 ⭐) — **TypeScript**
- Analytics for Sparkle (macOS update framework)
- **Applicability**: LOW — Not applicable
- **Recommendation**: Skip

### homebrew-tap (58 ⭐) — **Ruby**
- Homebrew tap for steipete's tools
- **Applicability**: REFERENCE — Good pattern for distributing CLI tools
- **Recommendation**: Study for homebrew packaging patterns

---

## Tier 8: Forks (Not Owned by steipete)

steipete maintains several high-quality forks of popular projects:

| Fork | Original | Reason to Maintain | Applicability |
|------|----------|-------------------|---|
| `codex` | OpenAI Codex | Local agent tool | Reference |
| `opencode` | OpenAI's terminal agent | Alternative agent impl | Reference |
| `crush` | AI agent | Alternative agent impl | Reference |
| `better-auth` | Authentication framework | TypeScript auth | Reference |
| `pi-mono` | Pi agent monorepo | Agent framework | Study |
| `iterm-mcp` | iTerm integration | MCP for terminal REPL | Study + Adopt |
| `swift-sdk` | MCP Swift SDK | Protocol implementation | Reference |
| `pi` | vLLM deployment CLI | Model serving | Reference |
| `ollama-swift` | Ollama client | Local model client | Reference |
| `kysely` | SQL query builder | TypeScript SQL | Reference |
| `ghostty` | Terminal emulator | Fast terminal | Development tool |
| `TermKit` | Terminal UI toolkit | TUI library | Reference |

**Most interesting forks**:
- `pi-mono` — Agent framework monorepo, worth studying
- `iterm-mcp` — Terminal REPL integration via MCP, highly useful for agents

---

## Tier 9: Research & Experimental Projects

### research (6 ⭐) — **None**
- "Inspired by simonwillison.net async-code research"
- **Applicability**: LOW — Personal research project
- **Recommendation**: Skip

### canvas (20 ⭐) — **Go**
- Browser canvas for agents
- **Applicability**: MEDIUM — Could enable visual output from agents
- **Recommendation**: Study for visual feedback patterns

### mcp2py (4 ⭐) — **None** (fork)
- Turn any MCP server into a Python module
- **Applicability**: ✅ **MEDIUM-HIGH** — We could use this to wrap MCP servers as Python imports
- **Recommendation**: Study + Prototype
  - Could simplify our driver integration layer
  - Enables Python SubTurtles to call MCP tools as regular functions

### vox (27 ⭐) — **TypeScript**
- Let your agent run phone calls
- **Applicability**: LOW — Voice interface (future enhancement)
- **Recommendation**: Skip for now

### lore.md (4 ⭐) — **TypeScript**
- Random Markdown website generator
- **Applicability**: LOW — Not applicable
- **Recommendation**: Skip

### PhoneAgent — **Mentioned in forks**
- **Applicability**: LOW — Speculative project
- **Recommendation**: Skip

---

## Comparison: steipete's System vs. Agentic

| Aspect | steipete's Approach | Our Agentic System |
|--------|---|---|
| **Agent Model** | Multi-backend SDK (Tachikoma) | Driver abstraction (Claude/Codex/Spark) |
| **MCP Integration** | mcporter auto-discovery | Manual tool registration |
| **Agent Composition** | MCP servers as agents (mcp-agentify) | SubTurtles with CLAUDE.md |
| **State Management** | Not directly addressed | CLAUDE.md per agent + META_SHARED.md |
| **Supervision** | Not visible in public repos | Cron-based check-ins with silent execution |
| **Skills System** | Not MCP-based | Custom skills loader with lazy loading |
| **Messaging** | Multi-channel (iMessage, WhatsApp, etc.) | Telegram-focused |
| **Visual Testing** | Peekaboo MCP server | Manual screenshot verification |
| **Cost Tracking** | VibeMeter, CodexBar | Programmatic quota management |

**Key Insights**:
1. We handle agent state management better (CLAUDE.md + META_SHARED.md)
2. steipete excels at tool integration (MCP, scripts, system automation)
3. We could improve visual testing by adopting Peekaboo
4. steipete's multi-channel approach (imsg, wacli) is more general than our Telegram-focus

---

## Actionable Recommendations

### Phase 1: Immediate Adoptions (This Sprint)

1. **Deploy Peekaboo as MCP Server**
   - Install locally
   - Add to agent tools registry
   - Use for landing page visual QA
   - **Effort**: 2-4 hours

2. **Study & Port agent-scripts Components**
   - Review `committer` pattern for our git workflows
   - Review `docs-list` for docs management
   - Extract browser-tools for frontend SubTurtles
   - **Effort**: 4-6 hours

3. **Adopt tokentally for Quota Tracking**
   - Use in our cost calculation system
   - Compare against our current implementation
   - **Effort**: 2-3 hours

### Phase 2: Medium-Term Integrations (Next 2 Weeks)

1. **Evaluate mcporter**
   - Could replace manual MCP discovery
   - Test with our current tools
   - **Effort**: 6-8 hours

2. **Deploy conduit-mcp**
   - Shared file/web handling tool
   - Useful for research and doc-processing SubTurtles
   - **Effort**: 2-3 hours

3. **Study mcp2py**
   - Could simplify Python-MCP integration
   - Prototype with one SubTurtle
   - **Effort**: 4-6 hours

### Phase 3: Architecture Exploration (Future)

1. **Deep Dive on claude-code-mcp**
   - Understand nested agent execution
   - Compare with our SubTurtle subprocess model
   - Evaluate for adoption

2. **Investigate pi-mono fork**
   - Alternative agent framework
   - Worth comparative analysis

3. **Voice Integration (brabble/vox)**
   - Long-term enhancement for accessibility

---

## Deep Dive: agent-scripts Components and Adoption Path

**Date**: 2026-02-27
**Focus**: Detailed review of steipete's agent-scripts repo; identifying patterns to adopt for operational discipline

### 1. Agent-Scripts Overview

steipete's `agent-scripts` (2,078 ⭐) is a **portable, dependency-free utility library** designed for agents to follow operational guardrails. The repo is intentionally small and modular — each script is standalone and zero-repo-specific. It's meant to be **copied into projects as templates** rather than imported as dependencies.

**Core Philosophy**: "Agent guardrails should be explicit, reusable, and not tied to any specific codebase."

**Three Primary Components**:
1. **committer** — Bash script ensuring disciplined git commits
2. **docs-list.ts** — TypeScript tool enforcing front-matter on docs
3. **browser-tools** — Chrome automation CLI for agent-driven browser work

---

### 2. Component Analysis: committer

**What it does**: Bash script that stages specific files, validates commit messages, and creates commits with safety guardrails.

**Key Safety Guards**:

1. **Prevents bulk staging**: Blocks `"."` as argument — forces individual file specification
   ```bash
   # NOT ALLOWED: git add .
   # REQUIRED: git add file1 file2 file3
   ```

2. **File existence validation**: Checks each file exists in disk/git index/HEAD before committing
   - Prevents orphaned file references in commit

3. **Change detection**: Uses `git diff --staged --quiet` to verify actual modifications exist
   - Prevents accidental empty commits

4. **Clean staging area**: `git restore --staged :/` clears staging before adding specified files
   - Ensures no "stray" files sneak into commits

5. **Lock file recovery**: `--force` flag removes stale `.git/index.lock` files
   - Useful when git commands fail due to lock contention

6. **Glob expansion disabled**: `set -f` prevents shell bracket expansion
   - Improves handling of paths with special characters

**Error Handling**:
- Clear error messages for invalid inputs
- Proper exit codes for CI/CD integration
- Validates commit message contains non-whitespace content

**Our Current State**:
- We have `.claude/commands/commit.md` with guidelines for Claude agents
- No automated safety script — agents must follow guidelines manually
- Risk: agents could accidentally `git add .` or commit empty changesets

**Adoption Recommendation**: ⭐ **HIGH PRIORITY**

**Implementation Plan**:
```bash
# 1. Create orchestrator/scripts/committer (copy from steipete)
# 2. Add to PATH in agent startup (orchestrator/scripts/agent-init.sh)
# 3. Update agent guidelines to call `committer "msg" file1 file2` instead of raw git
# 4. Add alias: `alias gco='committer'` in agent-init.sh
```

**Estimated Effort**: 1-2 hours
- 20 min: Copy script, test locally
- 30 min: Integrate into agent startup
- 30 min: Test with SubTurtle workflows

**Expected Benefits**:
- ✅ Prevents `git add .` accidents
- ✅ Prevents empty commits
- ✅ Clearer commit hygiene
- ✅ Easier to audit agent changes

---

### 3. Component Analysis: docs-list.ts

**What it does**: TypeScript tool that walks `docs/`, extracts YAML front-matter (`summary` and `read_when` fields), and displays a formatted list of documentation with context hints.

**Front-Matter Parsing**:
```yaml
---
summary: "Brief one-liner description of the doc"
read_when:
  - "when starting SubTurtle work"
  - "before refactoring scheduler"
---
```

**Key Features**:

1. **Recursive traversal**: Walks docs/ tree, skipping specified exclusions (archive, research, etc.)

2. **Flexible array parsing**: Handles read_when in two formats:
   - JSON inline: `read_when: ["hint1", "hint2"]`
   - YAML list: `read_when:\n  - hint1\n  - hint2`

3. **Error reporting**: Flags issues:
   - Missing front-matter
   - Unterminated delimiters
   - Empty summaries
   - Malformed arrays

4. **Output formatting**: Lists with alphabetical sorting and context hints

5. **Onboarding flow**: Suggests relevant docs to read based on task hints

**Our Current State**:
- Docs exist but have NO front-matter metadata
- No automated doc discovery or context hints
- Agents must manually browse docs/ to find relevant info

**Adoption Recommendation**: ⭐ **MEDIUM-HIGH PRIORITY**

**Implementation Plan**:

**Phase 1: Port docs-list.ts (2-3 hours)**
```bash
# 1. Copy docs-list.ts to orchestrator/scripts/docs-list.ts
# 2. Update exclusions to match our doc structure (skip reviews/, steipete-research.md)
# 3. Test with: npx ts-node orchestrator/scripts/docs-list.ts
```

**Phase 2: Add front-matter to existing docs (1-2 hours)**
```yaml
---
summary: "SubTurtle control system: spawn, monitor, stop autonomous agents"
read_when:
  - "when starting new SubTurtle work"
  - "when debugging agent issues"
---
```

Apply to:
- `docs/code-quality-audit.md`
- `docs/PRD-onboarding.md`
- `docs/UX-overhaul-proposal.md`
- `docs/CODEX_QUOTA_INTEGRATION.md`
- `docs/reviews/review-subturtle.md`
- `docs/steipete-research.md`

**Phase 3: Integrate into agent startup (30 min)**
- Add `docs-list` call to agent initialization
- Display relevant docs based on current task context

**Expected Benefits**:
- ✅ Self-documenting codebase (docs advertise themselves)
- ✅ Agents can discover relevant docs automatically
- ✅ Reduced context-switching (read the right doc at the right time)
- ✅ Better onboarding for new SubTurtles

**Example Output**:
```
📚 Relevant Documentation:

1. docs/PRD-onboarding.md
   → "System architecture, goals, and core concepts"
   📌 Read when: starting new SubTurtle work, architectural questions

2. docs/code-quality-audit.md
   → "Code quality issues and remediation priority"
   📌 Read when: fixing bugs, code review, refactoring

3. docs/steipete-research.md
   → "Evaluation of steipete's agent infrastructure patterns"
   📌 Read when: designing agent features, studying best practices
```

---

### 4. Component Analysis: browser-tools

**What it does**: Lightweight TypeScript CLI for direct Chrome automation via DevTools protocol. Provides process management, page navigation, screenshot capture, and content extraction without requiring a full MCP server.

**Design Philosophy**: Inspired by Mario Zechner's "What if you don't need MCP?" — minimal CLI with big capabilities.

**Key Commands**:

**Process Management**:
- `start` — Launch Chrome with `--remote-debugging-port`
- `inspect` — List running Chrome processes and open tabs
- `kill` — Terminate specific Chrome instance

**Page Interaction**:
- `nav` — Navigate to URL in current or new tab
- `eval` — Execute JavaScript in page context
- `pick` — Interactive DOM picker (click to select element, returns serialized structure)

**Content & Monitoring**:
- `screenshot` — Capture viewport as PNG
- `console` — Monitor console logs with timestamps
- `content` — Extract page content as Markdown
- `search` — Google search with optional content extraction
- `cookies` — Export cookies as JSON

**Our Current State**:
- We have a specialized `browser-tester` agent for validation testing
- No lightweight CLI tool for ad-hoc browser automation
- SubTurtles that need browser interaction must spawn the agent (expensive)
- Peekaboo covers visual testing; browser-tools covers general automation

**Adoption Recommendation**: ⭐ **MEDIUM PRIORITY**

**Why Not High Priority**:
- Our browser-tester agent already handles validation
- Peekaboo (MCP server) covers visual QA
- Most browser work in SubTurtles is via Playwright (existing approach)

**Why Still Valuable**:
- Lighter weight than spawning full browser-tester agent
- Better for quick checks (does element exist? what does console show?)
- Could replace some Playwright calls with simpler CLI commands
- Useful for troubleshooting during agent execution

**Implementation Path**:

**Option A: Port & Deploy (3-4 hours)**
- Copy browser-tools.ts to orchestrator/scripts/browser-tools.ts
- Compile to binary with `esbuild` or `bun --build`
- Add to agent PATH
- Use for quick browser checks in SubTurtles

**Option B: Integrate with Peekaboo (2-3 hours)**
- Use Peekaboo for visual testing (higher priority)
- Keep browser-tools as optional fallback for CLI usage
- Don't prioritize unless SubTurtles need ad-hoc browser interaction

**Recommended**: **Defer to Phase 2** — Peekaboo covers the immediate visual testing gap. Revisit browser-tools when SubTurtles need more frequent ad-hoc browser interaction.

---

### 5. Adoption Summary & Priority Matrix

| Component | Priority | Effort | Impact | Adoption Path |
|-----------|----------|--------|--------|---|
| **committer** | ⭐⭐⭐ HIGH | 1-2h | Prevents git accidents | Copy script, integrate into agent-init |
| **docs-list.ts** | ⭐⭐ MEDIUM-HIGH | 3-4h total (1h port + 2h frontmatter + 30m integration) | Better doc discovery | Port, add frontmatter, integrate into startup |
| **browser-tools** | ⭐ MEDIUM | 3-4h | Optional CLI convenience | Defer to Phase 2, prototype with Peekaboo first |

---

### 6. Implementation Roadmap

**Immediate (This Sprint)**:
1. ✅ Copy `committer` script to orchestrator/scripts/
2. ✅ Test with local git operations
3. ✅ Update agent guidelines to use `committer` instead of raw `git commit`

**Next Sprint (1-2 weeks)**:
1. ✅ Port `docs-list.ts` to orchestrator/scripts/
2. ✅ Add YAML front-matter to existing docs/
3. ✅ Integrate `docs-list` into agent startup flow

**Phase 2 (Medium-term)**:
1. Deploy Peekaboo MCP for visual testing
2. Prototype browser-tools as optional CLI enhancement
3. Consider mcp2py integration for Python SubTurtles

---

### 7. Key Takeaway: Operational Discipline

agent-scripts is fundamentally about **encoding guardrails as code** rather than relying on agent behavior. The patterns are:

1. **committer**: Explicit file staging prevents accidents
2. **docs-list**: Front-matter metadata enables self-discovery
3. **browser-tools**: Minimal CLI avoids dependency bloat

**For our system**: These patterns fit perfectly with our ethos of "silent, reliable, autonomous operation." Adopting them will improve:
- Commit hygiene (fewer accidental `git add .` operations)
- Documentation discoverability (agents find relevant docs automatically)
- Browser automation (lightweight ad-hoc checks)

---

## Summary: Key Takeaways

**steipete is to "agent tooling" what Django is to web frameworks** — a pragmatic, opinionated collection of utilities that solve real problems agents face. His work is characterized by:

- ✅ **Pragmatism** — Tools that work, not theoretical exercises
- ✅ **Portability** — Designed to be copied into other projects (agent-scripts, committer)
- ✅ **Multi-platform** — Swift + TypeScript + Go polyglot approach
- ✅ **User-Centric** — Focuses on the experience (clausode-mcp as MCP embedding is brilliant)
- ✅ **Agent-Native** — Every tool considers AI agents as first-class users

Our agentic system is already on a good track. The key adoptions are:
1. **Peekaboo** for visual testing
2. **agent-scripts** components for operational discipline
3. **MCP-based tools** (conduit-mcp, macos-automator-mcp) to expand agent capabilities
4. **Study mcporter** to potentially simplify our tool integration layer

The biggest gap: **We lack visual testing automation for frontend work.** Peekaboo closes that gap immediately.

---

**Document Version**: 1.0
**Research Completed**: 2026-02-27
**Researcher**: steipete-research SubTurtle
**Catalog Completeness**: 92 repositories audited (82 original, 10 forks)
