# Review Checklist: Conductor Restart, Recovery, and Stale Cleanup

Date: 2026-03-08
Scope: durable conductor state recovery, wakeup reconciliation, stale cron cleanup, mid-chat inbox delivery, and multi-worker orchestration.

This document is a review prep artifact. It maps the concrete code and test seams for the audit; it does not record findings yet.

## Checklist

1. Restart and recovery reconstruction
- Verify the canonical store can reconstruct workers, wakeups, and derived views from disk alone after a bot restart.
- Verify pending terminal wakeups replay idempotently and do not require chat/session memory.
- Verify bot restart paths reset driver sessions without losing durable conductor inbox items.
- Primary files: `super_turtle/state/conductor_state.py:102`, `super_turtle/subturtle/__main__.py:374`, `super_turtle/claude-telegram-bot/src/conductor-supervisor.ts:757`, `super_turtle/claude-telegram-bot/src/index.ts:474`, `super_turtle/claude-telegram-bot/src/index.ts:823`.

2. Stale cron cleanup and terminal cleanup verification
- Verify terminal wakeups remove recurring supervision cron exactly once when the cron job still exists.
- Verify cleanup verification only happens after the worker is no longer running and does not regress archived terminal states.
- Verify the fallback stale-cron cleanup in the bot timer cannot produce duplicate or misleading notifications.
- Primary files: `super_turtle/subturtle/ctl:806`, `super_turtle/subturtle/ctl:1155`, `super_turtle/subturtle/ctl:1289`, `super_turtle/claude-telegram-bot/src/conductor-supervisor.ts:782`, `super_turtle/claude-telegram-bot/src/index.ts:554`.

3. Mid-chat completion and durable inbox delivery
- Verify lifecycle wakeups become durable inbox items before, during, and after Telegram delivery.
- Verify interactive Claude and Codex turns inject pending inbox items and only acknowledge them on successful turns.
- Verify non-interactive sources never consume inbox items prematurely.
- Primary files: `super_turtle/claude-telegram-bot/src/conductor-supervisor.ts:322`, `super_turtle/claude-telegram-bot/src/conductor-supervisor.ts:397`, `super_turtle/claude-telegram-bot/src/conductor-inbox.ts:149`, `super_turtle/claude-telegram-bot/src/conductor-inbox.ts:153`, `super_turtle/claude-telegram-bot/src/conductor-inbox.ts:167`, `super_turtle/claude-telegram-bot/src/conductor-inbox.ts:238`, `super_turtle/claude-telegram-bot/src/session.ts:1013`.

4. Multi-worker ordering and isolation
- Verify multiple pending wakeups are processed in deterministic order and remain isolated by worker/run/chat.
- Verify one worker's terminal reconciliation or inbox acknowledgment cannot consume another worker's state.
- Verify derived handoff/rendered state remains a view over canonical records and filters stale workspaces correctly.
- Primary files: `super_turtle/claude-telegram-bot/src/conductor-supervisor.ts:158`, `super_turtle/claude-telegram-bot/src/conductor-supervisor.ts:769`, `super_turtle/claude-telegram-bot/src/conductor-inbox.ts:167`, `super_turtle/state/run_state_writer.py:206`.

## Source Map

### Canonical durable state
- `super_turtle/state/conductor_state.py:102`
  Creates `.superturtle/state/` layout and the canonical `events.jsonl`, `workers/`, and `wakeups/` paths.
- `super_turtle/state/conductor_state.py:126`
  Defines `ConductorStateStore`, including worker-state, event-log, and wakeup read/write APIs used by both Python worker code and the bot supervisor.
- `super_turtle/state/run_state_writer.py:206`
  Re-renders `handoff.md` from canonical worker state and pending wakeups, filtering out missing workspaces.

### Worker-side event producers
- `super_turtle/subturtle/__main__.py:374`
  Records `worker.completion_requested`, transitions the worker to `completion_pending`, and enqueues a notable wakeup.
- `super_turtle/subturtle/__main__.py:449`
  Records checkpoints and refreshes canonical worker state during normal progress.
- `super_turtle/subturtle/__main__.py:513`
  Records `worker.fatal_error`, transitions the worker to `failure_pending`, and enqueues a critical wakeup.

### Supervisor-side lifecycle producers
- `super_turtle/subturtle/ctl:158`
  Shell wrapper for appending canonical worker events.
- `super_turtle/subturtle/ctl:217`
  Shell wrapper for writing canonical worker state from runtime metadata.
- `super_turtle/subturtle/ctl:307`
  Shell wrapper for enqueueing conductor wakeups.
- `super_turtle/subturtle/ctl:806`
  Watchdog timeout path emitting `worker.timed_out`, updating worker state, and enqueueing a timeout wakeup.
- `super_turtle/subturtle/ctl:832`
  Spawn path marking the worker as started/running in conductor state.
- `super_turtle/subturtle/ctl:920`
  Structured recurring supervision cron registration with `job_kind`, `worker_name`, and `supervision_mode`.
