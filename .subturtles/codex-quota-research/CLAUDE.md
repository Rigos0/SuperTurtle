# Codex Quota Research - SubTurtle

## Current Task

Build proof of concept Python script to extract quota from interactive Codex `/status` command using pexpect.

## End Goal with Specs

Discover the exact method to:
1. **Trigger `/status` in Codex** — either interactively, headless, or via session data ✓ Found: interactive only
2. **Extract quota fields** — remaining messages, 5-hour window %, weekly limit %, reset times
3. **Access programmatically** — find a way to call from code (shell, Node.js, Python) without manual interaction
4. **Proof of concept** — demonstrate working code that returns quota as structured data (JSON)

## Key Questions to Answer

- How does `/status` work in interactive Codex sessions? What's the exact output format?
- Can you invoke `/status` non-interactively (e.g., `codex --json /status` or similar)?
- Does Codex store session quota data locally? Where (logs, cache, database)?
- Can we parse existing Codex session files to extract quota info?
- Is there a Codex API or RPC endpoint we can query locally?

## Roadmap (Completed)

- ✓ Research Codex `/status` command mechanics
  - Found: `/status` is interactive-only TUI command
  - No public OpenAI API for ChatGPT Pro quota
  - Local storage has no quota data
  - Subscription metadata available in JWT claims
- ✓ Find programmatic access method
  - Option 1 (Recommended): pexpect + output parsing
  - Option 2 (Unavailable): OpenAI org-level API key
  - Option 3 (Risky): Undocumented ChatGPT web API

## Roadmap (Upcoming)

- Research Codex `/status` command mechanics
- Find programmatic access method
- Build working proof of concept
- Document findings and next steps

## Backlog

- [x] Start interactive Codex session, run `/status`, capture exact output format
- [x] Try non-interactive approaches: `codex --json`, `codex exec`, API endpoints
- [x] Investigate Codex local storage: ~/.codex/sessions, ~/.codex/log, cache files
- [x] Search Codex CLI source code or documentation for quota/usage APIs
- [x] Document findings in a RESEARCH.md file <- current
- [ ] Build Python pexpect script to extract quota data from interactive Codex
- [ ] Test with real Codex session and validate output format/parsing
- [ ] Propose implementation approach for Telegram bot integration

## Notes

- Codex binary: `/opt/homebrew/bin/codex` (v0.104.0)
- Goal: get "tokens left" / "remaining quota" for subscription (like Claude Code `/status`)
- Use case: meta agent decides loop type (yolo-codex vs yolo) based on available quota
- Constraint: must work non-interactively or with minimal manual intervention
