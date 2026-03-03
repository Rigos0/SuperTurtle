# npm package review — `superturtle`

Scope: published npm package contents and first-run experience for `npm install -g superturtle` → `superturtle init` → `superturtle start`.

Reviewed version: `superturtle@0.1.0`.

## Executive summary

Overall the package looks close to usable, but there are two “first impression” problems that should be fixed before broad distribution:

1. **`README.md` and `LICENSE` are not actually published** (they are symlinks in `super_turtle/`, and npm’s pack output shows they are omitted). This makes the npm package page and offline install experience much worse.
2. **`state/run_state_writer.py` is referenced at runtime but not published**, so run ledger / handoff refresh features silently degrade.

There are also a few “rough edges” around global installs and multi-instance behavior (details below).

## Published tarball contents

Command run (from `super_turtle/`): `npm pack --dry-run --json`

Notes:
- `npm` warns that no `.npmignore` exists and it falls back to `.gitignore` for file exclusion.

### File list (72 files)

| Path | Size | Mode |
| --- | ---: | ---: |
| `bin/superturtle.js` | 10.5 KiB | 755 |
| `claude-telegram-bot/bot_control_mcp/server.ts` | 10.2 KiB | 644 |
| `claude-telegram-bot/LICENSE` | 1.0 KiB | 644 |
| `claude-telegram-bot/live.sh` | 2.1 KiB | 755 |
| `claude-telegram-bot/mcp-config.example.ts` | 1.4 KiB | 644 |
| `claude-telegram-bot/mcp-config.ts` | 759 B | 644 |
| `claude-telegram-bot/package.json` | 610 B | 644 |
| `claude-telegram-bot/run-loop.sh` | 1.1 KiB | 755 |
| `claude-telegram-bot/scripts/codex-yolo-wrapper.sh` | 823 B | 755 |
| `claude-telegram-bot/send_turtle_mcp/server.ts` | 6.5 KiB | 644 |
| `claude-telegram-bot/send_turtle_mcp/turtle-combos.json` | 35.1 KiB | 644 |
| `claude-telegram-bot/src/bot.ts` | 355 B | 600 |
| `claude-telegram-bot/src/codex-session.ts` | 43.1 KiB | 644 |
| `claude-telegram-bot/src/config.ts` | 14.1 KiB | 644 |
| `claude-telegram-bot/src/context-command.ts` | 3.6 KiB | 644 |
| `claude-telegram-bot/src/cron-scheduled-prompt.ts` | 462 B | 644 |
| `claude-telegram-bot/src/cron-supervision-queue.ts` | 1.5 KiB | 644 |
| `claude-telegram-bot/src/cron.ts` | 5.8 KiB | 644 |
| `claude-telegram-bot/src/dashboard.ts` | 11.3 KiB | 644 |
| `claude-telegram-bot/src/deferred-queue.ts` | 4.2 KiB | 644 |
| `claude-telegram-bot/src/drivers/claude-driver.ts` | 2.7 KiB | 644 |
| `claude-telegram-bot/src/drivers/codex-driver.ts` | 7.2 KiB | 644 |
| `claude-telegram-bot/src/drivers/registry.ts` | 480 B | 644 |
| `claude-telegram-bot/src/drivers/types.ts` | 1.1 KiB | 644 |
| `claude-telegram-bot/src/formatting.ts` | 9.5 KiB | 644 |
| `claude-telegram-bot/src/handlers/__fixtures__/real-world-claude.md` | 509 B | 644 |
| `claude-telegram-bot/src/handlers/audio.ts` | 5.5 KiB | 644 |
| `claude-telegram-bot/src/handlers/callback.ts` | 26.9 KiB | 644 |
| `claude-telegram-bot/src/handlers/commands.ts` | 55.3 KiB | 644 |
| `claude-telegram-bot/src/handlers/document.ts` | 16.1 KiB | 644 |
| `claude-telegram-bot/src/handlers/driver-routing.ts` | 5.2 KiB | 644 |
| `claude-telegram-bot/src/handlers/index.ts` | 674 B | 644 |
| `claude-telegram-bot/src/handlers/media-group.ts` | 6.3 KiB | 644 |
| `claude-telegram-bot/src/handlers/photo.ts` | 5.7 KiB | 644 |
| `claude-telegram-bot/src/handlers/stop.ts` | 3.2 KiB | 644 |
| `claude-telegram-bot/src/handlers/streaming.ts` | 30.8 KiB | 644 |
| `claude-telegram-bot/src/handlers/text.ts` | 10.1 KiB | 644 |
| `claude-telegram-bot/src/handlers/video.ts` | 5.0 KiB | 644 |
| `claude-telegram-bot/src/handlers/voice.ts` | 6.2 KiB | 644 |
| `claude-telegram-bot/src/index.ts` | 34.1 KiB | 644 |
| `claude-telegram-bot/src/logger.ts` | 2.3 KiB | 644 |
| `claude-telegram-bot/src/security.ts` | 4.1 KiB | 644 |
| `claude-telegram-bot/src/session.ts` | 31.9 KiB | 644 |
| `claude-telegram-bot/src/silent-notifications.ts` | 882 B | 644 |
| `claude-telegram-bot/src/token-prefix.ts` | 426 B | 644 |
| `claude-telegram-bot/src/turtle-greetings.ts` | 5.8 KiB | 644 |
| `claude-telegram-bot/src/types.ts` | 2.3 KiB | 644 |
| `claude-telegram-bot/src/update-dedupe.ts` | 4.1 KiB | 644 |
| `claude-telegram-bot/src/utils.ts` | 7.2 KiB | 644 |
| `claude-telegram-bot/systemd/superturtle-bot.service.template` | 1.9 KiB | 600 |
| `claude-telegram-bot/tsconfig.json` | 713 B | 644 |
| `meta/claude-meta` | 824 B | 755 |
| `meta/DECOMPOSITION_PROMPT.md` | 3.8 KiB | 644 |
| `meta/META_SHARED.md` | 28.9 KiB | 644 |
| `meta/ORCHESTRATOR_PROMPT.md` | 3.9 KiB | 644 |
| `package.json` | 1.9 KiB | 644 |
| `setup` | 7.5 KiB | 755 |
| `subturtle/__main__.py` | 22.4 KiB | 644 |
| `subturtle/browser-screenshot.sh` | 5.0 KiB | 755 |
| `subturtle/claude-md-guard/config.sh` | 475 B | 755 |
| `subturtle/claude-md-guard/create-rules-prompt.sh` | 1.2 KiB | 755 |
| `subturtle/claude-md-guard/README.md` | 1.4 KiB | 644 |
| `subturtle/claude-md-guard/stats.sh` | 3.0 KiB | 755 |
| `subturtle/claude-md-guard/validate.sh` | 3.0 KiB | 755 |
| `subturtle/ctl` | 35.2 KiB | 755 |
| `subturtle/pyproject.toml` | 497 B | 644 |
| `subturtle/README.md` | 1.9 KiB | 644 |
| `subturtle/start-tunnel.sh` | 6.1 KiB | 755 |
| `subturtle/subturtle_loop/__main__.py` | 2.2 KiB | 644 |
| `subturtle/subturtle_loop/agents.py` | 3.7 KiB | 644 |
| `templates/.env.example` | 5.3 KiB | 644 |
| `templates/CLAUDE.md.template` | 653 B | 644 |