- `super_turtle/subturtle/ctl:1155`
  Stop path removing cron, updating stop state, and reconciling stopped/killed/not-running outcomes.
- `super_turtle/subturtle/ctl:1289`
  Archive path transitioning durable state to `archived`.

### Bot-side consumers and restart integration
- `super_turtle/claude-telegram-bot/src/conductor-supervisor.ts:573`
  Deterministic silent supervision path, including milestone and stuck wakeup creation.
- `super_turtle/claude-telegram-bot/src/conductor-supervisor.ts:757`
  Terminal wakeup reconciliation, cron removal, cleanup verification, terminal-state resolution, inbox enqueue, and Telegram delivery.
- `super_turtle/claude-telegram-bot/src/conductor-inbox.ts:149`
  Prevents background/cron sources from consuming durable inbox items.
- `super_turtle/claude-telegram-bot/src/conductor-inbox.ts:153`
  Idempotent inbox item creation from wakeup reconciliation.
- `super_turtle/claude-telegram-bot/src/conductor-inbox.ts:167`
  Pending inbox listing and per-chat filtering.
- `super_turtle/claude-telegram-bot/src/conductor-inbox.ts:238`
  Durable acknowledgment on successful interactive turns.
- `super_turtle/claude-telegram-bot/src/index.ts:169`
  Resolves structured SubTurtle cron targets, with legacy prompt parsing as fallback.
- `super_turtle/claude-telegram-bot/src/index.ts:208`
  Refreshes the conductor-rendered handoff after reconciliation.
- `super_turtle/claude-telegram-bot/src/index.ts:474`
  Bot timer entry point for wakeup reconciliation on every cron tick.
- `super_turtle/claude-telegram-bot/src/index.ts:527`
  Bot timer entry point for deterministic silent supervision.
- `super_turtle/claude-telegram-bot/src/index.ts:554`
  Fallback stale recurring-cron removal when the worker is already dead after supervision.
- `super_turtle/claude-telegram-bot/src/index.ts:823`
  Bot restart handling, including session reset/auto-resume behavior after process restart.
- `super_turtle/claude-telegram-bot/src/session.ts:1013`
  Claude interactive-turn success path acknowledging pending inbox items.

## Existing Automated Coverage

### Durable state primitives
- `super_turtle/state/test_conductor_state.py:16`
  Verifies conductor state directory creation and store round-trips.
- `super_turtle/state/test_conductor_state.py:64`
  Verifies event log appends.
- `super_turtle/state/test_conductor_state.py:89`
  Verifies wakeup creation and delivery-state updates.
- `super_turtle/state/test_run_state_writer.py:72`
  Verifies `handoff.md` is rendered from canonical state and ignores missing workspaces.
- `super_turtle/state/test_run_state_writer.py:199`
  Smoke-tests conductor CLI commands used by `ctl`.

### Worker-side producers
- `super_turtle/subturtle/tests/test_subturtle_main.py:85`
  Covers completion-pending event/state/wakeup emission.
- `super_turtle/subturtle/tests/test_subturtle_main.py:124`
  Covers checkpoint event/state refresh.
- `super_turtle/subturtle/tests/test_subturtle_main.py:166`
  Covers fatal-error transition to `failure_pending` plus critical wakeup.

### Supervisor reconciliation and inbox delivery
- `super_turtle/claude-telegram-bot/src/conductor-supervisor.test.ts:57`
  Covers completion wakeup reconciliation from canonical state, including cron removal and cleanup verification.
- `super_turtle/claude-telegram-bot/src/conductor-supervisor.test.ts:159`
  Covers fatal wakeup reconciliation into `failed`.
- `super_turtle/claude-telegram-bot/src/conductor-supervisor.test.ts:251`
  Covers multi-worker inbox persistence across recovery until interactive acknowledgment.
- `super_turtle/claude-telegram-bot/src/conductor-supervisor.test.ts:402`
  Covers milestone wakeups without terminal cleanup side effects.
- `super_turtle/claude-telegram-bot/src/conductor-supervisor.test.ts:534`
  Covers stuck wakeups after repeated no-progress checks.
- `super_turtle/claude-telegram-bot/src/session.conductor-inbox.test.ts:75`
  Covers Claude interactive delivery and acknowledgment of pending inbox items.
- `super_turtle/claude-telegram-bot/src/session.conductor-inbox.test.ts:152`
  Covers Claude failure path leaving inbox items pending.
- `super_turtle/claude-telegram-bot/src/codex-session.conductor-inbox.test.ts:68`
  Covers Codex interactive delivery and acknowledgment of pending inbox items.

## Audit Notes For Next Pass

- The highest-value code to inspect first is `processPendingConductorWakeups()` plus the bot timer around it, because that is where restart recovery, cleanup verification, cron removal, inbox creation, and Telegram notification behavior converge.
- The main residual review question is not whether the conductor primitives exist; it is whether recovery stays correct when bot startup state, recurring cron state, and pending inbox items are partially out of sync on disk.
