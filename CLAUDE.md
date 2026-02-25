# Current task

Restore project state and verify SubTurtle infrastructure is operational.

# End goal with specs

Agentic repository — autonomous agent coordination system (SubTurtles). Core infrastructure is complete:
- **SubTurtle control** (`ctl` command) — spawn, stop, monitor with timeouts
- **State management** — CLAUDE.md per agent, symlinked AGENTS.md
- **Cron supervision** — scheduled check-ins to monitor progress
- **Loop types** — slow (Plan→Groom→Execute→Review), yolo (single Claude call), yolo-codex (cost-optimized)
- **Skills system** — agents can load Claude Code skills on demand
- **Tunnel support** — cloudflared integration for frontend preview links
- **Snake game** — reference implementation (production-ready, playable, installed at root)

Next phase: polish, document, and prepare for new project work.

# Roadmap (Completed)

- ✓ Core SubTurtle loop (slow/yolo/yolo-codex types, watchdog, timeout)
- ✓ Control script (`ctl` start/stop/status/logs/list)
- ✓ Cron job scheduling (one-shot + recurring, auto-fire)
- ✓ Skills loader system (agents can --skill <name>)
- ✓ Tunnel support (start-tunnel.sh helper, .tunnel-url tracking)
- ✓ Snake game (complete with 10 levels, obstacles, visual escalation, neon UI)
- ✓ Meta agent (decision-making, delegation, supervision)

# Roadmap (Upcoming)

- Polish & document meta agent behavior
- Prepare for next project or feature work

# Backlog

- [ ] Restore root state file (CLAUDE.md) — document what's done, what's next
- [ ] Verify SubTurtle `ctl` commands are working
- [ ] Check git log for recent commits and verify state consistency
- [ ] Ready for new work (waiting for user direction)
