## Current Task
Test reaction flow: create post, add/change/remove reactions, and verify per-type counts update correctly.

## End Goal with Specs
Items 19-20 from Phase 2: Full reaction system (👍 Like, ❤️ Love, 🎉 Celebrate, 💡 Insightful, 😂 Funny).
- Reaction picker appears on hover/long-press of the Like button
- Clicking a reaction calls `api.likes.setReaction` mutation
- Clicking same reaction again removes it via `api.likes.removeReaction`
- Reaction counts per type shown on post (icon row with counts)
- Hover on reaction summary shows breakdown tooltip

## Backlog
- [x] Read existing reaction code: `linkedin-demo/src/convex/likes.ts` (setReaction, removeReaction), `linkedin-demo/src/components/posts/post/Post.js` (REACTION_ITEMS, Reactions component, handleReactionSelect)
- [x] Wire reaction picker UI — show REACTION_ITEMS on hover/long-press of Like button area in Post.js
- [x] Connect picker to applyReaction() which calls setReaction/removeReaction mutations
- [x] Show per-type reaction counts below post (icon stack + total already partially exists in Reactions component)
- [ ] Test: create post, add reaction, change reaction, remove reaction, verify counts update <- current
- [x] Commit

## Progress Notes
- Implemented in `linkedin-demo/src/components/posts/post/Post.js` and `linkedin-demo/src/components/posts/post/Style.js`.
- Added hover and long-press reaction picker behavior, wired picker selections to `applyReaction`, and improved optimistic per-type count updates for reaction changes.
- Verification run: `npm run build` passed. `CI=true npm test -- --watch=false` failed on existing `src/App.test.js` auth-button expectation, unrelated to reactions flow.

## Notes
- Mutations already exist: `api.likes.setReaction`, `api.likes.removeReaction`
- Post.js already has `REACTION_ITEMS` array, `handleReactionSelect`, `isReactionPickerOpen` state, and a `Reactions` display component
- The `isReactionPickerOpen` and `handleReactionSelect` have eslint-disable comments — remove those when wiring them up
- File: `linkedin-demo/src/components/posts/post/Post.js`
- Style: `linkedin-demo/src/components/posts/post/Style.js`
