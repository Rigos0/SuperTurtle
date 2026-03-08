# Current task
Add conductor types to `dashboard-types.ts` for worker lifecycle, wakeups, and inbox state.

# End goal with specs
The dashboard at `GET /` should show:
1. SubTurtle race lanes enhanced with conductor lifecycle state badge (running/completed/failed/archived/timed_out) from `.superturtle/state/workers/{name}.json`
2. New Conductor panel showing pending wakeups and unacknowledged inbox items
3. Event activity feed on SubTurtle detail page — recent events timeline from `events.jsonl` (last 15 events per worker)
4. Header badge for conductor state (pending wakeups + inbox count)
5. Queue panel auto-hidden when empty

# Roadmap (Completed)
- Favicon and title fix (SuperTurtle, turtle emoji)
- Layout reorder (Cron + Jobs side by side, Queue below)

# Roadmap (Upcoming)
- Conductor state integration in dashboard
- Enhanced SubTurtle detail pages
- Visual polish pass

# Backlog
- [x] Add `/api/conductor` endpoint returning all worker states, pending wakeups, and unacknowledged inbox items
- [ ] Add conductor types to `dashboard-types.ts` (ConductorResponse with workers, wakeups, inbox arrays) <- current
- [ ] Enhance race lane cards to show lifecycle state badge from conductor worker state
- [ ] Add Conductor panel to the main dashboard grid with wakeup + inbox summary
- [ ] Add conductor header badge and auto-hide empty Queue panel
- [ ] Add event timeline to SubTurtle detail page (`renderSubturtleDetailHtml`) showing last 15 events
- [ ] Run typecheck (`bun run typecheck`) and fix any errors
- [ ] Commit all changes

## Notes
Files: `super_turtle/claude-telegram-bot/src/dashboard.ts` (~2600 lines), `super_turtle/claude-telegram-bot/src/dashboard-types.ts` (~345 lines).
HTML is a template string in `renderDashboardHtml()` at ~line 716. CSS inline in `<style>`, JS inline in `<script>`.
Data: browser fetches `/api/dashboard`, `/api/jobs/current`, `/api/sessions` every 5s. Add `/api/conductor`.
Worker state: `loadWorkerStates(stateDir)` from `conductor-supervisor.ts`. Wakeups: `loadPendingWakeups(stateDir)`. Inbox: `listPendingMetaAgentInboxItems({ stateDir })` from `conductor-inbox.ts`. Events: `loadWorkerEvents(stateDir, workerName)`.
State dir: `join(SUPERTURTLE_DATA_DIR, "state")` from `config.ts`. Import SUPERTURTLE_DATA_DIR from ./config.
Existing `readConductorWorkerState(name)` at line ~173 of dashboard.ts already reads worker JSON.
Color scheme: olive/sage/terracotta on cream. Lifecycle badges: running=green, completed=sage, failed=red, archived=muted, timed_out=terracotta.
Do NOT refactor the inline template pattern. Preserve existing visual identity.
Cron + Jobs already side by side on row 3, Queue on row 4 — build on that.