### Tarball details

| Field | Value |
| --- | --- |
| name | `superturtle` |
| version | `0.1.0` |
| filename | `superturtle-0.1.0.tgz` |
| package size | 159,528 bytes |
| unpacked size | 601,558 bytes |
| total files | 72 |

### Per-file “is it needed?” notes

High-level: the tarball is mostly code + config templates; no obvious secrets are shipped. The notable concerns are **missing** files (below), and a few potentially surprising inclusions.

- ✅ `bin/superturtle.js`: required CLI entrypoint.
- ✅ `setup`: useful for repo-based onboarding; consider clearly documenting when to use this vs `superturtle init`.
- ✅ `claude-telegram-bot/mcp-config.ts`: safe defaults (local Bun servers, no secrets) and required for MCP tool wiring.
- ✅ `claude-telegram-bot/mcp-config.example.ts`: helpful template; contains commented examples with hardcoded sample paths (fine, since commented).
- ✅ `templates/.env.example`: good starter; no secrets.
- ✅ `templates/CLAUDE.md.template`: minimal scaffold (fine).
- ✅ `subturtle/*`: required for spawning/stopping worker loops.
- ✅ `meta/*`: required prompts for the meta-agent.
- ⚠️ Missing from tarball:
  - `README.md` and `LICENSE` at package root: `super_turtle/README.md` and `super_turtle/LICENSE` are symlinks in this repo, and npm does not include them in the tarball. This means npm consumers won’t see a proper README/license in the published package.
  - `state/run_state_writer.py`: referenced at runtime by `subturtle/ctl` and `claude-telegram-bot/src/index.ts`, but not published. The bot degrades gracefully (handoff refresh skips), but the run ledger/handoff features won’t work fully from the npm install.

