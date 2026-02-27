# Current Task

All backlog items are complete.

# End Goal with Specs

The README.md should:
1. Call the project **Super Turtle** (not "agentic")
2. Accurately describe the philosophy: a player-coach model where the Meta Agent both codes directly AND delegates to SubTurtles
3. Accurately describe the architecture: two layers (Meta Agent + SubTurtles), four loop types (slow, yolo, yolo-codex, yolo-codex-spark), skills system, cron supervision, tunnel previews
4. Be concise and well-structured — not a wall of text
5. Keep the ASCII architecture diagram but update it
6. Keep the Quick Start and Bot Monitoring sections but update any outdated info

# Philosophy (USE THIS — this is the canonical source of truth)

Super Turtle is an autonomous coding system you talk to on Telegram. You describe what you want built — the system decomposes it, spawns workers, supervises them, and delivers results.

**Core experience:** "Say what → get results." The user never thinks about processes, infrastructure, or agent orchestration.

**Two layers:**
1. **Meta Agent (Super Turtle)** — the human's conversational interface via Telegram. It's a player-coach: handles quick tasks directly, delegates bigger work to SubTurtles. It maintains the project roadmap, supervises workers via cron check-ins, and reports progress.
2. **SubTurtles** — autonomous background workers. Each gets an isolated workspace with a scoped CLAUDE.md state file. They loop: read state → implement → commit → repeat. They don't know about each other. Four loop types:
   - **slow** — Plan → Groom → Execute → Review. 4 agent calls per iteration. Most thorough.
   - **yolo** — Single Claude call per iteration. Fast.
   - **yolo-codex** — Single Codex call. Cheapest. Default for most work.
   - **yolo-codex-spark** — Codex Spark for fastest iterations.

**Key design principles:**
- Separation of concerns: orchestration (Meta Agent) / execution (SubTurtles) / expertise (Skills)
- Lean context: each layer carries only what it needs
- Autonomous supervision: cron check-ins detect completions, failures, stuck states
- Silent by default: the user only gets notified when there's actual news (milestone, completion, error, stuck)
- Usage-aware: the system checks quotas and routes work to the cheapest resource automatically
- Skills: on-demand expertise loaded into SubTurtle sessions (frontend, video, testing, etc.)
- Observable: every SubTurtle writes commits, logs, state files

**Work allocation (player-coach model):**
- Meta Agent handles quick stuff directly: typos, config changes, single-file features, status reports, answering questions
- Meta Agent delegates to SubTurtles for: multi-file work, iterative coding, anything that benefits from autonomous looping
- This is NOT a "meta agent never codes" system — it's a "use the right tool" system

**What the user sees:**
- "🚀 On it." when work starts
- Silence while work is happening (no news = good news)
- "🎉 Feature X is done." on milestones
- "⚠️ Hit a snag." when stuck
- "✅ All done." when everything ships
- Preview links for frontend work

**What the user never has to do:**
- Break down tasks (the system decomposes)
- Choose loop types (the system defaults to cheapest)
- Monitor progress (silent cron supervision)
- Restart stuck workers (auto-detection and recovery)
- Manage quotas (auto-routing to cheapest resource)

# Key files to reference

- Current README: `README.md` (at repo root)
- Meta agent prompt (source of truth for behavior): `super_turtle/meta/META_SHARED.md`
- UX fundamentals (source of truth for user experience): the top section of `CLAUDE.md`

# Backlog

- [x] Read current README.md fully
- [x] Read META_SHARED.md for accurate architecture details
- [x] Read CLAUDE.md top section for UX fundamentals
- [x] Rewrite README.md with Super Turtle branding, accurate philosophy, updated architecture diagram
- [x] Verify all section references are consistent (no "agentic" mentions, correct loop type count, player-coach model)
- [x] Commit the rewritten README.md

## Loop Control
STOP
