# Current task
Continue triaging unrelated full-suite test failures blocking final verification of the streaming lastNotifiableOutput fix; stop-handler/session contamination is fixed, next isolate the remaining SubTurtle/dashboard and notification failures.

# End goal with specs
In `streaming.ts`, `setLastNotifiableOutput()` is called by both text segment_end (line 1448, with `replaceExisting: true`) and media side effects (send_turtle line 270, send_image lines 373/403, without `replaceExisting`). If a media tool fires AFTER the last text segment_end, it overwrites `state.lastNotifiableOutput`. When `promoteFinalSegmentNotification()` runs on `done` (line 1456), it promotes the media message instead of the actual text answer.

Fix: Add a `hasTextSegmentOutput` boolean to `StreamingState`. Set it to `true` in segment_end when text content exists. Guard the media `setLastNotifiableOutput` calls: skip if `hasTextSegmentOutput` is already true. This way text always wins as the notifiable output, but media-only responses still work.

Acceptance criteria:
- Text segment_end sets lastNotifiableOutput → subsequent send_image/send_turtle does NOT overwrite it
- When ONLY media is sent (no text segments), media is still correctly promoted
- Add test: text segment → send_image → done → lastNotifiableOutput is still the text
- All existing tests pass: `cd super_turtle/claude-telegram-bot && bun test`

# Roadmap (Completed)
- (none yet)

# Roadmap (Upcoming)
- Fix media overwriting final text notification

# Backlog
- [x] Read `src/handlers/streaming.ts` — focus on `setLastNotifiableOutput`, `StreamingState`, all call sites
- [x] Add `hasTextSegmentOutput` boolean flag to StreamingState class (default false)
- [x] Set `hasTextSegmentOutput = true` in segment_end handler when text content exists (around line 1448)
- [x] Guard media `setLastNotifiableOutput` calls at lines 270, 293, 373, 403, 429: skip if `hasTextSegmentOutput` is true
- [x] Add test: text segment then media → lastNotifiableOutput is text, not media
- [x] Add test: media only (no text) → lastNotifiableOutput is the media
- [x] Run focused streaming tests (`cd super_turtle/claude-telegram-bot && bun test src/handlers/streaming.test.ts`)
- [ ] Triage unrelated `bun test` failures outside `streaming.ts` so global verification is meaningful <- current
- [ ] Re-run all tests (`cd super_turtle/claude-telegram-bot && bun test`) after the baseline is green
- [x] Commit with descriptive message

Note: `bun test src/handlers/streaming.test.ts` passes. The full `bun test` run currently fails in unrelated areas including `src/dashboard.test.ts`, `src/session.conductor-inbox.test.ts`, `src/handlers/stop.test.ts`, and multiple SubTurtle board tests.
Progress: fixed cross-test `../session` contamination from `src/handlers/text.remote.test.ts`, which cleared the `src/handlers/stop.test.ts` cluster. Latest full run: 15 failures remain in `src/dashboard.test.ts`, `src/handlers/commands.subturtle.test.ts`, `src/handlers/callback.subturtle.test.ts`, `src/handlers/streaming.notifications.test.ts`, `src/handlers/pending-media-request-locking.test.ts`, and `src/handlers/voice.typing.test.ts`.
