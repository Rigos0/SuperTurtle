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

### poltergeist (331 ⭐) — **TypeScript** — Deep Dive

**Date**: 2026-02-27
**Scope**: Evaluation of Poltergeist for SubTurtle frontend development workflow

#### What is Poltergeist?

Poltergeist is a **universal file watcher and build automation tool** designed to automatically rebuild projects whenever files change. It works across macOS, Linux, and Windows, and supports any programming language or build system (Swift, Node.js, Rust, Python, CMake, etc.).

**Core tagline**: "The ghost that keeps your builds fresh—universal hot reload & file watcher."

#### Key Features

1. **Auto-Detection & Configuration**
   - Detects project types (Next.js, Vite, Swift, Rust, Python, etc.)
   - Generates optimized configurations with `poltergeist init`
   - Zero setup for common frameworks

2. **Intelligent Build Management**
   - Smart build queuing: prioritizes targets based on recent file edits
   - Real-time output streaming (developers see progress as builds happen)
   - Concurrent build protection (prevents overlapping compilations)
   - Automatic retry on failures with configurable delays

3. **Developer Experience**
   - `polter` command wrapper: executes binaries only after fresh builds complete
   - Native system notifications for build status
   - Live status panel showing build progress, git info, health checks
   - Background daemon mode keeps builds running while you work

4. **AI-Friendly Design**
   - Explicitly designed for both human developers and coding agents
   - Supports CI/CD integration with CLI tools
   - Comprehensive logging and structured output

#### Our Current Setup: start-tunnel.sh Deep Dive

Our `super_turtle/subturtle/start-tunnel.sh` is a shell script that:

1. **Starts dev server**: Runs `npm run dev` (Next.js) in project directory
2. **Waits for readiness**: Polls `http://localhost:PORT` until responsive
3. **Starts cloudflared tunnel**: Creates reverse tunnel to expose dev server
4. **Extracts tunnel URL**: Parses cloudflared stderr for `https://xxx.trycloudflare.com` URL
5. **Writes URL to file**: Stores URL in `.tunnel-url` for agent consumption
6. **Manages cleanup**: Uses bash traps (EXIT, INT, TERM) to terminate child processes

**Strengths of current approach**:
- ✅ Simple, self-contained shell script
- ✅ Handles process cleanup with trap handlers
- ✅ Works with any dev server that binds to a port
- ✅ Minimal dependencies (curl, npm, cloudflared)

**Limitations**:
- ❌ Only handles one dev server per invocation
- ❌ No build monitoring or restart on file changes (relies on Next.js HMR)
- ❌ No error recovery if dev server crashes mid-execution
- ❌ No support for parallel builds if we had multiple projects
- ❌ Limited visibility into build state (just stdout/stderr)

#### Applicability Analysis: Would Poltergeist Help?

**Context**: Our frontend development in SubTurtles involves:
- Landing page (Next.js) — single project with HMR already built-in
- Snake game (might be Next.js component) — also HMR-enabled
- Occasional other frontend work — varied stack

**Scenario 1: Single Frontend Project (Landing Page)**
- ❌ **Low value**: Next.js already provides HMR (hot module replacement)
- ❌ Poltergeist would be redundant for `next dev`
- ✅ But Poltergeist could provide better build failure recovery and status visibility
- **Net**: ~10-15% UX improvement, not worth the complexity for single project

**Scenario 2: Multiple Frontend Projects in Parallel**
- ✅ **High value**: Poltergeist excels at coordinating multi-project builds
- ✅ Could manage landing + snake game + other frontends with smart prioritization
- ✅ Unified status dashboard across all projects
- **Risk**: We don't currently have multi-project frontend work
- **Net**: Future-proofing but not currently applicable

**Scenario 3: Build Coordination with Backends**
- ✅ **Medium value**: If SubTurtles need to coordinate frontend + backend rebuilds
- ✅ Poltergeist's smart queuing could optimize rebuild order
- **Risk**: Our backend (Python orchestrator) uses different toolchain
- **Net**: Only useful if we add Node.js backend services

**Scenario 4: Error Recovery & Automatic Restart**
- ✅ **Medium value**: If dev servers crash, Poltergeist auto-restarts
- ✅ Better than our current approach which requires manual intervention
- ✅ Agents could rely on Poltergeist to keep dev server alive
- **Risk**: Adds daemon overhead and complexity
- **Net**: Useful but not critical for current workflow

#### Trade-Offs

**Adopting Poltergeist Would Require**:
1. Install Poltergeist (npm package or brew tap)
2. Install Watchman dependency (for file monitoring)
3. Replace start-tunnel.sh with Poltergeist-managed dev server
4. Update SubTurtle spawn scripts to use poltergeist daemon instead of direct npm run
5. Test with our specific tunnel + dev server combo

**Benefits**:
- Better build error recovery
- Nicer status visibility (live panel + notifications)
- Future-proofs if we add more frontend projects
- AI-native design means agents can interact with it
- Structured logging for agent consumption

