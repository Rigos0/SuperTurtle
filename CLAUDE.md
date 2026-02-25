# Current task

When user opens this repo for the first time: detect if `.env` is missing or `TELEGRAM_BOT_TOKEN` is not set. If so, run the onboarding wizard to guide them through setup.

## Onboarding Wizard (Step-by-Step Implementation Guide)

**When to trigger:** On first Claude Code open, if `.env` doesn't exist or `TELEGRAM_BOT_TOKEN` not set.

**What to do:**

1. **Welcome** — Show friendly intro explaining Super Turtle and setup (~5 min)

2. **Ask setup preference:**
   - Personal bot (just me)
   - Team bot (multiple users)
   - Skip for now

3. **Collect Telegram bot token:**
   - Guide user to @BotFather → /newbot
   - Validate format: `^\d+:[A-Za-z0-9_-]+$`
   - Retry up to 3 times, then allow skip

4. **Collect user ID:**
   - Guide user to @userinfobot
   - Validate: must be digits only
   - Retry up to 3 times

5. **Ask for OpenAI key (optional):**
   - For voice transcription
   - Link to https://platform.openai.com/api/keys
   - Can skip and add later

6. **Show summary & confirm:**
   - Display masked token and collected settings
   - Get user confirmation before proceeding

7. **Create .env file:**
   - Write to: `super_turtle/claude-telegram-bot/.env`
   - Format: `KEY=value` pairs (see .env.example)
   - Ensure it's in .gitignore

8. **Install dependencies:**
   - Run: `cd super_turtle/claude-telegram-bot && bun install`
   - Show progress
   - Handle bun not found error gracefully

9. **Start the bot:**
   - Run: `bun run src/index.ts`
   - Wait for "Bot started: @botname" in logs

10. **Verify bot works:**
    - Ask user to test with /start command
    - Wait for confirmation (5 min timeout)
    - Show troubleshooting if no response

11. **Offer SubTurtle spawn:**
    - Ask if user wants to create first project
    - Get project description and name
    - Spawn with: `./super_turtle/subturtle/ctl spawn <name>`

12. **Success message:**
    - Celebrate! Show what's running
    - Explain next steps and commands

**Key implementation details:**
- Use Claude Code's AskUserQuestion for multi-choice prompts
- Validate all user input before using
- Handle errors gracefully with helpful recovery steps
- Never expose secrets in messages (mask tokens)
- Save state incrementally so user can resume if interrupted
- Make each step feel conversational, not robotic

**Files to create/modify:**
- `super_turtle/claude-telegram-bot/.env` (created during setup)
- Ensure `.gitignore` has `super_turtle/claude-telegram-bot/.env`

**See docs/PRD-onboarding.md for full requirements and spec.**

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

- [x] Restore root state file (CLAUDE.md) — document what's done, what's next
- [x] Verify SubTurtle `ctl` commands are working
- [x] Check git log for recent commits and verify state consistency
- [ ] Ready for next project work (awaiting user direction)

## Verification Summary

All core SubTurtle infrastructure is operational:
- **ctl list** — Shows 21 SubTurtles (17 stopped, 4 running)
- **ctl status** — Reports SubTurtle state accurately (spawn-impl running with 45m remaining)
- **ctl logs** — Retrieves full execution history from subturtle.log
- **ctl spawn** — Creates workspace, writes CLAUDE.md, creates AGENTS.md symlink, starts process, registers cron
- **ctl stop** — Stops process and cleans up cron jobs from cron-jobs.json
- **Cron system** — Auto-registration and cleanup functional
- **Git history** — 64 commits ahead; spawn feature complete and committed
- **Project state** — Clean working tree, all infrastructure verified
