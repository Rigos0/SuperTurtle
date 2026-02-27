## Current Task
Update root README.md with matching Setup section and docs link; remove/adjust any non-clone-compatible claims.

## End Goal with Specs
- Documentation site in /docs using a standard free framework (prefer VitePress unless existing system is already set up).
- Docs include Setup section: Claude Code or Codex subscription required; optional OpenAI API key for voice transcription; Telegram bot setup (BotFather steps, token, chat id); env vars and run commands.
- Landing page has a "Docs" link/button next to the GitHub button pointing to /docs.
- Root README.md includes the same setup steps and links to the docs (and any setup video if present).
- Docs + README assume clone-only usage (not drop-in to existing codebases) and remove any conflicting language.
- Commit with a clear message.

## Backlog
- [x] Inspect docs/ and super_turtle/claude-telegram-bot/README.md for current setup guidance + any video link (search for "video", "loom", "youtube").
- [x] Initialize docs site under docs/ (VitePress) or extend existing system; create docs index page with Overview + Setup + Run sections.
- [x] Add Docs link/button on landing page next to GitHub button (landing/app/page.tsx + any needed styles in landing/app/globals.css).
- [ ] Update root README.md with matching Setup section and docs link; remove/adjust any non-clone-compatible claims. <- current
- [ ] Commit.

## Notes
If using VitePress: docs/.vitepress/config.ts, docs/index.md, docs/package.json with scripts (docs:dev/docs:build/docs:preview).
Landing code: landing/app/page.tsx, landing/app/globals.css.
VitePress is MIT licensed and a standard free docs generator (ok for open source).
Inspection note: no setup video links found in root README.md, docs/, or super_turtle/claude-telegram-bot/README.md (searched for "video", "loom", "youtube").
