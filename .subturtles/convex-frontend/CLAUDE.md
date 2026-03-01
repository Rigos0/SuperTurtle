## Current Task
Wait for Convex backend files (`convex/schema.ts`, `convex/posts.ts`, `convex/users.ts`, `convex/seed.ts`) to appear; continue retry checks until unblocked, then proceed with frontend wiring.

## End Goal with Specs
- App fetches posts and user data from Convex instead of static mock imports
- ConvexProvider wraps the app in index.js
- Posts component uses useQuery to fetch posts from Convex
- Profile component uses useQuery to fetch the featured user
- App seeds data on first load if database is empty
- Build succeeds with no errors
- Ready for Vercel deployment

## Backlog
- [ ] Wait for `convex/schema.ts`, `convex/posts.ts`, `convex/users.ts`, and `convex/seed.ts` to exist (check with ls; if not present yet, wait 30 seconds and check again, up to 5 retries) <- current
- [ ] Add ConvexProvider to `linkedin-demo/src/index.js`: import ConvexReactClient from "convex/react", create client with `process.env.REACT_APP_CONVEX_URL`, wrap the existing `<Provider store={store}><App /></Provider>` with `<ConvexProvider client={convex}>...</ConvexProvider>`
- [ ] Create `linkedin-demo/src/hooks/useConvexPosts.js` — a custom hook that calls `useQuery(api.posts.listPosts)` and returns the posts array (or empty array while loading). Import `{ useQuery }` from "convex/react" and `{ api }` from "../convex/_generated/api"
- [ ] Create `linkedin-demo/src/hooks/useConvexUser.js` — a custom hook that calls `useQuery(api.users.getFeaturedUser)` and returns the featured user object (or null while loading)
- [ ] Update `linkedin-demo/src/components/posts/Posts.js`: replace `import { mockPosts }` with `useConvexPosts()` hook. Map over the returned posts, adapting field names (authorName→username, authorPhotoURL→profile, etc). Keep the same JSX structure
- [ ] Update `linkedin-demo/src/components/profile/Profile.js`: use `useConvexUser()` hook for user data instead of importing from mock/user.js. Fall back to props/defaults while loading
- [ ] Add auto-seed: in `linkedin-demo/src/App.js`, on mount, call the seed mutation via `useMutation(api.seed.seedData)` so the database gets populated on first visit
- [ ] Update `linkedin-demo/src/components/posts/post/Post.js`: the isTadeas check should compare against the featured user's displayName from Convex (import useConvexUser or pass isFeatured as a prop from Posts)
- [ ] Run `cd linkedin-demo && npm run build` to verify build succeeds with Convex integration
- [ ] Commit with message "Wire React frontend to Convex backend"

## Notes
- This is a CRA (create-react-app) project, NOT Vite. Env vars use `process.env.REACT_APP_CONVEX_URL` (not import.meta.env)
- The Convex generated API is at `linkedin-demo/convex/_generated/api.js` — import as `import { api } from "../convex/_generated/api"` (path relative to src/)
- Keep Redux for theme toggle (util state) — only replace the mock data imports with Convex queries
- The mock/user.js imports a local image (`tadeas-bibr.jpg`) — for Convex, store the avatar URL in the database. For Tadeáš, since it's a local asset, keep using the local import as a fallback when the Convex user's photoURL is "/tadeas-bibr.jpg"
- Posts from Convex will have: _id, authorId, description, fileType, fileData, createdAt, likesCount, commentsCount, plus joined author fields (authorName, authorPhotoURL, authorTitle)
- The timestamp field changes from `{ toDate: () => Date }` to a plain epoch number (createdAt). Update ReactTimeago usage: `new Date(createdAt)` instead of `timestamp?.toDate()`
- Keep the existing UI/styling — only change data sources
- `.env.local` already has REACT_APP_CONVEX_URL set
- Progress (2026-03-01): Ran all 5 required retries (`ls` + 30s waits). Files are still missing at repo root, so this item remains blocked.
- Progress (2026-03-01, follow-up loop): Re-ran the full 5-retry availability check; `convex/schema.ts`, `convex/posts.ts`, `convex/users.ts`, and `convex/seed.ts` are still missing, so backlog item 1 remains `<- current`.
