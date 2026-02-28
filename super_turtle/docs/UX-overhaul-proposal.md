# UX Overhaul Proposal: Meta Agent Supervision System

## Problem Statement

The current SubTurtle supervision system creates a poor user experience through:

1. **Notification spam** — Every 5 minutes, the user receives "🔔 Scheduled: Checking SubTurtle..." messages even when there's no progress or issues to report. This fills the chat with noise.

2. **Verbose status reports** — The meta agent sends full supervision reports ("running", "backlog item N is complete", git log snippets) even when nothing meaningful changed since the last check.

3. **No task decomposition** — Users must manually break down large tasks into SubTurtle-sized chunks. They want to say "build me a dashboard" and have the system handle parallel work and sequencing.

4. **Invisible progress** — SubTurtles run in the background. Users see nothing until the next cron check (up to 5 minutes later). No real-time feedback that work is happening.

5. **Sequential bottleneck** — When one SubTurtle finishes, it waits for the next cron cycle (5 min) before the meta agent can spawn the next task. This creates idle time.

## Proposed Solution

### 1. Silent Check-ins (No Chat Spam)

**Key insight:** Cron checks should happen but not surface unless there's news.

**Implementation:**
- Add a `--silent` flag to cron-injected prompts (injected in `super_turtle/claude-telegram-bot/src/handlers/commands.ts`, line ~158-160)
- When `--silent` is set, the meta agent **processes silently** — no chat output unless:
  - ✅ A SubTurtle completes (report what shipped)
  - ❌ A SubTurtle is stuck (report blocker, suggest fix)
  - 🚀 A SubTurtle starts (announce new task)
  - ⚠️ An error occurs (alert the user)
  - 📍 A milestone is reached (e.g., "Halfway through the roadmap")

**Message examples:**

| Scenario | Current | Proposed |
|----------|---------|----------|
| SubTurtle still running after 5m | "🔔 Scheduled: Checking SubTurtle spawn-impl... [status] running, [progress] item 2/5 done" | (silent — nothing) |
| SubTurtle completes 4 items in 10m | "🔔 Scheduled: Checking SubTurtle spawn-impl... [status] stuck or complete?" + "SubTurtle spawn-impl done" | "🎉 SubTurtle spawn-impl finished: ✓ item 1, ✓ item 2, ✓ item 3, ✓ item 4" |
| SubTurtle is stuck (no commits in 2 checks) | "🔔 Scheduled: Checking SubTurtle spawn-impl... [logs] error: file not found" | "⚠️ SubTurtle spawn-impl appears stuck: no commits in 10 minutes. Last error: file not found. Stopping to investigate." |
| Cron check detects new tunnel URL | (not reported currently) | "🔔 Preview ready: https://xxxx.trycloudflare.com" (sent once per session) |

### 2. Message UX Overhaul

**Rule: Only the user should see progress messages if they are actionable, celebratory, or indicative of problems.**

**New messaging framework:**

```
ON_START:
  "🚀 Started: <task name>"

ON_PROGRESS (every N commits, where N=backlog-item-size):
  (silent — user sees git commits in the repo, that's awareness enough)

ON_COMPLETION:
  "🎉 Finished: <task name>"
  "<what shipped>"
  "[link to diff if frontend work]"

ON_STUCK (no commits in 2 cycles):
  "⚠️ Stuck: <task name>"
  "<reason>"
  "<suggested fix or next step>"

ON_ERROR:
  "❌ Error: <task name>"
  "<error message>"

ON_MILESTONE:
  "📍 Milestone: X of Y roadmap items complete"
```

**Benefits:**
- Chat is now a story of progress, not noise
- Users still see the work happening (via git history in the IDE)
- Actionable messages only

### 3. Autonomy Improvements

**Problem:** Users can't say "build me X" — they have to break it down into subtasks themselves.

**Proposed capability: Task decomposition by the meta agent**

The meta agent should have the authority to:

1. **Accept high-level requests** → "Build a user dashboard with search, filters, and export"
2. **Decompose into SubTurtles** → Spawn 3 concurrent SubTurtles (search-feature, filters-feature, export-feature)
3. **Sequence dependent work** → If export depends on search, pause the export SubTurtle until search completes
4. **Auto-progress the roadmap** → When a SubTurtle finishes, immediately spawn the next queued task (no 5-min wait)

**Implementation:**
- Update root `CLAUDE.md` to include a **Task Decomposition** section where the meta agent can define multi-SubTurtle work
- Modify cron check-in logic to **reschedule itself more frequently** (1-2 min instead of 5 min) when a SubTurtle is on its last 1-2 backlog items, so the meta agent catches completion faster and can spawn the next task immediately
- Give the meta agent a **decomposition prompt** that breaks large tasks into 3-5 focused SubTurtles

