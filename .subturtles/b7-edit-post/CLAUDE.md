## Current Task
All backlog items complete.

## End Goal with Specs
- Users can edit their own posts (description text only — not media)
- The existing ⋯ menu (MoreHorizOutlinedIcon) on own posts adds an "Edit" option above "Delete"
- Clicking "Edit" switches the post description to a textarea (inline edit mode)
- Save/Cancel buttons appear below the textarea
- Save calls `updatePost` mutation, cancel restores original text
- Green accent on Save button (#2e7d32)
- Build passes: `npm run build`

## Backlog
- [x] Add `updatePost` mutation to `linkedin-demo/src/convex/posts.ts`: args { postId: v.id("posts"), description: v.string() }. Patches the post's description field. No auth check needed (demo app).
- [x] Add edit state to `linkedin-demo/src/components/posts/post/Post.js`: Add useState for `isEditing` (false) and `editText` (description). Add `handleEditClick` that sets isEditing=true, editText=description, and closes menu. Add `handleEditSave` that calls updatePost({ postId, description: editText.trim() }) then sets isEditing=false. Add `handleEditCancel` that resets editText to description and sets isEditing=false.
- [x] Add "Edit" MenuItem to the Menu in Post.js: Add `{isOwnPost && <MenuItem onClick={handleEditClick}>Edit</MenuItem>}` BEFORE the Delete MenuItem. Import `useMutation` for `api.posts.updatePost`.
- [x] Replace description display with conditional edit UI in Post.js: In the `body__description` div, if `isEditing` render a `<textarea>` with value={editText}, onChange, rows=3, style width 100%. Below it, render Save button (green bg #2e7d32, white text) and Cancel button (grey outline). Else render the normal `<p>{description}</p>`.
- [x] Add edit styles to `linkedin-demo/src/components/posts/post/Style.js`: editTextarea class (width 100%, padding 8px, border 1px solid #ddd, borderRadius 4px, resize vertical, fontFamily inherit, fontSize 14px). editActions class (display flex, gap 8px, marginTop 8px). saveButton (backgroundColor #2e7d32, color white, border none, padding 6px 16px, borderRadius 4px, cursor pointer, fontWeight 600). cancelButton (backgroundColor transparent, border 1px solid #999, padding 6px 16px, borderRadius 4px, cursor pointer).
- [x] Push: `cd linkedin-demo && npx convex dev --once`
- [x] Build: `cd linkedin-demo && npm run build`
- [x] Commit: "Add edit post: inline editing for own posts with updatePost mutation"

## Notes
- All paths from repo root: `/Users/Richard.Mladek/Documents/projects/agentic/`
- Run npm/convex commands from `linkedin-demo/`
- Post.js at `linkedin-demo/src/components/posts/post/Post.js`
- Post Style.js at `linkedin-demo/src/components/posts/post/Style.js`
- posts.ts at `linkedin-demo/src/convex/posts.ts` — already has createPost, deletePost, listPosts, searchPosts
- The ⋯ menu is at line ~182 in Post.js: `<Menu anchorEl={menuAnchorEl} ...>` with `{isOwnPost && <MenuItem onClick={handleDeleteClick}>Delete</MenuItem>}`
- `isOwnPost` is already computed: `const isOwnPost = Boolean(authorId && user?._id && authorId === user._id);`
- The `useMutation` import is already present; just add `const updatePost = useMutation(api.posts.updatePost);`
- Green colors: primary #2e7d32, light #66bb6a

## Loop Control
STOP