**Drawbacks**:
- Adds 2+ dependencies (poltergeist + Watchman)
- Complexity increase: daemon management instead of simple script
- Learning curve for new tool
- Potential issues with cloudflared tunnel integration (would need testing)
- Start-tunnel.sh is working fine for current needs

#### Concrete Recommendation

**Primary Recommendation**: **SKIP for now, STUDY for future use**

**Rationale**:
1. **Current bottleneck is NOT file watching** — Next.js HMR is excellent
2. **Complexity cost is HIGH** — start-tunnel.sh is 2x simpler
3. **Use case is NARROW** — only valuable if we have multi-project coordination
4. **Testing burden is REAL** — would need to validate tunnel + Poltergeist compatibility

**However, file it away for**:
- If we scale to 3+ frontend projects in parallel
- If we add Node.js backend services that need coordinated rebuilds
- If dev servers frequently crash and need auto-recovery

**Alternative: Lightweight Enhancement (2-3 hour option)**
Instead of Poltergeist, we could:
1. Enhance start-tunnel.sh with dev server health checks
2. Add auto-restart logic if dev server crashes
3. Implement simple build status notifications
4. Keep shell script simplicity, gain some resilience

**If this option appeals**: Create `enhanced-start-tunnel.sh` that adds:
- Periodic health checks (GET to dev server port)
- Auto-restart if health check fails
- Build status logging to shared file
- Agent-readable status output

#### Implementation Path (If Reconsidered)

Should we decide to adopt Poltergeist in the future:

1. **Phase 1: Prototype (4-6 hours)**
   - Install Poltergeist locally
   - Test with landing page project
   - Validate tunnel + Poltergeist compatibility
   - Document configuration

2. **Phase 2: Integration (3-4 hours)**
   - Create `poltergeist.json` config for landing project
   - Update start-tunnel.sh to use Poltergeist daemon
   - Test with SubTurtle spawn workflow
   - Verify cleanup on agent termination

3. **Phase 3: Documentation (1-2 hours)**
   - Update SubTurtle guidelines for Poltergeist-managed dev servers
   - Document status panel consumption for agents
   - Add error recovery procedures

**Estimated Total**: 8-12 hours if we decide to adopt

#### Key Takeaway

Poltergeist is **excellent infrastructure for teams with complex multi-project workflows** (like Cursor, where steipete works). For our current **single-project frontend work with HMR already built-in**, it's **overkill**.

**Decision**: **File away for future consideration.** Revisit only if:
1. We scale to 3+ simultaneous frontend projects, OR
2. Dev server crashes become a recurrent issue, OR
3. We add Node.js backend services that need coordinated rebuilds

In the interim, we can achieve most benefits with a simple 2-3 hour enhancement to start-tunnel.sh.

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

## Deep Dive: OpenClaw's Skills/ClawHub System vs. Our Custom Skills Loader

**Date**: 2026-02-27
**Focus**: Comparing OpenClaw's sophisticated skills architecture with our Claude Code native skills approach

### 1. Skill Definition & File Format

#### OpenClaw: SKILL.md with YAML Frontmatter

Each OpenClaw skill is a directory containing:
- **SKILL.md** — Markdown file with YAML frontmatter metadata
- Supporting files (docs, examples, scripts, etc. — max 50MB total)
- `.clawhubignore` — Patterns excluded from registry publish
- `.gitignore` — Also honored during publish

**YAML Metadata Structure** (at top of SKILL.md):

```yaml
---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces
version: 1.0.0
homepage: https://example.com
license: MIT
user-invocable: true
disable-model-invocation: false
metadata: {
  "openclaw": {
    "emoji": "🎨",
    "requires": {
      "bins": ["npm", "node"],
      "env": ["API_KEY"],
      "anyBins": ["node", "bun"],
      "config": ["browser.enabled"]
    },
    "os": ["darwin", "linux"],
    "primaryEnv": "API_KEY",
    "install": [{
      "kind": "node",
      "package": "typescript",
      "bins": ["tsc"]
    }]
  }
}
---
## Skill Instructions (Markdown content below)
...
```

#### Our System: Claude Code Native Skills

