## Current Task
Write `ci.yml` with push-to-main-only trigger, typecheck job, and test job.

## End Goal with Specs
A `.github/workflows/ci.yml` file that:
- Triggers **only** on `push` to `main` (not dev, not PRs to dev)
- Uses Bun runtime (the project uses Bun, not Node)
- Runs two jobs:
  1. **Typecheck**: `cd super_turtle/claude-telegram-bot && bun run --bun tsc --noEmit`
  2. **Tests**: `cd super_turtle/claude-telegram-bot && bun test`
- Uses `oven-sh/setup-bun@v2` for Bun installation
- Installs dependencies with `cd super_turtle/claude-telegram-bot && bun install`
- Keep it simple and clean — no matrix builds, no caching (can add later)

**Test suite info:**
- 30 test files in `super_turtle/claude-telegram-bot/src/` (135 tests, 416 assertions)
- All tests currently pass with `bun test`
- Typecheck passes with `bun run --bun tsc --noEmit`
- Tests use Bun's built-in test runner (no jest/vitest)

## Backlog
- [x] Create `.github/workflows/` directory
- [ ] Write `ci.yml` with push-to-main-only trigger, typecheck job, and test job <- current
- [ ] Verify YAML is valid (check syntax)
- [ ] Commit with message: "ci: add GitHub Actions workflow for main branch (typecheck + tests)"
