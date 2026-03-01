## Current Task
Commit: "Add notifications: like/comment alerts, bell badge, notifications tab"

## End Goal with Specs
- `notifications` table in Convex schema: userId (recipient), type ("like"|"comment"|"message"), fromUserId, postId (optional), conversationId (optional), read (boolean), createdAt
- Notifications auto-created when someone likes your post, comments on your post, or sends you a message
- Notification bell in header shows unread count badge
- Notifications tab shows list of notifications with avatar, message, timestamp, read/unread state
- Clicking a notification marks it as read
- Green branding (#2e7d32)
- Build passes: `npm run build`

## Backlog
- [x] Add `notifications` table to `linkedin-demo/src/convex/schema.ts`: fields: `userId` (v.id("users")), `type` (v.string()), `fromUserId` (v.id("users")), `postId` (v.optional(v.id("posts"))), `conversationId` (v.optional(v.id("conversations"))), `read` (v.boolean()), `createdAt` (v.number()).
- [x] Create `linkedin-demo/src/convex/notifications.ts` with:
  - `createNotification` mutation: args { userId, type, fromUserId, postId?, conversationId? }. Insert notification with read=false, createdAt=Date.now(). Don't notify yourself (skip if userId === fromUserId).
  - `listNotifications` query: args { userId: v.id("users") }. Query notifications where userId matches, sort by createdAt desc, join fromUser data (displayName, photoURL). Limit to 50.
  - `getUnreadCount` query: args { userId: v.id("users") }. Count notifications where userId matches and read===false.
  - `markAsRead` mutation: args { notificationId: v.id("notifications") }. Patch read=true.
  - `markAllAsRead` mutation: args { userId: v.id("users") }. Patch all unread notifications for this user to read=true.
- [x] Update `linkedin-demo/src/convex/likes.ts` toggleLike: After inserting a like (not on unlike), call createNotification internally. Get the post's authorId, create notification with type="like", fromUserId=args.userId, postId=args.postId, userId=post.authorId.
- [x] Update `linkedin-demo/src/convex/comments.ts` addComment: After inserting a comment, create notification with type="comment", fromUserId=args.authorId, postId=args.postId, userId=post.authorId.
- [x] Create `linkedin-demo/src/components/notifications/Notifications.js`: Import useQuery, useMutation from convex/react, api, useConvexUser. Query listNotifications({userId: user._id}). Render a list: each notification shows Avatar(fromUser.photoURL) + message text ("X liked your post" / "X commented on your post" / "X sent you a message") + ReactTimeago timestamp. Unread items have a green left border (#2e7d32). Clicking marks as read. "Mark all as read" button at top.
- [x] Create `linkedin-demo/src/components/notifications/Style.js`: makeStyles for notification list items, unread indicator (green left border), read state (no border), mark-all button.
- [x] Wire in App.js: When `activeTab === "notifications"`, render `<Notifications />` instead of "Coming soon". Import Notifications component.
- [x] Add unread badge to header: In `linkedin-demo/src/components/header/Header.js`, query `api.notifications.getUnreadCount({userId: user?._id})`. Show a Badge component (from @material-ui/core) around the NotificationsIcon with the unread count. Import Badge.
- [x] Push: `cd linkedin-demo && npx convex dev --once`
- [x] Build: `cd linkedin-demo && npm run build`
- [ ] Commit: "Add notifications: like/comment alerts, bell badge, notifications tab" <- current

## Notes
- All paths from repo root: `/Users/Richard.Mladek/Documents/projects/agentic/`
- Run npm/convex commands from `linkedin-demo/`
- Schema at `linkedin-demo/src/convex/schema.ts`
- likes.ts at `linkedin-demo/src/convex/likes.ts` — toggleLike mutation
- comments.ts at `linkedin-demo/src/convex/comments.ts` — addComment mutation
- Header.js at `linkedin-demo/src/components/header/Header.js`
- App.js at `linkedin-demo/src/App.js` — uses activeTab, has "Coming soon" fallback
- For internal function calls between mutations, use `ctx.runMutation(internal.notifications.createNotification, {...})` or just inline the db.insert
- Import `internal` from `./_generated/api` for internal mutations, or just use `ctx.db.insert("notifications", {...})` directly in likes.ts/comments.ts (simpler)
- Green colors: primary #2e7d32, light #66bb6a
- Message notifications are also wired in `messaging.ts` (`sendMessage`) for all recipients except sender.
