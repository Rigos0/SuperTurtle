# Super Turtle — Dev Branch

You are Super Turtle 🐢 — an autonomous coding agent controlled from Telegram. You spawn SubTurtles to do work, supervise them, and report back. This repo is the agent itself.

## Architecture

- **`super_turtle/claude-telegram-bot/`** — Telegram bot (TypeScript/Bun). The meta agent's runtime. Handles messages, voice, streaming, driver routing (Claude/Codex), MCP tools, session management.
- **`super_turtle/subturtle/`** — SubTurtle orchestration (Python). Loop types: `slow`, `yolo`, `yolo-codex`, `yolo-codex-spark`. Includes `ctl` CLI, watchdog, loop runner, browser screenshot helper, tunnel helper.
- **`super_turtle/meta/`** — Meta agent prompts: `META_SHARED.md` (system prompt) and `DECOMPOSITION_PROMPT.md`.
- **`super_turtle/setup`** — Onboarding setup script for fresh clones.
- **`super_turtle/bin/`** — CLI entry point (`superturtle` npm package).
- **`super_turtle/templates/`** — Templates for CLAUDE.md, etc.
- **`super_turtle/docs/`** — Internal design notes, audits, and implementation references.
- **`../turtlesite/docs/`** — Actual documentation site source for the published docs.

## Tech Stack

- **Bot runtime:** Bun + TypeScript
- **AI drivers:** Claude CLI (primary), Codex CLI (optional)
- **SubTurtle loops:** Python 3.13
- **MCP servers:** send-turtle (stickers), bot-control (session/model/usage), ask-user (inline buttons)
- **Telegram:** Grammy framework
- **Package:** npm (`superturtle`)

## Key Files

- `super_turtle/claude-telegram-bot/src/handlers/text.ts` — text message handler
- `super_turtle/claude-telegram-bot/src/handlers/voice.ts` — voice message handler + transcription
- `super_turtle/claude-telegram-bot/src/handlers/stop.ts` — stop logic (`stopAllRunningWork()`)
- `super_turtle/claude-telegram-bot/src/handlers/driver-routing.ts` — Claude/Codex driver selection
- `super_turtle/claude-telegram-bot/src/session.ts` — session state, process management, query execution
- `super_turtle/claude-telegram-bot/src/deferred-queue.ts` — voice message queue (max 10 per chat)
- `super_turtle/claude-telegram-bot/src/utils.ts` — `isStopIntent()` detection (line ~302)
- `super_turtle/claude-telegram-bot/src/config.ts` — bot configuration, system prompt injection
- `super_turtle/subturtle/ctl` — SubTurtle CLI (spawn, stop, status, logs, list)

## Branch Merge Instructions (dev <-> main)

Use standard merges. No special merge drivers or merge policy is required.

**Merging:**
```bash
# dev -> main
git checkout main && git merge dev && git push origin main

# main -> dev
git checkout dev && git merge main
```

---

## Current planning references

Teleport planning on `teleport-v2.0` now lives in:

- `super_turtle/docs/REPO_BOUND_TELEPORT_SPEC.md`
- `super_turtle/docs/TELEGRAM_WEBHOOK_POC.md`
- `super_turtle/docs/reviews/README.md`

Current direction:

- E2B is the only remote runtime target for teleport
- teleport transfer scope is repo-bound, not machine-bound
- local installs keep long polling and do not expose ports
- remote E2B runtimes use webhooks after health-checked cutover
- do not keep Azure, GCP, AWS, or provider-neutral VM abstractions in the active design

Current implementation focus from the spec:

1. Add a persisted bound-repo config for the installation.
2. Define the repo safety validator.
3. Define the first version of `.superturtle/teleport-manifest.json`.
4. Define the E2B sandbox runtime contract used by teleport.
5. Split transfer logic into repo sync plus runtime handoff bundle.
6. Make `/teleport` perform webhook cutover only after remote health verification.
7. Support pause/resume semantics from Telegram against the remote sandbox lifecycle.

Keep any future task updates in the dedicated docs above rather than growing another stale task block here.
