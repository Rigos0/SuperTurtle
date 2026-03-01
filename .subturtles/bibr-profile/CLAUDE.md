## Current Task
All profile page and clickable navigation tasks are complete.

## End Goal with Specs
A new "profile" tab/view showing Tadeáš's profile info. Clicking these elements navigates to the profile view:
1. Post author avatar (in each feed post) — `linkedin-demo/src/components/posts/post/Post.js`
2. Post author name (in each feed post) — same file
3. Header top-right avatar — `linkedin-demo/src/components/header/Header.js` (the `<Avatar src={photoURL} />` on line 61)

Profile view shows: large avatar, name "Tadeáš Bíbr", title "Software Engineer | Product Builder", and a back button to return to the feed.

## Backlog
- [x] Create `linkedin-demo/src/components/profile/Profile.js` — a simple profile card component that receives user data (avatar, name, title) and renders them with Material-UI (Avatar, Typography, Paper, Button for back)
- [x] Create `linkedin-demo/src/components/profile/Style.js` — makeStyles for the profile component (centered layout, large avatar ~120px, name bold, title muted)
- [x] Add "profile" view state to App.js: add `const [view, setView] = useState("feed")` and conditionally render `<Profile onBack={() => setView("feed")} />` when `view === "profile"`, pass `setView` down to Header and Posts
- [x] In Header.js: wrap the top-right `<Avatar src={photoURL} />` (line 61) in an `onClick` that calls `setView("profile")` — add cursor pointer style
- [x] In Post.js: wrap the `<Avatar src={profile} />` (line 75) and the `<h4>{capitalize(username)}</h4>` (line 77) in onClick handlers that navigate to the profile view — add cursor pointer style
- [x] Run `cd linkedin-demo && CI=true npm test -- --watchAll=false && npm run build` to confirm green
- [x] Commit with message "Add Tadeáš profile page with clickable avatars and names"

## Notes
- Import mockUser from `../../mock/user` (or appropriate relative path) in Profile.js for the profile data
- The profile view replaces the feed content area (same grid slot in App.js), not a new route
- Keep it simple — no routing library, just conditional rendering based on `view` state
- Pass `onNavigateProfile` callback down through props: App → Header, App → Posts → Post
- Style the avatar/name clicks with `cursor: pointer` so they look tappable

## Loop Control
STOP
