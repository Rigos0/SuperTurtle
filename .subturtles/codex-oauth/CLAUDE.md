# Current Task

Fix CodexSession to use OAuth (from `codex login`) instead of requiring OPENAI_API_KEY.

# End Goal with Specs

The Codex SDK should initialize without an API key, relying on OAuth tokens in `~/.codex/auth.json` (from `codex login`). The `OPENAI_API_KEY` check and `apiKey` constructor param must be removed from codex-session.ts. OPENAI_API_KEY stays in config.ts for Whisper (voice transcription) — don't touch that.

**File:** `super_turtle/claude-telegram-bot/src/codex-session.ts`

**Changes:**
1. In `ensureInitialized()`: remove the `if (!OPENAI_API_KEY)` guard (lines 95-97)
2. In `ensureInitialized()`: change `new CodexImpl({ apiKey: OPENAI_API_KEY })` to `new CodexImpl()` (line 107)
3. Remove the `OPENAI_API_KEY` import from line 9 (keep WORKING_DIR and META_PROMPT)
4. Update the `CodexCtor` type to not require apiKey: `type CodexCtor = new (options?: Record<string, unknown>) => CodexClient;`

**Acceptance criteria:**
- codex-session.ts no longer imports or references OPENAI_API_KEY
- `new Codex()` is called with no arguments (SDK uses OAuth from ~/.codex/auth.json)
- TypeScript compiles without errors (`bun build` or `bunx tsc --noEmit`)
- Commit the change

# Backlog

- [x] Remove OPENAI_API_KEY from codex-session.ts, init Codex with no args
- [x] Verify TypeScript compiles cleanly
- [x] Commit

## Loop Control

STOP
