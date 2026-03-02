## Current Task
All backlog items completed for this subturtle.

## End Goal with Specs
E2E test coverage for all Phase 2 batch 1 features that shipped: hashtag links + hashtag feed page, repost flow + repost count, post visibility toggle, feed sort tabs (Recent/Top/Following), pagination (Load More), follow/unfollow. Tests run against `https://linkedin-demo-iota.vercel.app`.

## Backlog
- [x] Read existing test patterns in `linkedin-demo/e2e/core.spec.ts` (createTextPost, deletePostIfPresent, ensureFeedReady, getVisiblePostByDescription)
- [x] Add test: Hashtag in post text renders as clickable link — create post with #testhashtag, verify link element exists with href `/hashtag/testhashtag`
- [x] Add test: Hashtag feed page loads — navigate to `/hashtag/testhashtag`, verify page shows tag name and post list
- [x] Add test: Repost button opens repost dialog — click Repost on a post, verify dialog with commentary field appears
- [x] Add test: Repost count displays on post — after reposting, verify repost count increments (use Convex HTTP client like reaction tests do)
- [x] Add test: Post visibility toggle exists in composer — verify Public/Connections Only selector appears when creating a post
- [x] Add test: Feed sort tabs visible — verify Recent/Top/Following tabs or buttons appear above feed
- [x] Add test: Pagination — scroll or click "Load More", verify additional posts load
- [x] Add test: Follow button visible on profile — navigate to a profile, verify Follow button exists alongside Connect
- [x] Run tests: `cd linkedin-demo && npx playwright test e2e/posts-phase2.spec.ts`
- [x] Commit

## Notes
- All tests go in a NEW file: `linkedin-demo/e2e/posts-phase2.spec.ts`
- Use `loginAsGuest(page)` from `./helpers` for auth
- For backend assertions, use ConvexHttpClient like core.spec.ts does (import from "convex/browser")
- Convex URL: `https://tough-mosquito-145.convex.cloud`
- Repost mutations: `reposts:repostPost`, `reposts:getRepostCount`
- Hashtag query: `hashtags:getPostsByHashtag`
- Tests should be resilient with `test.skip()` when live data unavailable
- Latest run on March 2, 2026: `npx playwright test e2e/posts-phase2.spec.ts` resulted in 8 skipped tests on live deployment
- DO NOT modify existing test files — only create new ones
- Copy/replicate helper functions locally rather than importing from other spec files

## Loop Control
STOP
