# Telegram Progress UX Spec

## Status

Active implementation spec.

## Purpose

Define the Telegram UX contract for one interactive foreground run.

The implementation must replace multi-bubble progress chatter with:

- one retained progress message edited in place while the run is active
- one terminal result message sent beneath it when the run ends

This contract is transport-agnostic. It must remain the same under local long polling and remote webhook delivery.

## Scope

This spec applies to user-triggered foreground runs only.

It does not redefine:

- startup boot messages
- teleport or cutover status messages
- background notifications
- generic command replies that are not part of an active foreground run

Those are separate message classes and must not reuse the retained progress message.

## Canonical Terms

- `progress message`: the single Telegram message created for a foreground run and updated with `editMessageText`
- `terminal result message`: the final Telegram message for the run; on success this is the final answer, and on failure this is the final error message
- `progress snapshot`: one retained history entry used by the `Back` / `Next` viewer
- `attention-required message`: a separate Telegram message that requires an explicit user action, such as an ask-user prompt

## Required Run Shape

Every foreground run must follow this shape:

1. Create one silent progress message as soon as the run is accepted for execution.
2. Update only that message while the run is active.
3. Leave that message in chat after the run ends.
4. Send at most one terminal result message for the run, except when a long success result must be chunked for Telegram length limits.

The progress message is mandatory for all foreground runs, including runs that later stop, fail, or produce a final artifact.

## Progress Message Lifecycle

### Creation

- The progress message must be created immediately after the run is accepted.
- Creation must be silent.
- The first render must happen before the first tool update or streamed answer preview is shown.
- If the run exits before any meaningful work occurs, the progress message must still be created and then updated to the terminal state.

### Updates

- The progress message must be updated only through message edits.
- Streaming text, tool activity, heartbeat updates, and stop-state transitions must not create new Telegram messages.
- The message should update when the canonical state changes or when the visible summary meaningfully changes.
- Token-level streaming must be coalesced into summary updates rather than mirrored literally.

### Retention

- The progress message must remain in chat after success, stop, and failure.
- The retained message becomes the viewer for progress snapshots.
- The retained message must never be auto-deleted.

## Canonical Progress States

The renderer must use this state vocabulary:

- `Starting`: run accepted, waiting for first meaningful step
- `Thinking`: model is working without an active tool call
- `Using tools`: one or more tools are currently running
- `Writing answer`: final user-facing response is being composed
- `Still working`: no meaningful visible change for the quiet-period threshold
- `Stopping`: user stop requested, cancellation still in progress
- `Stopped`: run ended because of a user stop request
- `Done`: run completed successfully
- `Failed`: run ended with an error

No other top-level state labels should be introduced in the first implementation.

## Render Contract

The progress message must render these sections in order:

1. State line
2. Summary line or short paragraph
3. Footer metadata line
4. Optional history controls after completion

Required content rules:

- The state line must use exactly one canonical state label.
- The summary must contain the latest concise user-meaningful update.
- The footer must include elapsed time.
- The footer may include one short tool hint when useful.
- The full message should stay glanceable and should target roughly 3 to 6 short lines.

The renderer must prefer concise summaries such as:

- current step description
- current tool name
- short answer preview
- stop or failure reason

The renderer must not:

- dump raw streaming tokens
- dump every tool event verbatim
- turn the progress message into a log transcript

## Heartbeat Policy

`Still working` is required as an in-place progress state.

Behavior:

- Enter `Still working` only after 20 seconds with no meaningful visible update.
- While the run stays quiet, refresh the heartbeat at most once every 30 seconds.
- Include elapsed time in the footer while in `Still working`.
- Replace `Still working` immediately when a new meaningful update arrives.

Heartbeat updates must never create a new Telegram message and must never notify.

## Progress Snapshot History

The retained viewer must page through a bounded ordered list of progress snapshots.

### Required snapshot events

Store a snapshot when any of the following happens:

- initial `Starting` render
- canonical state transition
- tool start
- tool completion
- first visible answer preview
- heartbeat transition into `Still working`
- terminal transition to `Stopped`, `Done`, or `Failed`

### Deduping rules

Do not store a new snapshot when all of the following are unchanged from the previous snapshot:

- canonical state
- summary text
- tool label

Elapsed time alone must not create a new snapshot.

### Retention limit

