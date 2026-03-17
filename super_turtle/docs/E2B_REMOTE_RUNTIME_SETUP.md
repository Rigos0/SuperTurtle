# E2B Remote Runtime Setup

This branch now treats the E2B sandbox as the remote SuperTurtle runtime.

The current helper bootstrap lives in:

- `super_turtle/bin/e2b-webhook-poc-lib.js`

It does three things before starting the remote bot:

1. installs or verifies the published `superturtle` runtime package inside the sandbox
2. writes sandbox-local `.superturtle/project.json` and `.superturtle/.env`
3. bootstraps remote Claude/Codex auth material

## Claude setup

Current bootstrap order:

1. reuse `CLAUDE_CODE_OAUTH_TOKEN` if it is already present in local `.superturtle/.env`
2. otherwise reuse a local Claude access token discovered from:
   - `SUPERTURTLE_CLAUDE_ACCESS_TOKEN`
   - `CLAUDE_CODE_OAUTH_TOKEN`
   - macOS keychain entry `Claude Code-credentials`
   - Linux `secret-tool`
   - `~/.config/claude-code/credentials.json`
   - `~/.claude/credentials.json`

What gets applied remotely:

- the remote bot launch env includes `CLAUDE_CODE_OAUTH_TOKEN`
- the generated remote project env file at `<remote-root>/.superturtle/.env` includes the same token

This is enough for the sandboxed bot runtime and for manual remote `superturtle start` runs that rely on `.superturtle/.env`.

## Codex setup

Current bootstrap order:

1. reuse local `~/.codex/auth.json` if it exists
2. copy it into sandbox `~/.codex/auth.json`
3. ensure the remote `codex` CLI exists
4. verify auth with `codex login status`

If `codex` is missing remotely, the helper installs it with:

```bash
npm install -g --prefix "$HOME/.local" @openai/codex
```

If no local `~/.codex/auth.json` exists, the helper reuses any existing sandbox auth cache. If neither exists, remote agent launch should fail before Telegram cutover.

You can override the local auth source with:

```bash
SUPERTURTLE_TELEPORT_CODEX_AUTH_PATH=/path/to/auth.json
```

## Manual verification inside the sandbox

After launch, these checks should pass:

```bash
codex login status
test -s "$HOME/.codex/auth.json"
test -s "<remote-root>/.superturtle/.env"
grep '^CLAUDE_CODE_OAUTH_TOKEN=' "<remote-root>/.superturtle/.env"
```

If you want to start the bot manually inside the sandbox instead of through the helper:

```bash
cd <remote-root>
superturtle start
```

That path expects the generated `.superturtle/.env` to exist.

## Notes

- Remote agent mode now honors the configured remote driver. Managed onboarding can start either Codex or Claude Code; `/teleport` still defaults to Codex unless it passes an explicit remote driver override.
- The sandbox remains stateful and resumable, so once auth is seeded it should stay available across pause/resume on the same sandbox.
