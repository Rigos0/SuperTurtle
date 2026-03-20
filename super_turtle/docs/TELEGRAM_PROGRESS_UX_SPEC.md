# Telegram Progress UX Spec

## Status

Draft product and implementation spec.

Primary goal: improve Telegram UX for foreground runs by replacing many progress messages with one retained progress message plus one final answer message.

## Audit Findings

This draft is not yet implementation-ready. The sections below still need concrete decisions or normative language before engineering work should start:

- `Foreground Run Model` and `Open Design Questions` do not define whether the first progress message appears immediately or after a delay, so the initial UX timing remains undecided.
- `Progress Message Content`, `Message Types`, and `Decision Summary` describe example states, but they do not define a canonical state vocabulary or exact rendering contract for each state.
- `Notification Policy` and `Open Design Questions` leave stop/error completion behavior partially open, including whether stopped runs keep the retained progress message and when failures require a separate terminal bubble.
- `Progress History Model`, `Data Model Requirements`, and `Navigation UX` describe bounded history conceptually, but they do not define the default retention limit, snapshot deduping rules, or the minimum paging metadata.
- `Special Cases` and `Delivery Policy` describe desired outcomes for prompts, artifacts, long answers, and restart recovery, but they do not define precedence when multiple cases apply in one run.
- transport ownership and webhook cutover are described elsewhere, so this spec still needs one explicit statement that foreground progress UX must stay the same under local polling and remote webhook delivery.

## Problem

The current foreground UX can create a wall of Telegram messages during one answer:

- streamed text can span multiple visible messages
- tool/thinking updates can create separate progress messages
- heartbeat or restart/status messages can add more noise

This creates two user-facing problems:

1. when the user leaves Telegram, they can still get a noisy sequence of notifications
2. the chat becomes harder to scan because one answer can occupy many bubbles

At the same time, observability remains important. The user must still be able to tell:

- work is happening
- the bot is not stalled
- the run used tools or took meaningful steps
- the final answer is available

## UX Summary

Each foreground run should use:

- one progress message that is edited in place while work is happening
- one final answer message sent beneath it when the run completes

The progress message should remain in chat after completion so the user can inspect it later.

The final answer should be the only terminal message that notifies for a normal successful run.

## Core UX Goals

- avoid spamming the user with a wall of progress messages
- preserve confidence that the bot is still working
- keep the final answer easy to find
- keep progress inspectable after the run ends
- make the UX resilient to special cases like images, stickers, tool prompts, and long answers

## Transport Boundary

This spec defines the user-visible contract for one interactive foreground run.

It must stay the same whether Telegram updates are being delivered by:

- local long polling
- a remote webhook runtime after `/teleport`

Transport ownership, webhook registration, liveness or readiness checks, and `/teleport` or `/home` cutover behavior are runtime concerns defined in the transport specs.

Those runtime concerns must not change the foreground UX contract:

- one retained progress message for the run
- one final result message beneath it
- progress updates remain non-notifying edits

Startup boot messages, background notifications, and other system-status messages are separate concerns. They must not reuse the retained progress message or replace the final result message for a foreground run.

## Foreground Run Model

### Progress Message

Each user-triggered foreground run creates one progress message.

This message is the single place where ongoing activity is shown:

- initial acknowledgement
- thinking summary
- tool activity summary
- partial response preview
- "still working" heartbeat
- stopping / cancelled state
- terminal status summary for completed runs

The progress message must be updated with `editMessageText` rather than by sending new messages.

### Final Answer Message

When the run completes successfully:

- the progress message is left in chat
- one final answer message is sent underneath it
- this final answer message is the main user-facing result
- this is the message that should notify

This gives the user:

- one durable observability surface
- one clear final answer surface

## Progress Message Content

The progress message should show a concise summary, not a raw full transcript.

Recommended structure:

1. header with current state
2. short progress body
3. metadata/footer
4. inline navigation buttons when history exists

Example sections:

- state: `Thinking`, `Using tools`, `Writing answer`, `Still working`, `Stopping`, `Done`
- progress summary: most recent useful status text or a compact summary of the latest step
- elapsed time: `23s`
- driver/tool hints when useful

The progress message should be optimized for glanceability, not completeness.

## Retained Progress History

Once the run is done, the progress message remains visible and becomes a lightweight viewer for the run history.

This retained message should support inline buttons:

- `Back`
- `Next`

Purpose:

- let the user inspect the progress timeline after the run
- avoid flooding the chat with all intermediate states
- preserve observability after completion

## Progress History Model

The progress message should not store every token-level update.

Instead it should store a bounded list of meaningful snapshots, for example:

- initial start
- tool start / tool completion
- significant text milestones
- heartbeat updates only if useful
- stop / error / done state

The retained `Back` / `Next` viewer should page through those meaningful snapshots.

This is a UX requirement, not a raw logging requirement.

The progress history should be concise enough that paging is helpful and not tedious.

## Notification Policy

### Normal foreground success

- progress message creation: silent
- progress message edits: no new notification
- final answer message: notify

