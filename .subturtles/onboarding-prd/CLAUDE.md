## Current Task

Gather feedback on PRD from stakeholders. PRD document available at `docs/PRD-onboarding.md`

## End Goal with Specs

A Product Requirements Document that defines how new users onboard onto Super Turtle. The PRD should be thorough enough that a developer (or a SubTurtle) could implement the full onboarding flow from it.

**Core concept:**
The main entry point is GitHub. User clones the repo, opens it in Claude Code (runs `claude` in root), and Claude Code walks them through everything — setting up the Telegram bot, OpenAI API key for voice transcription, etc. The onboarding is conversational, driven by Claude Code itself.

**Two key user scenarios to design for:**

1. **New repo (greenfield)** — User wants to start a fresh project with Super Turtle from scratch. They clone the agentic repo and set up everything.

2. **Existing repo (brownfield)** — User has an existing codebase and wants to add Super Turtle to it. They need to install/copy the Super Turtle infrastructure into their project.

**The PRD must cover:**

### User Journey
- Discovery (GitHub README / landing page → clone)
- First run experience (what happens when they `claude` in the root for the first time)
- Guided setup wizard flow (Telegram bot token, OpenAI key, any other config)
- Verification steps (does the bot work? can it spawn SubTurtles?)
- First task experience (guide them to spawn their first SubTurtle)

### Setup Requirements
- What secrets/keys are needed (Telegram bot token via BotFather, OpenAI API key for voice)
- Where they get stored (.env file? what format?)
- What dependencies need to be installed (Python venv for SubTurtle loops, bun/node for Telegram bot)
- What system requirements exist (macOS? Linux? cloudflared for tunnels?)

### New Repo vs Existing Repo
- New repo: full clone, everything works out of the box
- Existing repo: what gets copied/installed? How does Super Turtle coexist with existing CLAUDE.md, existing .claude/ config, existing git hooks?
- Conflict resolution: what if they already have an AGENTS.md or CLAUDE.md?

### Claude Code as the Onboarding Guide
- The root CLAUDE.md should detect first-time setup and guide the user
- What questions does Claude ask? In what order?
- What does Claude verify at each step?
- How does Claude handle errors (wrong token, missing dependency, etc.)?
- The experience should feel like talking to a knowledgeable teammate, not reading docs

### Configuration Architecture
- Where does config live? (.env, .claude/, super_turtle/config/)
- What's the minimal config to get started?
- What's optional / can be set up later?
- How do we avoid committing secrets to git?

### Success Criteria
- User goes from `git clone` to working Telegram bot + first SubTurtle spawn in < 15 minutes
- Works on macOS and Linux
- Handles both new and existing repo scenarios gracefully
- No manual file editing required — Claude Code handles everything conversationally

**Research to do first:**
- Read the existing codebase to understand current setup requirements
- Check `super_turtle/claude-telegram-bot/` for what env vars are needed
- Check `super_turtle/subturtle/` for Python dependencies
- Check existing CLAUDE.md and .env patterns
- Look at how the bot currently starts (`package.json` scripts)
- Understand the skills system and how it loads

## Backlog

- [x] Read existing codebase: telegram bot setup, env vars, dependencies, start scripts
- [x] Read SubTurtle infrastructure: Python venv, ctl script, loop types, what's needed to run
- [x] Read current CLAUDE.md, AGENTS.md, .env patterns to understand config architecture
- [x] Draft PRD section: User Journey (discovery → first SubTurtle spawn)
- [x] Draft PRD section: Setup Requirements (keys, deps, system reqs)
- [x] Draft PRD section: New Repo vs Existing Repo scenarios
- [x] Draft PRD section: Claude Code as Onboarding Guide (conversation flow, error handling)
- [x] Draft PRD section: Configuration Architecture
- [x] Draft PRD section: Success Criteria and Open Questions
- [x] Write complete PRD to docs/PRD-onboarding.md
- [ ] Review PRD with stakeholders and gather feedback <- current
- [ ] Implement onboarding wizard in root CLAUDE.md
- [ ] Implement .env creation and validation
- [ ] Add Telegram bot connectivity check
- [ ] Add SubTurtle spawn integration
- [ ] Test greenfield scenario (fresh clone)
- [ ] Test brownfield scenario (existing repo)
- [ ] Write setup integration guide for developers
- [ ] Commit final implementation

## Notes

- Output file: `docs/PRD-onboarding.md`
- This is a RESEARCH + WRITING task, not a coding task
- Read actual source files to ground the PRD in reality — don't make up requirements
- Key dirs to explore: `super_turtle/claude-telegram-bot/`, `super_turtle/subturtle/`, `super_turtle/meta/`, `super_turtle/skills/`
- Check `.env` or `.env.example` for current env var patterns
- The PRD should be opinionated — make design decisions, don't just list options
