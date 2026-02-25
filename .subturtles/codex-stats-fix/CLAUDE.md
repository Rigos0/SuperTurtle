# Codex Stats Integration - SubTurtle

## Current Task

Await next task assignment (maintenance verified on February 25, 2026; tests and typecheck passing).

## End Goal with Specs

Replace the current OpenAI API-based Codex usage endpoint with a local approach:

1. **Instead of calling OpenAI's `/v1/organization/usage/completions` API**, run `codex` CLI with `/stats` command to get usage data
2. **Spin up a headless Codex instance** (or use existing running instance) and execute `/stats` to retrieve current usage
3. **Parse the output** from the `/stats` command and format it for the `/usage` Telegram command
4. **No `OPENAI_ADMIN_KEY` required** — use only what the local Codex instance provides
5. **Graceful fallback** — if Codex is not running or `/stats` fails, show "Codex unavailable" in `/usage`
6. **Tests pass** — `bun test` and `bun run typecheck` both succeed in `super_turtle/claude-telegram-bot`

## Key Implementation Notes

- Use `codex exec "/stats"` or similar to get stats from running Codex instance
- Parse the response to extract request count, token usage, etc.
- Update `getCodexUsageLines()` in `src/handlers/commands.ts` to use this approach instead of fetch
- Keep `CODEX_ENABLED` environment variable as the feature flag
- Remove any references to `OPENAI_ADMIN_KEY` from the implementation
- Update README.md to reflect the new approach (local Codex required, no admin key needed)

## Roadmap (Completed)

- ✓ Previous implementation researched OpenAI API approach
- ✓ Test suite created to verify behavior with CODEX_ENABLED flag

## Roadmap (Upcoming)

- Research exact format of `codex /stats` output
- Implement local Codex stats fetching
- Update tests to mock local Codex CLI calls
- Update documentation
- Final validation

## Backlog

- [x] Research how `codex` CLI exposes `/stats` data (exact command, output format, response structure)
- [x] Update `getCodexUsageLines()` function to call Codex CLI instead of OpenAI API
- [x] Remove `OPENAI_ADMIN_KEY` references from code and config
- [x] Update bot `README.md` — remove admin key requirement, explain local Codex instance requirement
- [x] Update tests in `src/handlers/commands.usage.test.ts` to mock `codex exec` calls instead of OpenAI API
- [x] Run `bun test` and `bun run typecheck` — verify all tests pass
- [x] Update `.env.example` to reflect that only `CODEX_ENABLED=true` is needed
- [x] Final review and commit
- [ ] Await next task assignment (validation heartbeat recorded on February 25, 2026) <- current

## Notes

- Working directory: /Users/Richard.Mladek/Documents/projects/agentic
- Bot source: super_turtle/claude-telegram-bot
- Codex CLI is installed at `/opt/homebrew/bin/codex` (version 0.104.0)
- Multiple Codex instances are currently running (check with `ps aux | grep codex`)
- Use `Bun.spawnSync()` to call `codex exec "/stats"` and capture output
- `codex exec --json "/stats"` emits `turn.completed.usage` with `input_tokens`, `cached_input_tokens`, and `output_tokens`
- Maintenance note: fixed `src/config.test.ts` to spawn Bun with `--no-env-file` so local `.env` does not leak into the "unset CODEX_ENABLED" case.
- Validation this pass: `bun test` passed (5/5); `bun run typecheck` passed.
- Validation heartbeat (February 25, 2026): `bun test` passed (5/5); `bun run typecheck` passed.