### Still working heartbeat

- represented as an edit to the progress message
- should not create a new Telegram message
- should not notify

### User stop

If the user stops an in-flight run:

- update the progress message to `Stopping...`
- once the stop resolves, update it to `Stopped`
- do not send an extra notifying completion message by default

The main point is to avoid a second terminal bubble for a user-initiated stop unless there is a failure.

### Error

If the run fails:

- update the progress message to reflect failure
- send one final error/result message if the failure needs prominent user attention

Fatal failures should notify.

## Still Working Indicator

The "still working" concept should remain in the new UX.

Reason:

- it reassures the user that the bot is alive
- it reduces perceived stalling
- it preserves observability without generating more chat bubbles

However, it should become an in-place state of the progress message rather than a separate message.

Recommended behavior:

- do not show it immediately
- only show it after a quiet threshold
- include elapsed time
- clear or replace it as soon as meaningful new progress appears

Example:

`Still working... 28s`

This should be treated as a confidence signal, not as core content.

## Special Cases

Special cases are the main reason this needs a deliberate design instead of a quick refactor.

### Images and Stickers

Image and sticker outputs may be:

- intermediate artifacts
- final artifacts
- side effects requested by tools

Policy:

- do not force these into the text progress message
- use the progress message to describe what is happening
- if the artifact is the final answer, send it as the final result beneath the progress message

If an image or sticker is part of the final answer, it should behave like the terminal result and may notify.

### Ask User / Inline Choice Prompts

These require explicit user attention and should remain separate Telegram messages.

Policy:

- progress message stays as context
- the prompt is sent as a separate interactive message
- the prompt should notify because it requires action

### Long Final Answers

Telegram length limits still apply.

Policy:

- the retained progress message remains unchanged
- the final answer may still need chunking
- if chunking is required, only the last chunk should notify

### Tool Noise

Tool activity should usually be summarized rather than mirrored literally.

The progress message should prefer:

- concise tool labels
- current step summaries
- meaningful state changes

It should avoid dumping every tool event verbatim unless the tool status is itself important UX.

### Restart / Recovery

If the process restarts mid-run, the UX should aim to preserve confidence rather than perfect continuity.

Desired behavior:

- if recoverable, reconnect to the progress message and continue updating it
- transport cutover or runtime recovery must not change the retained-progress plus final-result shape seen by the user
- otherwise, produce a clear terminal state and let the next run start fresh

## Message Types

The implementation should distinguish at least these intents:

- `progress_update`
- `progress_heartbeat`
- `progress_stop_state`
- `final_success`
- `final_error`
- `attention_required`
- `final_artifact`
- `command_reply`
- `background_notification`
- `system_notification`

This intent layer should drive delivery policy.

## Delivery Policy

Recommended delivery modes:

- `edit_only`
- `send_silent`
- `send_notify`
- `send_notify_last_chunk_only`

Mapping:

- `progress_update` -> `edit_only`
- `progress_heartbeat` -> `edit_only`
- `progress_stop_state` -> `edit_only`
- `final_success` -> `send_notify`
- `final_error` -> `send_notify`
- `attention_required` -> `send_notify`
- `final_artifact` -> `send_notify`

`background_notification` and `system_notification` remain separate concerns and should not be forced through the foreground progress model. Boot or cutover status messages belong to `system_notification`, not to foreground progress state.

## Data Model Requirements

The foreground run state should support:

- one current progress message id
- current progress state
- bounded history of progress snapshots
- final outcome metadata
- linkage between the retained progress message and the final answer message

Suggested progress snapshot fields:

- timestamp
- state
- short text summary
- optional tool label
- optional elapsed time

## Navigation UX

After completion, the retained progress message should expose inline navigation:

- `Back`
- `Next`

Minimum requirement:

- browse a bounded ordered list of progress snapshots

Nice-to-have later:

- page indicator like `3 / 8`
- jump-to-start or jump-to-end controls

The first version should keep the interaction minimal.

## Non-Goals

This UX is not trying to:

- preserve every streamed token for chat replay
- turn the progress message into a full log viewer
- remove all special-case result messages
- replace separate attention-required prompts

## Implementation Direction

Recommended implementation shape:

1. define the intent taxonomy and delivery policy
2. introduce a dedicated progress-message controller
3. route foreground streaming updates through that controller
4. keep final result sending separate from progress rendering
5. handle artifacts and prompts as explicit special cases
6. add retained snapshot browsing after the base controller works

This should be treated as a UX-driven refactor, not as a small patch to the current streaming file.

## Open Design Questions

- should the initial progress message appear immediately or only after a short delay?
- should the final progress state say `Done` or something more descriptive?
- should a user-initiated stop leave the retained progress message in chat or auto-delete it after a short delay?
- how many progress snapshots should be retained by default?

## Decision Summary

The intended foreground UX is:

- one progress message edited in place during work
- the progress message remains after completion
- that retained message supports `Back` / `Next` inspection
- one final answer message appears underneath it
- the final answer is the message that notifies
- "still working" remains, but only as an in-place progress state