**Example interaction:**

```
User: "Build a mobile-responsive landing page with a hero, feature cards, and CTA"

Meta agent:
  Understood. I'll break this into 3 parallel SubTurtles:
  - hero-section (layout + styling)
  - feature-cards (grid + responsive)
  - cta-section (button + animation)

  Started. I'll report when each is done.

[3 SubTurtles run in parallel]

Meta agent (1 min later, as each finishes):
  ✓ hero-section done
  ✓ feature-cards done
  ✓ cta-section done

  Mobile page is ready. Preview: https://xxxx.trycloudflare.com
```

### 4. Real-Time Progress Awareness

**Problem:** Users don't know work is happening between cron checks.

**Proposed solutions:**

**A. Git log integration (Low effort, immediate win)**
- User can peek at `.subturtles/<name>/subturtle.log` in the IDE to see live progress
- SubTurtle logs already show planning, grooming, execution, review phases
- User gets real-time feedback by opening the log file

**B. Status command enhancement (Medium effort)**
- Add a `/status` command that shows:
  - All running SubTurtles with their current task
  - Time elapsed / time remaining
  - Recent commits (last 3)
  - Tunnel URL if applicable
- User can check anytime without waiting for cron

**C. Streaming progress notifications (High effort, future)**
- SubTurtle could emit structured events (JSONL) as it works
- Bot could parse these and send micro-updates ("Planning...", "Executing...", "Reviewing...")
- Feels like real-time without polling

**Recommended:** Start with A + B (log visibility + `/status` command). C is future-state.

### 5. Eliminate Sequential Bottleneck

**Current flow:**
1. SubTurtle finishes, writes STOP to CLAUDE.md
2. Cron checks (every 5 min)
3. Meta agent sees completion, spawns next SubTurtle
4. Next SubTurtle starts 5 min after previous one ended

**Proposed fix:** More aggressive cron for completion detection

**Implementation in cron registration (ctl script, line 355-361):**
- When registering a SubTurtle's cron job, include a `--initial-interval` flag: 5m
- As the SubTurtle approaches completion (last 1-2 backlog items), the meta agent can **reschedule the cron** to fire every 1-2 min
- When a SubTurtle finishes, the meta agent immediately spawns the next one (no wait)
- Cron is rescheduled back to 5m for the new SubTurtle

**Code location:** `super_turtle/subturtle/ctl` can gain a new command:
```bash
./ctl reschedule-cron <name> <interval>
```
This updates the cron job's `interval_ms` in `cron-jobs.json`.

**Result:** SubTurtle pipeline feels continuous, not episodic.

## Concrete Implementation Plan

### Phase 1: Silent Check-ins (High impact, low effort)
**Files to change:**
- `super_turtle/claude-telegram-bot/src/handlers/commands.ts` — add `--silent` detection, suppress chat output when flag is set
- `super_turtle/subturtle/ctl` (line 356) — add `--silent` flag to the cron prompt generation
- `super_turtle/meta/META_SHARED.md` — update supervision section to document `--silent` behavior

**Steps:**
1. Parse `--silent` from the injected cron prompt
2. If `--silent` and the report is "still running, no change", do not send a message
3. If `--silent` and there's news (completion, error, stuck), send the structured message
4. Update meta agent docs

**Effort:** 2-3 hours
**Impact:** Eliminates 90% of chat noise immediately

### Phase 2: Better Status Messaging
**Files to change:**
- `super_turtle/subturtle/ctl` (line 356) — refactor prompt to include completion check + message formatting
- `super_turtle/meta/META_SHARED.md` — define message templates

**Steps:**
1. When a SubTurtle completes, format: "🎉 Finished: <name>\n[list of completed items]\n[git diff summary]"
2. When stuck, format: "⚠️ Stuck: <name>\n[last error]\n[suggestion]"
3. Update meta agent's cron supervision logic to use these templates

**Effort:** 2-3 hours
**Impact:** Chat becomes readable and actionable

### Phase 3: Task Decomposition (Medium effort)
**Files to change:**
- Root `CLAUDE.md` — add task decomposition section
- `super_turtle/meta/META_SHARED.md` — add decomposition authority and examples
- New file: `super_turtle/meta/DECOMPOSITION_PROMPT.md` — guide for breaking tasks into SubTurtles

**Steps:**
1. Define a decomposition protocol (when/how the meta agent breaks tasks)
2. Give meta agent examples: "dashboard" → search, filters, export
3. Implement in the meta agent's main loop (when user says "build X", trigger decomposition)
4. Document in CLAUDE.md

**Effort:** 4-6 hours
**Impact:** Users can now give high-level goals; system handles the breakdown

