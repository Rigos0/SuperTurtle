## Current Task
Run `cd linkedin-demo && npx convex dev --once` to push schema.

## End Goal with Specs
Item 32 from Phase 2: Long-form article posts with rich text editing and dedicated article view page.
- "Write article" button in post composer area
- Article editor: title field + rich text body (use a textarea with basic formatting for now)
- Articles stored as posts with type="article" and extra fields (title, body)
- Full-page article view at `/article/:id`
- Articles appear in feed with title + preview snippet

## Backlog
- [x] Add article fields to posts schema (`linkedin-demo/src/convex/schema.ts`) — type: "post"|"article" (default "post"), articleTitle (optional string), articleBody (optional string)
- [x] Create `linkedin-demo/src/convex/articles.ts` — mutation: createArticle(title, body, description?); query: getArticle(postId)
- [x] Create article editor page `linkedin-demo/src/components/articles/ArticleEditor.js` — title input + large textarea for body + publish button
- [x] Add `/write-article` route in App.js and "Write article" button near post composer
- [x] Create article view page `linkedin-demo/src/components/articles/ArticleView.js` — full-page layout with title, author info, body, reactions
- [x] Add `/article/:id` route in App.js
- [x] Render articles in feed with title + truncated preview (different card style from regular posts)
- [ ] Run `cd linkedin-demo && npx convex dev --once` to push schema <- current
- [ ] Test and commit

## Notes
- Schema: `linkedin-demo/src/convex/schema.ts`
- Router: `linkedin-demo/src/App.js`
- Post composer: `linkedin-demo/src/components/posts/postMaker/PostMaker.js`
- Post component: `linkedin-demo/src/components/posts/post/Post.js`
