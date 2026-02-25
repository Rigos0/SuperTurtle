# Overall Verdict: NEEDS FIX

The `/usage` implementation is close, but it currently reports healthy status when quota data is missing and renders unescaped external text in HTML mode. Those are correctness/security issues that should be fixed before considering this production-ready.

## 1. Correctness — NEEDS FIX

- **Missing data is shown as healthy (`✅`)**.
  - `super_turtle/claude-telegram-bot/src/handlers/commands.ts:562` sets `Claude Code` to `✅` when no usage data exists.
  - `super_turtle/claude-telegram-bot/src/handlers/commands.ts:603` sets `Codex` to `✅` when no quota data exists.
  - `super_turtle/claude-telegram-bot/src/handlers/commands.ts:610` + `:620` can emit `✅ All services operating normally` because both percentages default to `0` when parsing found nothing.
  - Impact: users can be told limits are healthy even when data retrieval failed.

## 2. Code Quality — MINOR

- Dead/unused type alias:
  - `super_turtle/claude-telegram-bot/src/handlers/commands.ts:673` (`CodexQuotaData`) is defined but unused.
- Minor duplication/no-op branch:
  - `super_turtle/claude-telegram-bot/src/handlers/commands.ts:594` and `:597` return the same value in both branches.

## 3. Security — NEEDS FIX

- **Unescaped external string inserted into Telegram HTML output**.
  - `super_turtle/claude-telegram-bot/src/handlers/commands.ts:578` extracts `planType` from JSON-RPC response.
  - `super_turtle/claude-telegram-bot/src/handlers/commands.ts:590` interpolates `planType` directly into `<b>...</b>` without `escapeHtml`.
  - Impact: malformed or malicious plan labels could inject HTML markup into bot output.

## 4. Testing — NEEDS FIX

Current tests validate happy paths only (`CODEX_ENABLED=true/false`) and do pass.
- Covered:
  - `super_turtle/claude-telegram-bot/src/handlers/commands.usage.test.ts:180`
  - `super_turtle/claude-telegram-bot/src/handlers/commands.usage.test.ts:195`
- Missing high-value tests:
  - failure branch for both sources unavailable (`handleUsage` at `commands.ts:660`)
  - partial-data branches that currently emit green status (`commands.ts:562`, `:603`, `:610`)
  - HTML escaping of Codex plan type (`commands.ts:590`)

## 5. Performance — PASS

- `handleUsage` correctly fetches Claude and Codex in parallel via `Promise.all` (`super_turtle/claude-telegram-bot/src/handlers/commands.ts:652`).
- Quota fetch includes an 8-second guard timeout (`super_turtle/claude-telegram-bot/src/handlers/commands.ts:705`).

## 6. Type Safety — MINOR

- JSON from external sources is cast with broad structural assertions, without runtime validation:
  - Claude usage cast: `super_turtle/claude-telegram-bot/src/handlers/commands.ts:357`
  - Codex response cast: `super_turtle/claude-telegram-bot/src/handlers/commands.ts:812`
- This is acceptable for now but fragile if upstream payload shape changes.
