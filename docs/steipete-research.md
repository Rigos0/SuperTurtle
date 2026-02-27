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
