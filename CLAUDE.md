# Super Turtle — Dev Branch

You are Super Turtle 🐢 — a Telegram bot that is actively developing itself. This is the dev branch where the actual building happens.

---

## Branch Merge Instructions (dev → main)

`CLAUDE.md` is **branch-specific**: `main` has the public onboarding runbook, `dev` has the working developer state. The `.gitattributes` file uses Git's `merge=ours` driver to prevent merges from overwriting the target branch's `CLAUDE.md`.

### One-time setup (per clone)

Every developer who clones this repo must run this once:

```bash
git config merge.ours.driver true
```

This registers the "ours" merge driver locally. Without it, Git won't know how to handle the `merge=ours` attribute and will fall back to default (which could overwrite).

### Merging dev → main

Always use `--no-ff` to ensure the merge driver is invoked:

```bash
git checkout main
git merge --no-ff dev
git push origin main
```

This will merge all code changes from dev into main, but `CLAUDE.md` on main will stay untouched.

### Merging main → dev (syncing back)

Same pattern — dev's `CLAUDE.md` is preserved:

```bash
git checkout dev
git merge --no-ff main
```

### Why `--no-ff` is required

Fast-forward merges skip the merge machinery entirely (no merge commit = no merge drivers). If Git can fast-forward, the `merge=ours` rule is never evaluated and `CLAUDE.md` gets overwritten. Always use `--no-ff`.

### If something goes wrong

If `CLAUDE.md` does get overwritten during a merge:

```bash
# Restore the version from before the merge
git checkout HEAD~1 -- CLAUDE.md
git commit -m "restore branch-specific CLAUDE.md"
```

---

## Current task
Connections system + guest read-only mode. 3 SubTurtles: guest-readonly, connections-backend, connections-frontend (queued).

## 🤖 FULL-AUTO MODE (overnight)
The meta agent is running autonomously. Cron orchestrator (id `c0ffee`) fires every 20 min.
- Monitor all running SubTurtles, stop finished ones, commit+push work
- When all SubTurtles done → move to final QA: Convex deploy, build, e2e tests, write new tests for connections + guest read-only
- When QA done → clean up all crons, send final summary to user
- Only message the user on: completions, stuck states, errors
- If a SubTurtle finishes and the next backlog item needs a new SubTurtle, spawn it automatically

## End goal with specs
A **production-grade** LinkedIn-style demo app (Turtle In 🐢) — live at **https://linkedin-demo-iota.vercel.app**

## Tech Stack
- **Frontend:** React 17 (CRA) + Material-UI + Redux (theme only)
- **Backend:** Convex (cloud deployment `tough-mosquito-145`)
- **Auth:** Convex Auth (`@convex-dev/auth` + `@auth/core@0.37.0`) — GitHub + Google (anonymous removed)
- **Hosting:** Vercel
- **Convex functions:** `linkedin-demo/src/convex/`
- **Dashboard:** `https://dashboard.convex.dev/t/richard-8ac4b/bibr-in`
- **OAuth callback base:** `https://tough-mosquito-145.convex.site/api/auth/callback/`

## Roadmap (Completed)
- ✅ Scaffold, Convex backend, React frontend, Vercel deploy
- ✅ Rebrand to **Turtle In** 🐢 — green theme (#2e7d32), turtle assets
- ✅ Auth: Anonymous + GitHub OAuth + Google OAuth (all working)
- ✅ Core features: posts (CRUD), likes, comments, messaging, profiles, network, notifications, search, sidebar, widgets
- ✅ Mobile responsive with bottom nav
- ✅ Dark mode across all views
- ✅ Production polish: dead buttons wired, dead UI removed, navigation cleanup, LoadingGate universal spinner, email index for OAuth

## Backlog
- [x] Remove anonymous auth — guests browse read-only (no post/like/comment/message) ✅
- [x] Connections backend — connections table, send/accept/reject/remove mutations, real counts, no self-connect ✅
- [x] Connections frontend — wire Connect button, pending/connected states, view connections list on profiles, real counts ✅
- [ ] UI polish — dark mode fixes, empty states, dead code cleanup, loading UX, active tab, ErrorBoundary <- current (ui-polish)
- [ ] Final deploy + full manual QA + E2E tests

## Notes
- Convex schema: users (with email index), posts, likes, comments, conversations, messages, notifications + authTables
- Convex functions: posts.ts, users.ts, seed.ts, likes.ts, comments.ts, auth.ts, http.ts, messaging.ts, notifications.ts
- Hooks: useConvexPosts.js, useConvexUser.js
- CI on `main` runs typecheck + unit tests; Codex integration tests gated behind `CODEX_INTEGRATION=1`
