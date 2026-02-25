# Codex Support Task - SubTurtle

## Current Task
Create getCodexUsageLines() function in src/handlers/commands.ts

## End Goal with Specs
Implement full Codex support in Super Turtle's Telegram bot:

1. **Configuration System**
   - Add `CODEX_ENABLED` environment variable (default: false)
   - Parse in config.ts and export as boolean
   - Include in .env.example with documentation

2. **Usage Stats Enhancement**
   - `/usage` command shows Claude stats (existing)
   - `/usage` command also shows Codex stats when CODEX_ENABLED=true
   - Both sections formatted clearly with HTML
   - Graceful error handling if either endpoint fails

3. **Documentation**
   - README.md explains CLOTH subscription requirement
   - Documents CLI auth vs API key authentication
   - Documents how to enable Codex and when to use it
   - Links to SubTurtle meta docs for `yolo-codex` type

4. **Testing**
   - Config loads correctly with both enabled/disabled states
   - `/usage` works without Codex (existing behavior)
   - `/usage` works with Codex enabled (new behavior)
   - No breaking changes to existing commands

## Roadmap (Completed)
- [ ] (none yet)

## Roadmap (Upcoming)
- Phase 1: Configuration system
- Phase 2: Codex usage fetching (research API endpoint)
- Phase 3: Update README documentation
- Phase 4: Testing and validation

## Backlog

- [x] Update .env.example to add CODEX_ENABLED=false option
- [x] Update src/config.ts to parse and export CODEX_ENABLED boolean
- [x] Research Codex API endpoint for usage stats (endpoint, auth, response format)
- [ ] Create getCodexUsageLines() function in src/handlers/commands.ts <- current
- [ ] Update /usage command handler to include Codex stats when enabled
- [ ] Update README.md with CLOTH subscription explanation
- [ ] Add Codex configuration section to README
- [ ] Test config loading with both enabled/disabled states
- [ ] Test /usage command with and without Codex enabled
- [ ] Final review and commit

## Notes
- Working directory: /Users/Richard.Mladek/Documents/projects/agentic
- Bot source: super_turtle/claude-telegram-bot
- Use yolo-codex SubTurtle type for this work (single Claude call per iteration)
- Codex usage API research (2026-02-25):
  - Endpoint: `GET https://api.openai.com/v1/organization/usage/completions`
  - Auth: `Authorization: Bearer $OPENAI_ADMIN_KEY` (organization usage endpoints require an admin API key)
  - Required query: `start_time` (Unix seconds, inclusive)
  - Useful optional query params: `end_time` (exclusive), `bucket_width` (`1m|1h|1d`, default `1d`), `limit`, `page`, `project_ids`, `user_ids`, `api_key_ids`, `models`, `batch`, `group_by`
  - Response format: paginated `object: "page"` with `data[]` buckets; each bucket has `start_time`, `end_time`, and `results[]`
  - Completions result shape includes `input_tokens`, `output_tokens`, `input_cached_tokens`, `input_audio_tokens`, `output_audio_tokens`, `num_model_requests`, plus optional `project_id`, `user_id`, `api_key_id`, `model`, `batch`, `service_tier`; pagination fields are `has_more` and `next_page`
  - Source refs: https://developers.openai.com/api/reference/resources/organization/subresources/audit_logs/subresources/usage/methods/get_completions and https://platform.openai.com/docs/admin-api-keys
