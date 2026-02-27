# OSS Security Review

Date: 2026-02-27
Reviewer: SubTurtle `oss-security-scan`

## Scope

Repository-level pass for exposed credentials and unsafe open-source defaults, with focus on:

- `super_turtle/claude-telegram-bot/.env.example`
- `super_turtle/claude-telegram-bot/.gitignore`
- `super_turtle/claude-telegram-bot/src/config.ts`
- `super_turtle/claude-telegram-bot/src/security.ts`
- `super_turtle/claude-telegram-bot/README.md`
- `docs/index.md`

## Method

1. Searched tracked files for common secret indicators and token prefixes.
2. Ran regex checks for token-shaped values (Telegram/OpenAI/GitHub/AWS/Google patterns).
3. Verified env-file tracking and ignore rules.
4. Reviewed runtime defaults in config/security modules for least-privilege behavior.

## Findings

## 1) Hardcoded secrets in tracked files
Status: No issues found.

- No private keys, API keys, bot tokens, or credential-like high-entropy strings were found in tracked files.
- Matches from broad keyword scans were documentation/context references (for example words like `token`, `secret`, `TELEGRAM`) rather than live credentials.

## 2) `.env` and config hygiene
Status: No issues found.

- `super_turtle/claude-telegram-bot/.env` is not tracked.
- `.gitignore` excludes `.env` and `.env.*` while allowing only `.env.example`.
- `.env.example` contains explicit placeholders (for example `<telegram_bot_token_from_botfather>`, `<optional_openai_api_key>`) instead of token-shaped sample values.

## 3) Security defaults in runtime config
Status: No issues found.

- `META_CODEX_SANDBOX_MODE` defaults/fallbacks to `workspace-write`.
- `META_CODEX_APPROVAL_POLICY` defaults/fallbacks to `never`.
- `META_CODEX_NETWORK_ACCESS` defaults/fallbacks to `false`.
- `src/security.ts` keeps path allowlisting, dangerous-command blocking, and rate limiting enabled via configurable controls.

## Actions Completed

- Replaced token-shaped env examples with explicit placeholders in:
  - `super_turtle/claude-telegram-bot/.env.example`
  - `super_turtle/claude-telegram-bot/README.md`
  - `docs/index.md`
- Hardened Codex runtime defaults to least privilege in `src/config.ts` and aligned tests/docs.
- Tightened env ignore guidance: `.env.*` ignored except `.env.example`.

## Residual Risk / Follow-up

- Some long-form design docs still contain obvious non-live sample strings (for example `sk-...`, `1234567890:ABC-DEF...`) for explanation purposes. These are placeholders, not credentials.
- Recommended follow-up: normalize legacy documentation examples to angle-bracket placeholders to reduce false positives in automated secret scanning.

## Conclusion

No hardcoded secrets or credential leaks were identified in tracked source/config files in this pass. Current defaults and env guidance align with open-source least-privilege expectations.
