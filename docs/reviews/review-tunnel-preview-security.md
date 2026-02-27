# Security Review: Tunnel Preview Flow

**Date:** 2026-02-27  
**Scope:** `super_turtle/subturtle/start-tunnel.sh` and preview-link handling references

## Findings

1. Input validation gaps in tunnel helper
- `port` was not validated as an integer range.
- `project-dir`/`workspace-dir` could resolve outside the repository tree.

2. Missing dependency and readiness guardrails
- `npm`, `curl`, and `cloudflared` availability was assumed.
- If the dev server exited early, the script waited for timeout instead of failing immediately.

3. URL file lifecycle and exposure concerns
- `.tunnel-url` could remain stale from previous runs.
- URL file permissions were inherited from process umask instead of forced private mode.

## Fixes applied

Updated `super_turtle/subturtle/start-tunnel.sh` with low-risk hardening:
- Added required command checks (`npm`, `curl`, `cloudflared`, plus helper tools used by the script).
- Added strict port validation (`1-65535`).
- Enforced resolved `project-dir` and `workspace-dir` stay under repository root.
- Added writable workspace check.
- Cleared stale `.tunnel-url` at startup and during cleanup.
- Wrote `.tunnel-url` with restrictive permissions (`umask 077`).
- Added early failure when dev server PID exits before readiness.

## Residual risks

1. Quick tunnel is intentionally public
- `trycloudflare.com` links are internet-accessible and unauthenticated by default.
- This is a product behavior choice, not a helper-script bug.

2. Preview data sensitivity
- Any frontend running behind the tunnel must avoid exposing secrets in rendered content.
- Operational guidance should continue to treat preview URLs as temporary public URLs.

## Bot reference review notes

- Telegram status output escapes tunnel URL when rendering HTML, reducing formatting injection risk.
- Silent check-in snapshot flow reads `.tunnel-url` as plain text; currently acceptable after helper hardening because file contents are script-controlled and now lifecycle-managed.
