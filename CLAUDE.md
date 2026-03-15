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
- `super_turtle/docs/E2B_WEBHOOK_WAKE_POC.md`
- `super_turtle/docs/E2B_REMOTE_RUNTIME_SETUP.md`
- `super_turtle/docs/reviews/README.md`

Current direction:

- E2B is the only remote runtime target for teleport
- teleport transfer scope is repo-bound, not machine-bound
- BYO E2B is the default product path for this cycle
- local installs keep long polling and do not expose ports
- remote E2B runtimes use webhooks after health-checked cutover
- do not keep Azure, GCP, AWS, or provider-neutral VM abstractions in the active design
- do not treat hosted managed login/provisioning as required for the main user path yet

Current implementation status:

- local SuperTurtle starts in polling mode on the PC
- `/teleport` launches or reuses one E2B sandbox, waits for remote readiness, and flips Telegram to webhook delivery
- local polling hands off to standby on webhook cutover and resumes after `/home`
- remote E2B runtime currently supports text chat plus control commands
- remote agent mode is Codex-first and uses sandbox-local auth/bootstrap
- Telegram webhook traffic can wake a paused E2B sandbox and the bot can continue on the same sandbox

Current implementation focus:

1. Keep the local polling <-> remote webhook ownership handoff reliable across repeated `/teleport` and `/home` cycles.
2. Preserve the E2B auth/bootstrap path for Codex and Claude-related runtime setup.
3. Keep repeat `/teleport` fast by reusing a healthy sandbox instead of re-bootstrapping it.
4. Keep the user project as the source of truth and sync the required runtime folders when remote freshness is needed.
5. Expand the remote runtime from text-first POC toward broader SuperTurtle feature parity.
6. Decide how much session continuity we want between local and remote runtimes versus treating remote as a fresh turtle.
7. Keep teleport docs and operator runbooks in the dedicated files above instead of re-growing a stale task list here.

Hosted managed-mode backlog:

1. Keep hosted login/provisioning optional; do not block the main npm-user BYO-E2B flow on it.
2. Build and maintain the managed E2B template from `super_turtle/e2b-template/`; the current published template name is `superturtle-managed-runtime`.
3. If we revive managed mode, provision one managed E2B sandbox per user through the hosted control plane.
4. Copy Claude and Codex credentials automatically from the local machine on first teleport and refresh them on later teleports without manual remote steps.
5. Add remote runtime version checks so `/teleport` can self-update the remote sandbox to the local installed SuperTurtle package version before cutover.
6. Add local npm-package update prompting so users are told when a newer SuperTurtle release exists without silently mutating their machine.
7. Extend hosted status/session reporting so the CLI can show provisioning state, sandbox state, template version, and remote runtime version.

Keep any future task updates in the dedicated docs above rather than growing another stale task block here.
