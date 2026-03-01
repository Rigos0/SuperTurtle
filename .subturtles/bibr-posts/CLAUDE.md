## Current Task
All backlog items complete. Finalize loop control state.

## End Goal with Specs
- Users can create new posts via the existing Form component
- Posts appear in the feed instantly (Convex reactive queries)
- Text-only and image-URL posts supported
- Users can delete their own posts (three-dot menu or delete button)
- All mutations push to Convex cloud and work with existing `listPosts` query

## Backlog
- [x] Create `createPost` mutation in `linkedin-demo/src/convex/posts.ts`: args = { authorId: v.id("users"), description: v.string(), fileType: v.optional(v.string()), fileData: v.optional(v.string()) }. Sets createdAt = Date.now(), likesCount = 0, commentsCount = 0. Returns the new post ID.
- [x] Create `deletePost` mutation in `linkedin-demo/src/convex/posts.ts`: args = { postId: v.id("posts") }. Deletes the post by ID. (No auth check for now — will add when auth milestone ships.)
- [x] Wire Form component (`linkedin-demo/src/components/form/Form.js`): import `useMutation` from "convex/react" and `api` from "../../convex/_generated/api". On submit, call `createPost` with the hardcoded Tadeáš user ID from the seed data (for now — auth will replace this). On success, reset the form. Replace the current `swal("Demo Mode"...)` with the actual mutation call. For image URL posts, pass fileType "image" and fileData as the URL string.
- [x] To get Tadeáš's user ID for the Form, add a `useConvexUser` import and pass the featured user's `_id` as `authorId`. Read `linkedin-demo/src/hooks/useConvexUser.js` to understand the existing hook — it returns the featured user object which has `_id`.
- [x] Run `cd linkedin-demo && npx convex dev --once` to push the new mutations
- [x] Run `cd linkedin-demo && npm run build` to verify build succeeds
- [x] Commit with message "Add createPost/deletePost mutations and wire Form to Convex"

## Notes
- All Convex function files are in `linkedin-demo/src/convex/` (NOT `linkedin-demo/convex/`)
- Existing `posts.ts` already has `listPosts` query — add mutations to the same file
- Import `{ mutation }` from "./_generated/server" (already has `{ query }`)
- Import `{ v }` from "convex/values" (already imported)
- The Form component is at `linkedin-demo/src/components/form/Form.js`
- The Form already has full UI: text input, image upload, URL paste, submit button
- Currently Form shows `swal("Demo Mode", "Posting is disabled in this demo build.", "info")` — replace this with the real mutation
- For the featured user ID: use `useConvexUser()` hook which returns the user with `isFeatured: true`. Access `._id` for the authorId.
- Run all npm/convex commands from the `linkedin-demo/` directory

## Loop Control
STOP