### Phase 4: Cron Optimization (Low effort, medium impact)
**Files to change:**
- `super_turtle/subturtle/ctl` (new command: `reschedule-cron`)
- `super_turtle/meta/META_SHARED.md` — add rescheduling strategy

**Steps:**
1. Add `reschedule-cron <name> <interval>` command to ctl
2. This reads the SubTurtle's cron job from cron-jobs.json, updates its `interval_ms`, and writes it back
3. Meta agent calls this when a SubTurtle is on its last few items: `./ctl reschedule-cron <name> 1m`
4. After spawning the next task, reschedule back to 5m

**Effort:** 1-2 hours
**Impact:** Removes the 5-minute idle gap between SubTurtles

### Phase 5: Status Command (Medium effort)
**Files to change:**
- `super_turtle/claude-telegram-bot/src/handlers/commands.ts` — add `handleStatus` handler
- `super_turtle/claude-telegram-bot/src/index.ts` — register `/status` command

**Steps:**
1. `/status` shows all running SubTurtles
2. For each: name, elapsed time, time remaining, current backlog item, last 3 commits, tunnel URL
3. Format as a nicely readable table

**Effort:** 2-3 hours
**Impact:** Users can check on-demand instead of waiting for cron

## Rollout Strategy

**Week 1:** Phase 1 + Phase 2 (silent checks + better messages)
- Immediate impact on chat quality
- ~5 hours work

**Week 2:** Phase 3 (task decomposition)
- Unlocks high-level user requests
- ~5 hours work

**Week 3:** Phase 4 + Phase 5 (cron optimization + status command)
- Faster pipeline + on-demand visibility
- ~4 hours work

**Post-rollout:** Monitor user feedback, iterate on decomposition strategies, consider Phase 6 (streaming progress).

## Success Metrics

- ✅ Chat should feel clean (max 1 message per SubTurtle completion, not 5+ spam)
- ✅ Users report understanding progress better
- ✅ SubTurtle completion-to-next-spawn time drops from 5m to <30s
- ✅ Users can submit high-level tasks without pre-breaking them down
- ✅ Existing SubTurtle reliability remains 100% (no regressions)

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Breaking existing cron system | Write tests for cron registration/rescheduling before deploying |
| Silent mode swallows important errors | Whitelist errors that always surface (OutOfMemory, network, etc.) |
| Task decomposition creates sprawling work | Define max 5 SubTurtles per request; queue excess work |
| Faster cron fires cause race conditions | Ensure cron prompt includes locking (don't re-enter if one is running) |

### Phase 6: Usage-Aware Resource Management (High impact)

**Problem:** The meta agent runs on Claude Code, which has tighter quotas than Codex. Every cron check-in, every status report, every conversation burns Claude Code quota. Meanwhile Codex (pro subscription) sits nearly unused. Today's session: Claude Code at 27% session / 35% weekly, Codex at 2%.

**Proposed behavior:**

1. **Default SubTurtle type: yolo-codex** — Unless the task specifically needs Claude's capabilities (complex multi-file reasoning, architecture decisions), default to Codex. The meta agent should always suggest yolo-codex first in the button options.

2. **Usage-aware mode selection:**
   | Claude Code Usage | Codex Usage | Meta Agent Behavior |
   |-------------------|-------------|---------------------|
   | <50% | <50% | Normal operations, any loop type |
   | 50-80% | <50% | Prefer yolo-codex, reduce cron frequency |
   | >80% | <50% | Force yolo-codex only, minimal check-ins, shorter responses |
   | Any | >80% | Switch to yolo (Claude) for SubTurtles, warn user |
   | >80% | >80% | Alert user, suggest pausing non-critical work |

3. **Periodic usage check** — Meta agent checks usage at session start and every ~30 minutes. Adjusts behavior automatically. No user action needed.

4. **Smart cron frequency** — When Claude Code is high, space out cron check-ins (10-15 min instead of 5). Each check-in costs a Claude Code API call.

5. **Usage in /status command** — Show quota bars alongside SubTurtle status so the user always knows resource state.

**Files to change:**
- `super_turtle/meta/META_SHARED.md` — add usage-aware behavior rules
- `super_turtle/subturtle/ctl` — change default loop type from `slow` to `yolo-codex`
- Cron prompt generation — include usage check instruction

**Effort:** 2-3 hours
**Impact:** Extends effective session duration by 2-3x by routing work to the cheaper resource

## Next Steps

1. ✅ Write this proposal (done)
2. Read team feedback (if applicable)
3. Start Phase 1 in a new SubTurtle
4. Track metrics as we deploy

---

**Author:** UX Overhaul SubTurtle
**Status:** Proposal ready for review
**Estimated total effort:** 16-20 hours
**Estimated timeline:** 3 weeks