## CLI audit (`superturtle init|start|stop|status`)

Source: `bin/superturtle.js` (Node wrapper, delegates to Bun for the bot runtime).

### `superturtle init`

What it does:
- Checks Bun and tmux; checks Claude Code but only warns if missing.
- Creates `.superturtle/` in the current directory and writes `.superturtle/.env` (token, allowlist, working dir, optional OpenAI key).
- Writes `.superturtle/.gitignore` to ignore all contents.
- If `CLAUDE.md` is missing, copies `templates/CLAUDE.md.template` into the project root.
- Appends `.superturtle/` and `.subturtles/` to the project’s `.gitignore` (only if the project already has a `.gitignore`).
- Runs `bun install` in `claude-telegram-bot/`.

Notes / edge cases:
- **Global install writable path:** `bun install` runs inside the installed npm package directory. This can fail on systems where global npm installs are not user-writable (common when installed with `sudo`).
- `.gitignore` update is skipped if the project has no `.gitignore`; in that case, a new user could accidentally commit `.superturtle/.env` unless they add ignores themselves.
- No validation that `TELEGRAM_ALLOWED_USERS` is numeric (it’s later parsed as numbers by the bot).
- Does not check Python, even though SubTurtles need Python 3.11+.

### `superturtle start`

What it does:
- Checks Bun and tmux.
- Requires `.superturtle/.env` in the current directory.
- Starts the bot in a tmux session named `superturtle` by default (override with `SUPERTURTLE_TMUX_SESSION`).
- If the session already exists, it attaches instead of launching a new instance.

Notes / edge cases:
- **tmux version compatibility:** uses `tmux new-session -e KEY=VAL ...` to pass env; older tmux versions may not support `-e`.
- The tmux session name is **not** namespaced by bot token prefix by default; multi-instance users should set `SUPERTURTLE_TMUX_SESSION` per instance.
- It does not run `claude-telegram-bot/run-loop.sh`, so it won’t auto-restart the bot on exit like `live.sh` does.
- It does not check for `claude` availability (the bot will still start, but “claude driver” operations will fail later).

### `superturtle stop`

What it does:
- Kills the tmux session (if present).
- Runs `subturtle/ctl stopall` to stop all SubTurtles.

Notes:
- If the tmux session name is shared between instances, `stop` can stop the “wrong” instance unless `SUPERTURTLE_TMUX_SESSION` is unique.

### `superturtle status`

What it does:
- Reports whether the tmux session exists.
- Calls `subturtle/ctl list` and prints active SubTurtles.

Notes:
- If `subturtle/ctl list` exits non-zero for “no subturtles” (depends on implementation), `status` will exit non-zero as well due to `exitFromSpawn`.

## Setup flow (fresh user)

Typical happy path (as intended):
1. `npm install -g superturtle`
2. In the target project directory: `superturtle init`
   - user is prompted for Telegram token + allowed user ID(s)
   - `.superturtle/.env` is created
   - bot dependencies are installed via `bun install`
