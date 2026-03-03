# npm package review — `superturtle`

This report is a work in progress; it is built incrementally from the review backlog.

## Published tarball contents

Command run (from `super_turtle/`): `npm pack --dry-run`

Notes:
- `npm` warned that no `.npmignore` exists and it fell back to `.gitignore` for exclusions.

### File list (72 files)

| Path | Size |
| --- | ---: |
| `bin/superturtle.js` | 9.2kB |
| `claude-telegram-bot/bot_control_mcp/server.ts` | 10.5kB |
| `claude-telegram-bot/LICENSE` | 1.1kB |
| `claude-telegram-bot/live.sh` | 2.2kB |
| `claude-telegram-bot/mcp-config.example.ts` | 1.4kB |
| `claude-telegram-bot/mcp-config.ts` | 759B |
| `claude-telegram-bot/package.json` | 610B |
| `claude-telegram-bot/run-loop.sh` | 1.1kB |
| `claude-telegram-bot/scripts/codex-yolo-wrapper.sh` | 823B |
| `claude-telegram-bot/send_turtle_mcp/server.ts` | 6.6kB |
| `claude-telegram-bot/send_turtle_mcp/turtle-combos.json` | 35.9kB |
| `claude-telegram-bot/src/bot.ts` | 355B |
| `claude-telegram-bot/src/codex-session.ts` | 44.1kB |
| `claude-telegram-bot/src/config.ts` | 14.4kB |
| `claude-telegram-bot/src/context-command.ts` | 3.7kB |
| `claude-telegram-bot/src/cron-scheduled-prompt.ts` | 462B |
| `claude-telegram-bot/src/cron-supervision-queue.ts` | 1.5kB |
| `claude-telegram-bot/src/cron.ts` | 5.9kB |
| `claude-telegram-bot/src/dashboard.ts` | 11.6kB |
| `claude-telegram-bot/src/deferred-queue.ts` | 4.3kB |
| `claude-telegram-bot/src/drivers/claude-driver.ts` | 2.8kB |
| `claude-telegram-bot/src/drivers/codex-driver.ts` | 7.4kB |
| `claude-telegram-bot/src/drivers/registry.ts` | 480B |
| `claude-telegram-bot/src/drivers/types.ts` | 1.2kB |
| `claude-telegram-bot/src/formatting.ts` | 9.7kB |
| `claude-telegram-bot/src/handlers/__fixtures__/real-world-claude.md` | 509B |
| `claude-telegram-bot/src/handlers/audio.ts` | 5.7kB |
| `claude-telegram-bot/src/handlers/callback.ts` | 27.5kB |
| `claude-telegram-bot/src/handlers/commands.ts` | 56.6kB |
| `claude-telegram-bot/src/handlers/document.ts` | 16.5kB |
| `claude-telegram-bot/src/handlers/driver-routing.ts` | 5.3kB |
| `claude-telegram-bot/src/handlers/index.ts` | 674B |
| `claude-telegram-bot/src/handlers/media-group.ts` | 6.5kB |
| `claude-telegram-bot/src/handlers/photo.ts` | 5.8kB |
| `claude-telegram-bot/src/handlers/stop.ts` | 3.3kB |
| `claude-telegram-bot/src/handlers/streaming.ts` | 31.6kB |
| `claude-telegram-bot/src/handlers/text.ts` | 10.4kB |
| `claude-telegram-bot/src/handlers/video.ts` | 5.1kB |
| `claude-telegram-bot/src/handlers/voice.ts` | 6.3kB |
| `claude-telegram-bot/src/index.ts` | 34.9kB |
| `claude-telegram-bot/src/logger.ts` | 2.4kB |
| `claude-telegram-bot/src/security.ts` | 4.2kB |
| `claude-telegram-bot/src/session.ts` | 32.7kB |
| `claude-telegram-bot/src/silent-notifications.ts` | 882B |
| `claude-telegram-bot/src/token-prefix.ts` | 426B |
| `claude-telegram-bot/src/turtle-greetings.ts` | 5.9kB |
| `claude-telegram-bot/src/types.ts` | 2.3kB |
| `claude-telegram-bot/src/update-dedupe.ts` | 4.2kB |
| `claude-telegram-bot/src/utils.ts` | 7.4kB |
| `claude-telegram-bot/systemd/superturtle-bot.service.template` | 1.9kB |
| `claude-telegram-bot/tsconfig.json` | 713B |
| `meta/claude-meta` | 824B |
| `meta/DECOMPOSITION_PROMPT.md` | 3.9kB |
| `meta/META_SHARED.md` | 29.6kB |
| `meta/ORCHESTRATOR_PROMPT.md` | 4.0kB |
| `package.json` | 1.7kB |
| `setup` | 7.2kB |
| `subturtle/__main__.py` | 23.0kB |
| `subturtle/browser-screenshot.sh` | 5.1kB |
| `subturtle/claude-md-guard/config.sh` | 475B |
| `subturtle/claude-md-guard/create-rules-prompt.sh` | 1.2kB |
| `subturtle/claude-md-guard/README.md` | 1.5kB |
| `subturtle/claude-md-guard/stats.sh` | 3.0kB |
| `subturtle/claude-md-guard/validate.sh` | 3.0kB |
| `subturtle/ctl` | 36.0kB |
| `subturtle/pyproject.toml` | 497B |
| `subturtle/README.md` | 1.9kB |
| `subturtle/start-tunnel.sh` | 6.2kB |
| `subturtle/subturtle_loop/__main__.py` | 2.2kB |
| `subturtle/subturtle_loop/agents.py` | 3.8kB |
| `templates/.env.example` | 4.0kB |
| `templates/CLAUDE.md.template` | 264B |

### Tarball details (from `npm pack --dry-run`)

| Field | Value |
| --- | --- |
| name | `superturtle` |
| version | `0.1.0` |
| filename | `superturtle-0.1.0.tgz` |
| package size | 158.3 kB |
| unpacked size | 597.4 kB |
| total files | 72 |

