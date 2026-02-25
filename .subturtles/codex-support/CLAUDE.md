# Codex Support Task - SubTurtle

## Current Task
Update src/config.ts to parse and export CODEX_ENABLED boolean

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
- [ ] Update src/config.ts to parse and export CODEX_ENABLED boolean <- current
- [ ] Research Codex API endpoint for usage stats (endpoint, auth, response format)
- [ ] Create getCodexUsageLines() function in src/handlers/commands.ts
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
- The SubTurtle should research Codex API during implementation if needed