3. `superturtle start`
   - starts `bun run src/index.ts` in tmux
4. User messages the bot in Telegram.

Things likely to confuse or break:
- If global package path is not writable, step (2) can fail at `bun install` (because it runs inside the installed package).
- If Python 3.11+ is missing, SubTurtle functionality will later fail even though `init/start` succeed.
- If `claude` CLI is missing, the bot can start but will not be able to execute Claude driver work.

## Dependencies & runtime checks

Documented/checked in code:
- Bun: checked by CLI for `init/start`; checked by `setup`.
- tmux: checked by CLI for `init/start` and by `live.sh` (used in dev/manual bot start).
- Claude Code CLI: `setup` requires it; CLI `init` only warns.
- Python: `setup` enforces Python 3.11+; CLI `init/start` do not check it.

Recommendation: make the “official” onboarding path consistent (either `superturtle init/start` or `./setup`) and ensure it checks the same prerequisites.

## `package.json` review (published package root)

`super_turtle/package.json` looks generally correct:
- `name`, `version`, `description`, `keywords`, `repository`, `bugs`, `homepage`: all present and plausible.
- `engines`: requires Node >=18 (CLI) and Bun >=1.0.0 (bot runtime).
- `os`: restricts to `darwin` and `linux` (Windows not supported).

Potential issues:
- `files` includes `README.md` and `LICENSE`, but because they are symlinks in this repo, they are not present in the tarball (per `npm pack --dry-run`). This should be fixed so the published package includes real copies of those files.

## Templates review

### `templates/.env.example`

Strong points:
- Clearly separates required vs optional config.
- Explains the voice transcription requirement (`OPENAI_API_KEY`) and several safe runtime knobs.
- Mentions `ALLOWED_PATHS` behavior and warns about overriding defaults.

Minor nits:
- Consider adding a short note that `TELEGRAM_ALLOWED_USERS` must be numeric IDs and can be comma-separated.

### `templates/CLAUDE.md.template`

It’s intentionally minimal and generic. For onboarding, it may be worth adding:
- a tiny “first task” example
- a note that `.subturtles/` and `.superturtle/` are runtime state and should be ignored (even though `superturtle init` tries to update `.gitignore`)

## Multi-instance isolation

Good:
- Most `/tmp` resources are namespaced by `TOKEN_PREFIX` (derived from `TELEGRAM_BOT_TOKEN`), including:
  - session files, restart files, instance lock file
  - bot logs and audit logs
  - MCP IPC dir (`/tmp/superturtle-${TOKEN_PREFIX}`)
  - MCP config temp file and driver prefs files

Rough edges:
- Default tmux session name is global (`superturtle`) and **not** token-prefixed; running two instances on the same machine will collide unless `SUPERTURTLE_TMUX_SESSION` is set per instance.

## Broken imports / missing files / install-time pitfalls

Confirmed issues (from pack output + code references):
- Missing `state/run_state_writer.py` in published tarball, but referenced by:
  - `subturtle/ctl` (`${SUPER_TURTLE_DIR}/state/run_state_writer.py`)
  - `claude-telegram-bot/src/index.ts` (handoff refresh)
- Missing `README.md` and `LICENSE` at package root due to symlinks in `super_turtle/`.

Likely pitfalls:
- First-run needs a writable install location (to run `bun install` inside the installed package).

## Recommended fixes (priority order)

1. Ensure `README.md` and `LICENSE` are real files in the published package (not symlinks).
2. Publish `state/run_state_writer.py` (and any minimal supporting files) or remove the runtime dependency if it’s intentionally dev-only.
3. Make multi-instance operation safe by default:
   - token-prefix the default tmux session name, or
   - prompt for / document `SUPERTURTLE_TMUX_SESSION` during `superturtle init`.
4. Make runtime prerequisite checks consistent:
   - add a Python 3.11+ check to `superturtle init` (or to `start`)
   - decide whether Claude Code CLI should be required up-front (recommended) vs “warn and limp”