- Retain at most 12 snapshots per run.
- When the limit is exceeded, drop the oldest non-terminal snapshots first.
- The terminal snapshot must always be retained.

### Navigation contract

After the run ends, the retained progress message must expose inline `Back` and `Next` buttons when more than one snapshot exists.

Minimum viewer requirements:

- default to the terminal snapshot after completion
- show the selected snapshot content in the progress message body
- show a page indicator in the footer in `N / M` form
- disable or omit `Back` on the first snapshot
- disable or omit `Next` on the last snapshot

## Delivery Contract

The implementation must classify foreground output into these intents:

- `progress_update`
- `progress_heartbeat`
- `progress_stop_state`
- `final_success`
- `final_error`
- `attention_required`
- `final_artifact`

Required delivery mapping:

- `progress_update` -> edit existing progress message only
- `progress_heartbeat` -> edit existing progress message only
- `progress_stop_state` -> edit existing progress message only
- `final_success` -> send a new terminal result message; notify
- `final_error` -> send a new terminal result message; notify
- `attention_required` -> send a separate message; notify
- `final_artifact` -> send a new terminal result message; notify

`background_notification`, `system_notification`, and unrelated `command_reply` delivery remain outside this foreground contract.

## Terminal Outcome Rules

### Success

- Update the progress message to `Done`.
- Leave the retained progress message in chat.
- Send one terminal result message beneath it.
- If the success result exceeds Telegram length limits, chunk it and notify only on the last chunk.

### User stop

- On stop request, update the progress message to `Stopping`.
- When cancellation resolves, update it to `Stopped`.
- Do not send a terminal result message for a normal user-initiated stop.
- If stop handling itself fails, treat the run as `Failed` and send a terminal result message.

### Failure

- Update the progress message to `Failed`.
- Always send one terminal result message describing the failure.
- Failure must notify.

## Special-Case Precedence

When multiple cases apply in one run, use this precedence order:

1. `attention_required`
2. `final_artifact`
3. `final_success`
4. `final_error`

Interpretation:

- If the run needs user input, send an `attention_required` message immediately and keep the progress message as context.
- If the final result is an artifact such as an image or sticker, send that artifact as the terminal result message even if text output was also generated.
- If the run fails before a final artifact or success result is sent, send `final_error`.

## Special Cases

### Ask-user prompts and inline choices

- These must be sent as separate `attention_required` messages.
- They must notify.
- The progress message should stay visible and provide the latest context.
- While waiting for the user, the progress message should stay in its most recent non-terminal state and must not switch to `Done` or `Stopped`.

### Final artifacts

- Do not try to serialize binary or media output into the text progress message.
- Use the progress summary to describe the artifact being prepared or sent.
- Send the artifact itself as the terminal result message.
- Update the progress message to `Done` after the artifact send succeeds.

### Long final answers

- Keep the retained progress message unchanged once the run reaches `Done`.
- Send the final answer in chunks only when required by Telegram limits.
- Only the last success chunk may notify.

### Tool-heavy runs

- Summarize tool activity into concise state and summary updates.
- Show the active tool name only when it improves comprehension.
- Do not mirror every tool event into the progress message.

### Restart and recovery

- If the process can recover the active run and progress message id, it must resume editing the same progress message.
- Recovery must preserve the one-progress-message plus one-terminal-result shape.
- If recovery cannot resume safely, update the existing progress message to `Failed` when possible and send a terminal result message on the next recovered control path.

## Minimum Run State

The runtime state for a foreground run must track:

- chat id
- run id
- progress message id
- current canonical state
- current rendered summary text
- optional current tool label
- run start timestamp
- retained progress snapshots
- selected history index after completion
- terminal outcome metadata
- optional terminal result message id or ids for long-answer chunking

## Non-Goals

This UX is not intended to:

- preserve every streamed token for replay
- replace logs or traces
- fold system notifications into the progress message
- eliminate separate attention-required prompts

## Acceptance Criteria

The implementation is correct when all of the following are true:

- every foreground run creates exactly one silent progress message
- active-run updates are edits, not new progress bubbles
- normal success produces one retained progress message plus one notifying terminal result message
- user stop retains the progress message and does not emit a second terminal bubble unless stop handling fails
- failures retain the progress message and always emit one notifying terminal result message
- the retained viewer supports bounded `Back` / `Next` navigation with a page indicator
- the user-visible behavior is unchanged across local polling and webhook transport
