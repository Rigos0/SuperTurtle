# agentic

An autonomous coding system built on Claude Code. A lean meta agent orchestrates specialized SubTurtles that do the actual work — planning, coding, reviewing, and shipping, one commit at a time.

## Philosophy

**The meta agent is a conductor, not a performer.** It stays lean — no domain knowledge, no coding skills, no bloated context. Its only job is orchestration: understanding what needs to be done, breaking it into scoped tasks, spawning the right workers, supervising progress, and keeping the human in the loop.

**SubTurtles are specialized workers.** Each one gets exactly the context it needs for its task: a scoped CLAUDE.md with a clear backlog, and optionally skills (frontend, video, data, etc.) that give it domain expertise. They don't know about each other. They don't manage their own lifecycle. They just loop: read state → implement → commit → repeat.

**Skills make SubTurtles smart without making the system heavy.** Instead of baking expertise into the meta agent or the loop infrastructure, skills are loaded on demand. The meta agent decides "this is frontend work" and wires up the frontend skill before spawning. The SubTurtle gets deep domain knowledge without the meta agent ever carrying that weight.

**The human sets direction, not process.** You say what you want built. The meta agent figures out how to break it down, which workers to spawn, what skills they need, and when the work is done. You get progress updates, preview links, and questions when decisions are needed — not implementation details.

### Core design principles

- **Separation of concerns** — orchestration lives in the meta agent, execution lives in SubTurtles, expertise lives in skills
- **Lean context** — each layer carries only what it needs; nothing more
- **Autonomous supervision** — the meta agent checks on workers via scheduled cron jobs, catches completions, handles failures, and progresses to the next task automatically
- **Composable specialization** — skills can be mixed and matched per SubTurtle; a single worker can have frontend + testing skills, or video + design skills
- **Observable by default** — every SubTurtle writes commits, logs, and state files; the meta agent can always answer "what's happening?"

### Work allocation: Meta agent delegates, doesn't code

The meta agent is a **communicator and coordinator**, not a coder. The boundary is simple:

- **> 5 minutes of coding work** → Spawn a SubTurtle. Write its CLAUDE.md, schedule cron supervision, report back when done.
- **≤ 5 minutes or non-coding** → Meta agent handles it directly:
  - Quick fixes (typos, single-line edits, config tweaks)
  - Reporting status to the human
  - Reviewing and explaining code
  - Restarting or course-correcting stuck workers
  - Answering questions about architecture or decisions

This keeps the meta agent **focused on the human interface** (staying responsive, making decisions, reporting progress) while **SubTurtles handle the conveyor belt** (planning, coding, testing, committing). When you ask for something non-trivial, the meta agent spawns a worker and gets back to you in seconds with "I'm on it — I'll check back in 5 minutes." No waiting for a slow agent to code.

## Architecture

```
┌─────────────────────────────────────────┐
│              Human (Telegram / CLI)      │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│           Meta Agent (Super Turtle)      │
│                                          │
│  • Understands the roadmap               │
│  • Writes scoped CLAUDE.md per task      │
│  • Spawns SubTurtles with skills         │
│  • Supervises via cron check-ins         │
│  • Reports progress, sends preview links │
│  • Stops/restarts/progresses workers     │
└──────┬───────────┬───────────┬──────────┘
       │           │           │
┌──────▼──┐  ┌─────▼───┐  ┌───▼────────┐
│SubTurtle│  │SubTurtle│  │ SubTurtle  │
│ (yolo)  │  │ (slow)  │  │(yolo-codex)│
│         │  │         │  │            │
│ skills: │  │ skills: │  │ skills:    │
│ frontend│  │ video   │  │ (none)     │
└─────────┘  └─────────┘  └────────────┘
```

### Two layers, clear boundaries

1. **Meta Agent** — the human's interface. Runs via Telegram bot or CLI. Maintains the root CLAUDE.md (project-level state). Delegates all coding to SubTurtles. Defined by `super_turtle/meta/META_SHARED.md`.

2. **SubTurtles** — autonomous background workers. Each gets its own workspace at `.subturtles/<name>/` with a scoped CLAUDE.md, optional skills, and one of three loop types:
   - **slow** — Plan → Groom → Execute → Review. 4 agent calls per iteration. Most thorough.
   - **yolo** — Single Claude call per iteration. Fast. Best for well-scoped tasks.
   - **yolo-codex** — Single Codex call per iteration. Cheapest.

### Skills (on-demand expertise)

Skills are Claude Code skill folders (`SKILL.md` + supporting files) that get loaded into SubTurtle sessions. The meta agent decides which skills a task needs and wires them up before spawning.

Examples:
- **Frontend** — React/Next.js patterns, component architecture, CSS best practices
- **Remotion** — video generation with Remotion, composition patterns, rendering
- **Testing** — test strategy, coverage patterns, mocking approaches

Skills live in `super_turtle/skills/` or get installed from the Anthropic skills registry. They're loaded via Claude Code's native skill system — no custom infrastructure needed.

### Tunnel previews (live frontend links)

When a SubTurtle works on a frontend, it can spin up a dev server + Cloudflare tunnel and write the public URL to its workspace. The meta agent picks it up on the next cron check-in and sends the link to the human on Telegram — tap it on your phone and see the work in progress.

## Quick start

### Meta agent (from PC)

```bash
./super_turtle/meta/claude-meta
```

### Meta agent (from Telegram)

Message the bot. It runs Claude with access to the repo — ask it anything.

### SubTurtles (autonomous workers)

Each SubTurtle gets its own workspace at `.subturtles/<name>/` with its own CLAUDE.md state file. Multiple can run concurrently on different tasks.

```bash
./super_turtle/subturtle/ctl start [name] [--type TYPE] [--timeout DURATION]
./super_turtle/subturtle/ctl stop  [name]       # stop it
./super_turtle/subturtle/ctl status [name]       # check if running
./super_turtle/subturtle/ctl logs  [name]        # tail output
./super_turtle/subturtle/ctl list                # list all SubTurtles
```