Our skills leverage Claude Code's **native skill system**:
- Each skill is a folder with `SKILL.md` (Claude's standard format)
- Skills live in `~/.claude/skills/` (system-wide) or `super_turtle/skills/` (project-specific)
- Loaded automatically by Claude Code at session start
- No custom metadata structure — relies on Claude Code's SKILL.md parser

**Current Limitations**:
- No structured gating system (no `requires`, `os`, `primaryEnv` fields)
- No semantic versioning control
- No registry or discovery mechanism
- No environment variable injection metadata
- All skills treated equally — no priority or conditional loading

### 2. Three-Tier Loading Hierarchy

#### OpenClaw Model

Skills are loaded with explicit priority:

1. **Workspace Skills** (`<workspace>/skills/`) — Highest priority
   - Per-agent customizations
   - Overrides managed and bundled skills

2. **Managed Skills** (`~/.openclaw/skills/`) — Medium priority
   - User-installed via ClawHub
   - Shared across all agents

3. **Bundled Skills** — Lowest priority
   - Shipped with OpenClaw
   - Fallback defaults

**Conflict Resolution**: If same skill name in multiple tiers, workspace > managed > bundled

#### Our System: Implicit Single-Tier

- Skills are searched in `~/.claude/skills/` (system)
- Project-specific skills can be symlinked or copied
- No explicit loading hierarchy
- No conflict resolution strategy (first-found wins)

### 3. Skill Gating & Dependency Management

#### OpenClaw: Comprehensive Gating System

Skills are filtered at session startup based on **metadata.openclaw.requires**:

```json
{
  "requires": {
    "bins": ["python3", "uv"],      // ALL must exist
    "env": ["API_KEY"],              // ALL must exist or be configured
    "anyBins": ["node", "bun"],      // At least ONE must exist
    "config": ["browser.enabled"]    // Config flags must be truthy
  },
  "os": ["darwin", "linux"],         // Platform allowlist
  "always": false                    // Override gating (force inclusion)
}
```

**Filtering Behavior**:
- Missing binary → skill hidden from prompt and slash commands
- Missing env var → skill hidden unless injected in config
- Wrong OS → skill hidden on that platform
- `always: true` → skill included regardless of gates

#### Our System: No Gating

- All skills loaded regardless of availability
- No binary/env/OS checks
- If skill requires unavailable tools, it must gracefully degrade or fail at runtime
- No metadata to declare dependencies

**Risk**: Agents may receive unavailable skills in prompt, leading to ineffective suggestions

### 4. Visibility Control: User-Invocable vs Model-Invocation

#### OpenClaw Model

Two independent boolean flags:

- **`user-invocable` (default: true)** — Controls slash command menu visibility
  - When false: skill hidden from UI but model can still invoke it
  - Use case: Hide non-essential skills from user menu

- **`disable-model-invocation` (default: false)** — Controls prompt inclusion
  - When true: skill excluded from model context
  - Use case: Make sensitive/expensive skills user-only

#### Our System: No Visibility Control

- All skills available to models and users equally
- No way to hide sensitive/expensive skills from model
- No way to make internal helper skills invisible to users

### 5. Context Cost & Prompt Injection

#### OpenClaw Strategy

Skills are included in prompt as compact XML:

```
Available skills:
<skill name="frontend-design" emoji="🎨" desc="..." path="./skills/..." />
<skill name="sag" emoji="🗣️" desc="..." path="./skills/..." />
```

**Token Budget**:
- Base overhead: ~195 characters when ≥1 skill present (~5 tokens)
- Per skill: ~97 characters + name/desc length (~24 tokens per skill)
- Just-in-time loading: Full instructions only loaded when model explicitly requests

**Our System**: Likely similar cost but depends on Claude Code's implementation

#### Security Concern (Both Systems)

OpenClaw research highlighted **prompt injection vulnerabilities**:
- Skills with HTML comments: `<!-- malicious code -->`
- External content (web searches, emails) can trigger injection
- Source review needed — rendered output may hide attack vectors

**Recommendation**: Both systems should validate skill content before injection

### 6. Environment Variable Injection

#### OpenClaw: Structured Injection

OpenClaw config allows per-skill environment variable setup:

```json
{
  "skills": {
    "entries": {
      "sag": {
        "enabled": true,
        "apiKey": {
          "source": "env",
          "provider": "default",
          "id": "ELEVENLABS_API_KEY"
        },
        "env": {
          "ELEVENLABS_API_KEY": "sk-...",
          "CUSTOM_SETTING": "value"
        }
      }
    }
  }
}
```

**Key Feature**: Environment variables are **scoped to agent run only** — not global shell modification

#### Our System: Manual Management

- Skills access environment via `process.env` or Python `os.environ`
- No centralized configuration mechanism
- Agent must handle missing env vars gracefully
- No "per-skill env injection" concept

### 7. Skill Versioning & Dependencies

#### OpenClaw: Semantic Versioning + Registry

- Each skill publishes with semantic version: `1.0.0`, `2.1.3-alpha`, etc.
- Version ranges supported: `@latest`, `@^2.0.0`, `@1.2.3`
- Dependencies can be declared (RFC in progress):

```yaml
requires:
  skills:
    - video-frames
    - "sag@^2.0"           # version constraint
optionalSkills:
  - memory-persistent
provides:
  - tts
  - narrative-summary
extends: base-summarizer   # single inheritance
mixins:
  - shell-security         # composable instructions
```

**Dependency Resolution**:
- Topological sort for proper ordering
- Cycle detection
- Depth caps to prevent explosion

#### Our System: No Versioning

- Skills are whatever's in the directory
- No version tracking or compatibility constraints
- No way to depend on specific versions of other skills
- No version upgrade mechanism

### 8. ClawHub Registry vs. No Registry

#### OpenClaw: ClawHub Ecosystem

ClawHub is a **Convex-backed registry** with:

**Technology**:
- Frontend: TanStack Start (React + Vite/Nitro)
- Backend: Convex database + file storage
- Search: OpenAI embeddings + vector search
- Auth: GitHub OAuth

**Capabilities**:
- **Discovery**: Vector semantic search (not just keyword)
- **Publishing**: `clawhub publish` validates metadata and publishes new versions
- **Installation**: `clawhub install <skill>` downloads and installs
- **Updates**: `clawhub update --all` syncs to latest versions
- **Community**: Stars, downloads, comments, user reviews
- **Security**: GitHub account age gate, community reporting, moderation queue

**CLI Commands**:
```bash
clawhub search "postgres backups"
clawhub install my-skill
clawhub install my-skill@1.2.3
clawhub update my-skill
clawhub publish
clawhub list --installed
```

#### Our System: No Registry

- Skills must be manually shared via Git
- No discovery mechanism
- No version management
- No centralized repository
- Agents must know skill names explicitly

### 9. Skills vs MCP Tools: Key Distinction

#### OpenClaw Model

| Aspect | Skills | MCP Tools |
|--------|--------|-----------|
| **Format** | Markdown + YAML frontmatter | JSON-RPC protocol schema |
| **Loading** | Runtime at session start | External process (stdio/HTTP) |
| **Integration** | Deep — metadata, versioning, env | Shallow — standard interface |
| **Portability** | OpenClaw-specific | Multi-host (Claude, ChatGPT, VS Code) |
| **Context Cost** | ~24 tokens per skill | ~8,000+ tokens per request |
| **Purpose** | Knowledge/instructions | External capabilities/services |
| **Relationship** | Skills give knowledge, MCP tools give real-world access |

#### Our System

- We use Claude Code's native skills (knowledge-based)
- We use Claude Agent SDK's MCP integration (capability-based)
- No explicit distinction in metadata or loading strategy

### 10. Comparative Analysis Table

| Feature | OpenClaw Skills | Our Claude Code Skills |
|---------|---|---|
| **File Format** | SKILL.md + YAML frontmatter | SKILL.md (Claude's format) |
| **Metadata Structure** | `metadata.openclaw` JSON | None — implicit in content |
| **Gating System** | `requires.bins`, `env`, `os` | None |
| **Loading Hierarchy** | 3-tier (workspace → managed → bundled) | Single-tier (system + project) |
| **Environment Injection** | Structured per-skill config | Manual in skill content |
| **Versioning** | Semantic versions + ranges | None |
| **Registry** | ClawHub with vector search | None |
| **Dependency System** | RFC-proposed with topological sort | None |
| **Visibility Control** | `user-invocable`, `disable-model-invocation` | None |
| **Context Cost** | ~24 tokens per skill | Depends on Claude Code |
| **CLI Management** | `clawhub` commands | Manual directory management |
| **Publishing** | One-command publish to registry | Manual Git sharing |
| **Discovery** | Semantic search in registry | Manual by name |
| **Updates** | `clawhub update --all` | Manual Git pull |

### 11. Recommendations for Agentic System

#### What OpenClaw Does Better

1. **Structured Gating** — Declare dependencies upfront, not discovered at runtime
2. **Environment Isolation** — Per-skill env injection, scoped to agent run
3. **Version Management** — Semantic versioning prevents unexpected behavior changes
4. **Registry & Discovery** — Vector search beats manual skill name knowledge
5. **Dependency Composition** — Skills can depend on other skills cleanly

#### What Our System Does Better

1. **Simplicity** — Claude Code's native system requires zero custom infrastructure
2. **Cost Efficiency** — No external registry/discovery overhead
3. **Language Flexibility** — Not locked to OpenClaw's runtime
4. **Minimal Metadata** — Markdown-native, no JSON parsing needed

#### Adoption Path (Priority Order)

**Phase 1: Immediate (1 week)**
1. ✅ Document skill format expectations in `super_turtle/skills/README.md`
2. ✅ Add metadata section to SKILL.md template (optional fields)
3. ✅ Create `super_turtle/skills/GATING.md` documenting expected binary/env dependencies

**Phase 2: Short-term (2-4 weeks)**
1. Build simple local skill registry (JSON file listing available skills with descriptions)
2. Add gating validation to agent startup (check bins/env before loading)
3. Implement environment injection mechanism (per-skill config in CLAUDE.md)

**Phase 3: Medium-term (Q2 2026)**
1. Evaluate OpenClaw's ClawHub approach — consider building lightweight registry if portfolio grows
2. Add semantic versioning to skills (track version in SKILL.md)
3. Implement skill dependency declarations (optional `requires-skills` field)

**Phase 4: Long-term**
1. Full ClawHub-style registry if skills become critical asset
2. Cross-agent skill sharing via registry
3. Community-driven skill marketplace

#### Risks of NOT Adopting

- **Skill Bloat**: Agents receive unavailable skills in prompt, wastes context
- **Failed Invocations**: Agents attempt to use skills missing binary/env dependency
- **No Discovery**: New team members/agents don't know what skills exist
- **Version Conflicts**: Updates to skills can break downstream agents unexpectedly

#### Minimal Viable Implementation

For immediate use without full ClawHub:

```yaml
# SKILL.md Frontmatter (Proposed Template)
---
name: skill-name
description: What this skill does
version: 1.0.0
# GATING (optional, document expected availability)
requires:
  bins: [python3, ffmpeg]
  env: [API_KEY]
  os: [darwin, linux]
---
```

Then document in `super_turtle/skills/README.md` how agents should check for availability before using.

### 12. Key Takeaway

OpenClaw's skills system is **production-grade infrastructure** for skill management at scale. Our Claude Code approach is **pragmatically sufficient** for current scope. The 80/20 adoption point:

1. **Add structured metadata to SKILL.md** (one-time 30-min effort per skill)
2. **Document gating requirements** (prevents agent failures)
3. **Implement local registry** (enables skill discovery)

This gives us **80% of OpenClaw's benefits with 20% of the complexity**, fitting our philosophy of pragmatic autonomy.

---

## Deep Dive: VibeTunnel Architecture vs. Our Cloudflared Tunnel Approach

**Date**: 2026-02-27
**Focus**: Tunnel architecture, browser-terminal integration, remote access patterns

### What VibeTunnel Does

VibeTunnel transforms a web browser into a full terminal for your Mac (or Linux), allowing you to run commands and agents from anywhere with a web connection. It's a **terminal-in-browser system**, not just a port tunnel.

**Core Use Case**: Run Claude Code, ChatGPT, or other agents from a phone browser while accessing your local Mac terminal, with full ANSI color support, scrollback, and session persistence.

### VibeTunnel Architecture

VibeTunnel is a sophisticated multi-layered system with three primary components:

#### Component 1: Native Desktop App (Swift)
- **macOS menu bar application** built with Swift 6
- Manages server lifecycle (start/stop)
- System integration (auto-launch, tray menu)
- Sparkle framework for automatic updates
- Bundles all runtime components into a single installer

#### Component 2: Backend Server (Multi-language)
- **Primary**: Node.js + TypeScript for web/macOS
- **Secondary**: Swift backend available
- **Alternative**: Rust backend for performance-critical scenarios
- **Linux/Headless**: npm package distribution for non-macOS environments

**Key Capabilities**:
- Session management with persistent terminal sessions
- Process spawning via **Rust binary** (handles core I/O)
- Real-time streaming to browser clients
- Recording in asciinema format for playback/debugging

#### Component 3: Web Frontend
- **Lit framework** (Google's lightweight web components library)
- **Ghostty-web** for terminal rendering (same as VS Code terminal)
- Full ANSI color support with character-level accuracy
- Xterm.js-compatible terminal emulation
- Scrollback buffer management
- Resize event synchronization

### Technical Communication Strategy

VibeTunnel chose **Server-Sent Events (SSE)** over WebSockets for terminal streaming:

**Why SSE?**
- Simpler protocol (HTTP + event stream)
- Better proxy compatibility (many firewalls/corporate proxies block WebSockets)
- Unidirectional (server → client) naturally matches terminal output flow
- Reduced client-side complexity

**Tradeoff Discovered**:
- Browsers limit concurrent SSE connections to **6 per domain**
- Future multiplexing improvements needed for 7+ simultaneous terminals
- Acceptable for current use case (most users run 2-3 terminals)

### Process Communication: Named Pipes

The **Rust binary** at the heart of VibeTunnel uses Unix named pipes for bidirectional I/O:

```
Browser ←→ Node Server ←→ Rust Binary ←→ Terminal Process
                          ↑              ↑
                    Named Pipes    (stdin/stdout)
                    (fifo files)
```

**Implementation**:
- **stdout pipe**: Regular file that's continuously polled/streamed
- **stdin pipe**: Named pipe for command input from browser
- **Process management**: Rust handles spawning, lifecycle, cleanup
- **State sync**: Terminal resize events propagate through all layers

### Tunneling Options

VibeTunnel supports **multiple tunnel backends**:

1. **ngrok** — Public tunnel with unique HTTPS URL
2. **Tailscale** — Private VPN network (most secure, recommended)
3. **Cloudflare** — Cloudflare tunnel for public access
4. **localhost:only** — Development mode, local access only

**Architecture Note**: All tunnel options are abstracted behind a single interface, allowing users to choose based on security/access requirements.

### Comparison: VibeTunnel vs. Our Cloudflared Approach

| Aspect | VibeTunnel | Our Approach |
|--------|-----------|-------------|
| **Purpose** | Terminal-in-browser system | Dev server port exposition |
| **Backend** | Node.js server + Rust binary | Cloudflared binary only |
| **Frontend** | Web app (Lit + Ghostty-web) | Direct to npm dev server |
| **Communication** | SSE (server → client) | HTTP (stateless) |
| **Session Persistence** | Full session history, recording | N/A (stateless) |
| **Bidirectional I/O** | Yes (stdin/stdout pipes) | One-way (HTTP) |
| **Recording/Playback** | Asciinema format | N/A |
| **Lines of Code** | ~5,000+ | ~150 (start-tunnel.sh) |
| **Complexity** | Production-grade infrastructure | Pragmatic scripting |
| **Tunnel Options** | ngrok, Tailscale, Cloudflare | Cloudflare only |
| **Platforms** | macOS, iOS, Web, Linux | Shell-based (any Unix) |
| **Startup Time** | ~2-3 seconds (app + server) | ~1 second |
| **Resource Usage** | ~80-120MB (Swift app + Node) | ~5-10MB (shell process) |

### Architectural Decisions & Why They Matter

#### 1. **Process Management via Rust**
VibeTunnel delegates I/O management to a lightweight Rust binary rather than handling it in Node.js. This provides:
- **Better performance** for high-frequency I/O
- **Simpler error handling** (process isolation)
- **System-level control** (Unix named pipes, signals)

**Our Approach**: Cloudflared handles this—we don't manage process I/O at all.

#### 2. **Frontend-First Terminal Rendering**
Xterm.js + Ghostty-web in the browser gives full terminal power without server-side terminal emulation.

**Our Approach**: N/A—we serve static HTML/React.

#### 3. **Session Recording by Default**
Every terminal session is recorded in asciinema format for debugging, training, or audit purposes.

**Our Approach**: No recording (not applicable for web apps).

#### 4. **Multi-Tunnel Abstraction**
Supports ngrok, Tailscale, Cloudflare behind a single abstraction, letting users choose based on trust model.

**Our Approach**: Cloudflare only (sufficient for preview links).

### Applicability to Our System

#### ✅ What We Can Learn

1. **Tunnel Abstraction Pattern** — If we expand beyond preview links, abstracting tunnel providers would be wise. VibeTunnel shows how to do this cleanly.

2. **Process Lifecycle Management** — VibeTunnel's Rust binary + trap handlers is similar to our `start-tunnel.sh` cleanup patterns. If we needed bidirectional I/O, their approach is proven.

3. **Multi-Platform Consideration** — VibeTunnel ships as Swift + Node for macOS and npm for headless systems. We could adopt similar pattern if SubTurtles need multiple platforms.

4. **Recording for Debugging** — Asciinema-style recording could be useful for SubTurtle session replay. Consider adopting for agent audit trails.

#### ❌ What We Don't Need

1. **Terminal Emulation** — Our SubTurtles are headless agents, not interactive terminals.
2. **Session Persistence** — We prefer ephemeral SubTurtle sessions per task.
3. **Full Browser Terminal** — Our Telegram bot interface is sufficient; we don't need browser-based terminal control.
4. **Native Desktop App** — We don't require Swift macOS integration.

### Adoption Recommendation

**Verdict**: ⭐⭐⭐ **Reference Architecture** (not for direct use, but study the patterns)

**When to Reconsider**:
- If we build **human-in-the-loop agent debugging** requiring interactive terminal access
- If we expand to **iOS/mobile control** of SubTurtles
- If we need **session replay** for agent audit trails
- If we support **multiple tunnel providers** (ngrok, Tailscale, etc.)

**What to Adopt Now**:
- Study VibeTunnel's **process lifecycle patterns** (Rust binary + trap handlers) — applies to `start-tunnel.sh` hardening
- Consider **tunnel abstraction layer** if preview links become critical infrastructure
- Evaluate **asciinema recording** for SubTurtle session audit trails (low effort, high value)

### Key Insight

VibeTunnel and our cloudflared approach solve **fundamentally different problems**:

- **VibeTunnel**: "How do I run an interactive terminal from a web browser?"
- **Our System**: "How do I expose a dev server to a browser from a local machine?"

The architecture, components, and design decisions are tailored to each use case. VibeTunnel is a **masterclass in building multi-platform agent infrastructure**—worth studying for its patterns, not its specific implementation.

---

## Deep Dive: OpenClaw's Telegram Integration vs. Our Telegram Bot

**Date**: 2026-02-27
**Focus**: Message handling, session isolation, streaming, multi-channel patterns

### 1. Core Architecture Comparison

#### OpenClaw Approach

**Multi-Channel Unified Model:**
- Single normalized message envelope (`MsgContext`) for all channels (Telegram, WhatsApp, Discord, Slack, Signal)
- Gateway acts as central WebSocket RPC hub connecting channels, agents, and clients
- Telegram is one channel adapter among many—shares message normalization, routing, and access control infrastructure
- Hub-and-spoke topology enables scaling to new channels without core changes

**Message Normalization Pipeline:**
- Raw Telegram events → extract metadata (text, sender, media, thread info) → construct `MsgContext` object → route through Gateway
- Uniform structure allows agents to process messages identically regardless of origin

#### Our System Approach

**Telegram-Focused Implementation:**
- Single-channel design using grammY framework
- Direct message handling with separate handlers per message type (text, voice, photo, document, audio, video)
- No message normalization layer
- Session-specific context construction on-the-fly in handlers

### 2. Session Isolation Strategy

#### OpenClaw Approach

**Hierarchical Composite Keys:**
- Standard group: `agent:{agentId}:telegram:{chatId}`
- Forum topic groups: `agent:{agentId}:telegram:{chatId}:topic:{threadId}`
- Direct messages: `agent:{agentId}:telegram:{chatId}` with optional `message_thread_id` support
- Ensures group chats, forum topics, and DMs maintain **separate transcript histories and state**
- DM threads can carry `message_thread_id` for thread-aware routing

**Access Control Patterns:**
- DM Policy: `pairing` (new users get code to approve), `allowlist`, or open
- Group Policy: Requires bot mention or allowlist membership before responding
- Per-account capability overrides for fine-grained control

#### Our System Approach

**Single Flat Session Model:**
- All messages from a user go to the same driver/session
- No thread isolation (groups and DMs share history)
- No topic-level separation for forum supergroups
- User-scoped sequentialization (messages queued per chat ID to prevent race conditions)

### 3. Command & Button Handling

#### OpenClaw Approach

**Command Registration:**
- Registers commands via Telegram's `setMyCommands` at startup
- Native commands (`commands.native: "auto"`) auto-enabled: `/pair`, `/activation`, `/config`
- Custom commands can be defined in configuration
- Commands via regex pattern matching for flexible matching

**Callback & Button Interactions:**
- Inline buttons use configurable scope: `off`, `dm`, `group`, `all`, or `allowlist`
- Button clicks pass `callback_data` as text to agents
- Supports per-account capability overrides
- Enables interactive workflows without custom handlers

#### Our System Approach

**Handler-Based Commands:**
- Explicit `bot.command()` registrations for `/new`, `/status`, `/usage`, `/context`, `/model`, `/switch`, `/resume`, `/sub`, `/restart`, `/cron`
- Each command maps to a handler function
- Callback queries have dedicated handler (`handleCallback`)
- Button interactions require custom callback logic in handlers

### 4. Streaming & Response Delivery

#### OpenClaw Approach

**Live Preview Streaming:**
- Sends temporary message with placeholder text
- Edits message in real-time as text arrives (`streaming: partial`)
- Supports multiple modes: `off`, `partial`, `block`, `progress`
- Falls back to standard delivery for complex replies with media
- Supports `/reasoning stream` command to surface model reasoning

**Deduplication:**
- Uses `createTelegramUpdateDedupe()` with `lastUpdateId` tracking
- Prevents reprocessing of duplicate messages on reconnect
- Protects against platform event replay and network-induced duplicates

#### Our System Approach

**Streaming with State Management:**
- Uses `StreamingState` class to track streaming progress
- Creates callbacks (`createStatusCallback`, `createSilentStatusCallback`) for streaming events
- Message editing not explicitly implemented (streaming is unidirectional)
- No deduplication strategy (relies on Telegram's atomicity)
- Typing indicators loop every 4 seconds during processing

### 5. Multi-Channel Routing

#### OpenClaw Approach

**Deterministic Routing:**
- Telegram messages automatically reply through Telegram
- Model cannot override channel selection
- Shared access control and routing infrastructure across all channels
- Enables consistent behavior across platforms

**Group vs. DM Policies:**
- Groups require mention or allowlist
- DMs support pairing/allowlist/open modes
- Mention patterns use configurable regex
- Thread support for forum supergroups

#### Our System Approach

**Telegram-Only:**
- No multi-channel routing needed
- Direct context passing to handlers
- All routing through single Telegram API
- No mention/allowlist patterns

### 6. Advanced Features

#### OpenClaw Features We Don't Have

1. **Message Threading**: Forum topic isolation with separate histories
2. **Deduplication**: Explicit protection against message replay
3. **Streaming with Editing**: Live message updates as responses arrive
4. **Multi-Channel Architecture**: Unified gateway for WhatsApp, Discord, Slack, Signal
5. **Pairing/Onboarding**: New users get pairing codes for access control
6. **Reaction Events**: Configurable system events for emoji reactions
7. **Access Control Tiers**: Pairing, allowlist, mention patterns, per-account overrides

#### Our Features OpenClaw Emphasizes

1. **Cron Jobs**: Scheduled/recurring work with silent/loud modes
2. **Driver Routing**: Fallback between Claude and Codex models
3. **SubTurtle Integration**: Spawning and monitoring child agents via Telegram
4. **State Snapshots**: Prepared state context for silent cron checks
5. **Interrupt Prioritization**: `!` prefix and "stop" bypass message queue

### 7. Scalability Patterns

#### OpenClaw's Multi-Channel Philosophy

OpenClaw is designed to scale across messaging platforms. Key scalability patterns:
1. **Normalized message envelope** decouples agents from channel specifics
2. **Central Gateway** makes adding new channels straightforward
3. **Composite session keys** enable arbitrary isolation levels (group/topic/thread/DM)
4. **Access control as configuration** (pairing codes, allowlists, mention patterns)
5. **Deduplication by platform** prevents state corruption

### 8. Recommendations for Our System

**High Priority (Future Multi-Channel):**
- ✅ Adopt normalized `MsgContext` envelope if we expand to WhatsApp/Discord
- ✅ Implement composite session keys for forum topic support
- ✅ Add deduplication via `lastUpdateId` tracking
- ✅ Study OpenClaw's access control patterns for user onboarding

**Medium Priority (Current Telegram-Only):**
- 🟡 Streaming with message editing for better UX
- 🟡 Mention/allowlist patterns for group policies
- 🟡 Reaction event handling

**Low Priority (Out of Scope):**
- ❌ Full multi-channel hub-and-spoke (Telegram-focused is fine)
- ❌ Pairing codes (we have static ALLOWED_USERS list)

### 9. Key Insight

OpenClaw's Telegram integration is **part of a larger multi-channel philosophy**. The design choices (normalized messages, composite keys, deterministic routing) are optimized for scaling across platforms. Our system, by contrast, is **Telegram-first by design**, which is a valid trade-off:

| Aspect | OpenClaw | Our System |
|--------|----------|-----------|
| **Primary Goal** | Multi-platform messaging | Telegram-exclusive control |
| **Message Model** | Normalized envelope | Direct handlers |
| **Session Keys** | Composite (hierarchical) | Flat (user ID) |
| **Routing** | Deterministic, multi-channel | Direct Telegram |
| **Access Control** | Pairing codes, allowlists, mentions | Static ALLOWED_USERS |
| **Scaling Strategy** | Add new channel adapters | Not applicable |
| **Deduplication** | Platform-specific handlers | None (Telegram handles it) |
| **Streaming** | Live editing with fallback | Typing indicators + responses |

**For our current needs**, our Telegram-focused implementation is simpler and sufficient. However, if we ever:
1. **Add WhatsApp/Discord support** → adopt normalized `MsgContext` and composite keys
2. **Support forum topics** → implement topic ID appending to session keys
3. **Scale user base** → implement message deduplication + pairing codes

...then OpenClaw's patterns become invaluable.

---

## Summary: Key Takeaways

**steipete is to "agent tooling" what Django is to web frameworks** — a pragmatic, opinionated collection of utilities that solve real problems agents face. His work is characterized by:

- ✅ **Pragmatism** — Tools that work, not theoretical exercises
- ✅ **Portability** — Designed to be copied into other projects (agent-scripts, committer)
- ✅ **Multi-platform** — Swift + TypeScript + Go polyglot approach
- ✅ **User-Centric** — Focuses on the experience (clausode-mcp as MCP embedding is brilliant)
- ✅ **Agent-Native** — Every tool considers AI agents as first-class users

### OpenClaw's Telegram Integration: Patterns for Future Growth

OpenClaw's multi-channel philosophy offers valuable patterns for potential future expansion:

**Current System vs. OpenClaw:**
- **We**: Telegram-focused, direct handler routing, flat user-scoped sessions
- **OpenClaw**: Multi-channel hub, normalized message envelopes, composite hierarchical keys
- **Trade-off**: We've optimized for simplicity (Telegram-only), OpenClaw for scale (any messaging platform)

**Adoptable Patterns (if we expand):**
1. Normalized `MsgContext` envelope for multi-channel support
2. Composite session keys (`chatId:topicId:threadId`) for forum/thread isolation
3. Message deduplication via `lastUpdateId` tracking
4. Access control patterns (pairing codes, allowlists, mention regex)
5. Streaming with message editing for better UX

**Current Strengths We Shouldn't Abandon:**
- Cron jobs with silent/loud modes (OpenClaw doesn't have this)
- SubTurtle integration and spawning via Telegram
- Driver fallback (Claude ↔ Codex) for quota resilience
- Interrupt prioritization (`!` prefix, "stop" bypass)

### Immediate Action Items

Our agentic system is already on a good track. The key adoptions are:
1. **Peekaboo** for visual testing (fills critical visual automation gap)
2. **agent-scripts** components for operational discipline
3. **MCP-based tools** (conduit-mcp, macos-automator-mcp) to expand agent capabilities
4. **Study mcporter** to potentially simplify our tool integration layer
5. **OpenClaw patterns** to reference if/when we pursue multi-channel expansion

**Immediate Gap**: We lack visual testing automation for frontend work. **Peekaboo closes that gap immediately.**

### Not Worth Adopting (Now)

- ❌ Full multi-channel hub-and-spoke (Telegram-focused is sufficient)
- ❌ Pairing codes (static ALLOWED_USERS list fits our use case)
- ❌ Forum/topic isolation (not a priority for current Telegram-only bot)
- ❌ Message deduplication (Telegram's getUpdates handles this)

---

---

**Document Version**: 2.0 (Updated with Telegram Integration Analysis)
**Research Completed**: 2026-02-27
**Researcher**: steipete-research SubTurtle
**Catalog Completeness**: 92 repositories audited (82 original, 10 forks)
**Deep Dives Completed**:
- ✅ OpenClaw Architecture (subagent orchestration, workspace isolation, session model)
- ✅ mcporter MCP Runtime & CLI
- ✅ Poltergeist (dev server file watching)
- ✅ OpenClaw Skills/ClawHub System
- ✅ VibeTunnel vs. Cloudflared
- ✅ OpenClaw Telegram Integration

---

## Sources Reviewed

- [OpenClaw Documentation - Channels/Telegram](https://docs.openclaw.ai/channels/telegram)
- [OpenClaw GitHub Repository](https://github.com/steipete/openclaw)
- steipete GitHub Profile & Repository Catalog
- OpenClaw Architecture Docs (Gateway, agents, skills, workspace isolation)
- VibeTunnel Repository (Swift/Node.js multi-platform infrastructure)
- mcporter MCP Runtime Documentation
- agent-scripts Repository (committer, docs-list, browser-tools)
