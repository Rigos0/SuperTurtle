## Current Task
Remove/replace any secrets with env placeholders; ensure .gitignore or docs guidance where needed.

## End Goal with Specs
- No hardcoded secrets/API keys/tokens left in tracked files.
- Findings documented in docs/oss-security-review.md (summary + files checked + fixes).
- Any risky defaults called out with safe defaults or docs changes.
- Commit with a clear message.

## Backlog
- [x] Run secret scan with ripgrep for common patterns (api_key, secret, token, sk-, xox, AIza, ghp_, github_pat, BEGIN PRIVATE KEY, ssh-rsa, BOT_TOKEN, TELEGRAM, OPENAI, ANTHROPIC, CLAUDE) and inspect .env/.env* and config files.
- [x] Review defaults in super_turtle/claude-telegram-bot/src/config.ts and super_turtle/claude-telegram-bot/src/security.ts for unsafe open-source defaults; note/fix.
- [ ] Remove/replace any secrets with env placeholders; ensure .gitignore or docs guidance where needed. <- current
- [ ] Write docs/oss-security-review.md with findings + actions (include "no issues" if clean).
- [ ] Commit.

## Notes
Key files: super_turtle/claude-telegram-bot/src/config.ts, super_turtle/claude-telegram-bot/src/security.ts, README.md, docs/.
Prefer rg -n "pattern" .
2026-02-27: Completed initial rg-based secret scan and .env/.env* inspection. Only .env.example is tracked; local .env files are ignored via .gitignore. Token-like strings found in docs/examples appear to be placeholders.
2026-02-27: Hardened Codex runtime defaults in src/config.ts to least privilege (sandbox default/fallback: workspace-write; network default/fallback: false). Updated config tests and env/docs examples to match.
