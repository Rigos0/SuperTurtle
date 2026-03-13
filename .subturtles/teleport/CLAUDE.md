# Current task
Fix pre-existing build errors in `../superturtle-web/` so `npm run build` passes cleanly before adding managed runtime changes.

# End goal with specs
A fully working /teleport feature where:
- Any logged-in user can use /teleport (no billing gate for now)
- /teleport from Telegram moves the bot from local to an E2B sandbox (local to cloud)
- /teleport again moves it back (cloud to local)
- Only one runtime is authoritative at a time (lease system already exists)
- Handoff preserves semantic continuity using the existing handoff bundle model
- E2B sandbox is created and managed by the control plane (one per user)
- Supabase schema deployed for users, managed instances, teleport sessions
- superturtle-web deployed on Vercel with all API routes working
- Provider auth (Claude/Codex) is bootstrapped from local machine on first teleport

# Roadmap (Completed)
- Hosted auth and CLI login flow (superturtle login/whoami work)
- Control plane API routes for cloud status, instance resume, teleport target, machine register/heartbeat, runtime lease claim/heartbeat/release
- Durable schema for managed instances, provisioning jobs, runtime leases, machine registration
- Runtime ownership enforcement in superturtle start/stop with lease semantics

# Roadmap (Upcoming)
- E2B sandbox lifecycle management in superturtle-web
- Local to cloud teleport via E2B
- Cloud to local return teleport
- Provider auth bootstrap for managed sandboxes
- Production deployment and validation

# Backlog
- [x] Examine both repos to map what exists: check ../superturtle-web/ for E2B integration, managed instance routes, sandbox adapters, subscriptions table, and route handlers; check agentic repo for teleport command, handoff code, E2B config, cloud control plane runtime, and provider auth helpers
  - Inventory captured in `.subturtles/teleport/INVENTORY.md`.
- Fix any pre-existing build errors in ../superturtle-web/ (known: simple-import-sort/imports errors in runtime lease route files) so npm run build passes clean <- current
- Create E2B sandbox adapter in superturtle-web at src/lib/e2b-sandbox.ts: functions for create, connect/resume, pause, kill, list, and metadata lookup using the E2B SDK with process.env.E2B_API_KEY
- Create /v1/cli/cloud/instance/provision route in superturtle-web: creates one E2B sandbox per logged-in user, stores sandbox_id and template_id in managed_instances table, returns instance metadata; skip billing checks for now (any authenticated user is allowed)
- Create /v1/cli/cloud/instance/status route in superturtle-web: returns sandbox health, running state, and connection info for the users managed instance
- Update /v1/cli/cloud/instance/resume route to actually resume a paused E2B sandbox using the adapter
- Build sandbox bootstrap logic: when a new sandbox is provisioned, install tmux/rsync/bun, clone the repo, configure .superturtle/.env for sandbox paths, and register back to the control plane via /v1/machine/register
- Implement /teleport preflight in the Telegram bot: check user is logged in, check bot is idle and queue empty, resolve managed target from /v1/cli/teleport/target, show confirm/cancel buttons via ask_user MCP tool
- Implement local-to-cloud teleport execution: export handoff bundle, upload to E2B sandbox via file API, start remote bootstrap via E2B command/PTY, verify health, then transfer ownership lease to cloud runtime
- Implement cloud-to-local return teleport: export handoff state from cloud sandbox, download to local, restore local state, verify local health, transfer ownership lease back to local
- Add provider auth bootstrap for first teleport: detect existing local Claude auth (check ~/.claude for token material) and Codex auth (check ~/.codex/auth.json), upload securely to managed sandbox, validate provider auth works in sandbox before completing teleport
- Add rollback logic: if cloud startup fails during local-to-cloud keep local authoritative; if local restart fails during cloud-to-local keep cloud authoritative
- Implement /teleport status showing current phase, active owner (local or cloud), destination runtime state, and latest failure reason
- Surface clear preflight failure messages for missing login, missing provider auth, destination sandbox not provisioned, and destination unhealthy
- Verify npm run build passes in both repos after all changes
- Commit all changes in both repos separately
