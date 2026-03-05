## Current Task
Verify whether `cleanupToolMessages()` deletes messages that should persist (e.g. ask-user prompt).

## End Goal with Specs
Create `.subturtles/review-text-retry/review-notes.md` with ranked findings about retry safety, ask-user prompt preservation, cleanup side effects, and interaction with streaming state.

## Backlog
- [x] Inspect `handleText()` error/retry flow and compare old vs new cleanup behavior
- [ ] Verify whether `cleanupToolMessages()` deletes messages that should persist (e.g. ask-user prompt) <- current
- [ ] Check idempotency across repeated retries and stale sessions
- [ ] Write findings with file/line references in `review-notes.md`
- [ ] Commit review notes

## Notes
Review-only task focused on correctness and UX regressions.
