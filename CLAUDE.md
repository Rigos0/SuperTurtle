# UX Fundamentals

## What Super Turtle is

An autonomous coding system you talk to on Telegram. You describe what you want built — the system decomposes it, spawns workers, supervises them, and delivers results. You interact with a single conversational agent (the Meta Turtle) who handles everything behind the scenes.

## Core experience principle

**Say what → get results.** The user never thinks about processes, infrastructure, or agent orchestration. They say "build me X" and the system figures out how. The chat shows milestones, not machinery.

## What the user sees

| Event | User sees | User doesn't see |
|-------|-----------|-------------------|
| Work starts | "🚀 On it." | SubTurtle spawning, CLAUDE.md creation, cron registration |
| Work in progress | Nothing (silence = good) | Cron check-ins, status polling, git log inspection |
| Milestone reached | "🎉 Feature X is done. Starting Y next." | SubTurtle stop/restart, state file updates |
| Something broke | "⚠️ Hit a snag with X. Here's what happened: ..." | Log tailing, error diagnosis, restart attempts |
| Everything done | "✅ All done. Here's what shipped: ..." | Cron cleanup, watchdog termination |
| Preview available | "🔗 Preview: https://..." | Tunnel setup, port management |

## What the user never has to do

- Break down tasks into subtasks (the system decomposes)
- Choose which loop type to use (the system defaults to cheapest: yolo-codex)
- Monitor progress (the system checks silently and only reports news)
- Restart stuck workers (the system detects and recovers)
- Manage quotas (the system checks usage and routes work to the cheapest resource)

## Interaction model

1. **User sends a message** → Meta agent responds conversationally. If it's a coding task, spawns SubTurtles and confirms briefly.
2. **Silence** → Work is happening. No news is good news.
3. **Notification arrives** → Something meaningful happened. Read it — it's worth your attention.
4. **User asks "how's it going?"** → Meta agent checks and gives a plain-English summary.
5. **User says "stop"** → Work stops. No questions asked.

## Emotional design

- **Feels like a competent teammate**, not a CI pipeline
- **Respects attention** — never sends a message that wastes the user's time
- **Confident but honest** — says "I'm on it" when starting, "I'm stuck" when blocked
- **Celebrates wins** — completion messages feel like progress, not bureaucracy
- **Invisible when working** — the best UX is no UX during execution

## Resource management

- **Default to yolo-codex** — Codex is cheap and plentiful. Use it for everything unless the task needs Claude's reasoning.
- **Claude Code is precious** — every meta agent interaction, every cron check-in costs Claude Code quota. Minimize waste.
- **Auto-adjust** — when Claude Code is >80%, space out check-ins, shorten responses, force Codex for SubTurtles.
- **The user shouldn't think about quotas** — the system manages resources silently.

---

# Current task

UX Overhaul complete (Phases 1-6). All phases shipped. System is now fully autonomous: specs-driven decomposition, parallel SubTurtles, silent supervision, usage-aware resource management.

Ready for new project work or integration testing.

# End goal with specs

Agentic repository — autonomous agent coordination system (SubTurtles). Core infrastructure is complete. Now improving the UX to make the system more autonomous and less noisy.

**Core infrastructure (done):**
- SubTurtle control (`ctl` command) — spawn, stop, monitor with timeouts
- State management — CLAUDE.md per agent, symlinked AGENTS.md
- Cron supervision — scheduled check-ins to monitor progress
- Loop types — slow (Plan→Groom→Execute→Review), yolo (single Claude call), yolo-codex (cost-optimized)
- Skills system — agents can load Claude Code skills on demand
- Tunnel support — cloudflared integration for frontend preview links
- SubTurtle self-stop — agents write `## Loop Control\nSTOP` to exit cleanly
- Silent check-ins — cron supervision runs silently, only messages user on news

**UX overhaul goal:** The user says "build X" and the system handles everything — decomposition, parallel SubTurtles, supervision, progression — with minimal noise. Chat shows progress milestones, not process spam.

# Roadmap (Completed)

- ✓ Core SubTurtle loop (slow/yolo/yolo-codex types, watchdog, timeout)
- ✓ Control script (`ctl` start/stop/status/logs/list + spawn)
- ✓ Cron job scheduling (one-shot + recurring, auto-fire)
- ✓ Skills loader system (agents can --skill <name>)
- ✓ Tunnel support (start-tunnel.sh helper, .tunnel-url tracking)
- ✓ Snake game (complete with 10 levels, obstacles, visual escalation, neon UI)
- ✓ Meta agent (decision-making, delegation, supervision)
- ✓ SubTurtle self-stop (`## Loop Control\nSTOP` directive, _should_stop() check)
- ✓ UX overhaul proposal (docs/UX-overhaul-proposal.md)
- ✓ UX Phase 1: Silent check-ins (silent cron, marker-gated notifications, META_SHARED.md updated)
- ✓ Code quality audit (docs/code-quality-audit.md — 1 critical fixed, 4 medium fixed, 6 documented)
- ✓ UX Phase 2: Structured message templates (notification formats for all event types)
- ✓ UX Phase 3: Task decomposition (DECOMPOSITION_PROMPT.md + META_SHARED.md protocol)
- ✓ UX Phase 4: Pipeline speed (`ctl reschedule-cron` command for dynamic intervals)
- ✓ UX Phase 5: Enhanced `/status` command (SubTurtle info, git log, usage in one view)
- ✓ UX Phase 6: Usage-aware resource management (quota decision matrix in META_SHARED.md)
- ✓ Default loop type changed to yolo-codex

# Roadmap (Upcoming)

- Integration testing — verify all UX phases work together end-to-end
- Update UX-overhaul-proposal.md with completion status

# Backlog

- [x] Plan silent check-in architecture
- [x] Implement silent check-in mechanism in bot + cron system
- [x] Update META_SHARED.md supervision section for silent behavior
- [x] Update `ctl spawn` cron prompt generation
- [x] Test silent check-ins
- [x] Code quality audit
- [x] UX Phase 2: Structured message templates
- [x] UX Phase 3: Task decomposition protocol
- [x] UX Phase 4: ctl reschedule-cron command
- [x] UX Phase 5: Enhanced /status command
- [x] UX Phase 6: Usage-aware resource management
- [x] Change ctl default to yolo-codex
- [ ] Integration testing — verify all phases work together <- current
- [ ] Update UX-overhaul-proposal.md with completion status
