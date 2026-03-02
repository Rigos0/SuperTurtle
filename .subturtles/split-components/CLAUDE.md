## Current Task
Extract `EducationSection.js` from `linkedin-demo/src/components/profile/Profile.js` — education list + add/edit dialog

## End Goal with Specs
Break Post.js and Profile.js into smaller, focused components. Post.js → 5-6 files. Profile.js sections → extracted components.

## Backlog
- [x] Read `linkedin-demo/src/components/posts/post/Post.js` and map all logical sections
- [x] Extract PostHeader.js — author avatar, name, timestamp, "Edited" badge, overflow menu (report, delete, edit triggers)
- [x] Extract PostActions.js — like/reaction button, comment toggle, repost button, bookmark button, share. Include reaction picker logic.
- [x] Extract PostComments.js — comment list + comment input form. Move comment state and handlers.
- [x] Extract RepostCard.js — the embedded original post display for reposts
- [x] Update Post.js to compose from extracted subcomponents — verify same behavior
- [x] Read `linkedin-demo/src/components/profile/Profile.js` (2162 lines) and map sections
- [x] Extract ExperienceSection.js from Profile.js — experience list + add/edit dialog
- [ ] Extract EducationSection.js from Profile.js — education list + add/edit dialog <- current
- [ ] Extract SkillsSection.js from Profile.js — skills tags + add/remove
- [ ] Update Profile.js to compose from extracted subcomponents
- [ ] Test build: `cd linkedin-demo && npm run build`
- [ ] Commit

## Notes
- Post.js: `linkedin-demo/src/components/posts/post/Post.js`
- Post styles: `linkedin-demo/src/components/posts/post/Style.js` — shared styles stay here, component-specific styles move with component
- Profile.js: `linkedin-demo/src/components/profile/Profile.js`
- Keep all imports working — extracted components should be in same directory or nearby
- Do NOT change behavior — pure refactoring. All features must work identically after.
- Post.js section map:
- `37-130`: file-local helpers/constants (`resolvePhoto`, image resolvers, reaction config, regexes, article preview helper)
- `132-350`: component setup, mutations/queries, local state/refs, derived memoized data
- `351-701`: event handlers (reactions, comments, repost/bookmark, menu/report/edit, profile/hashtag/article nav)
- `702-755`: mention text renderer helper
- `757-898`: reaction count normalization + `Reactions` summary renderer
- `900-981`: top/post header UI (repost ribbon, author block, timestamp, edited badge, overflow menu)
- `982-1120`: post body UI (edit mode, article card, text/hashtags/mentions, link preview, poll, repost embed, media)
- `1121-1217`: footer action row + reaction picker interactions
- `1219-1264`: comments list + add-comment form
- `1268-1326`: repost dialog + report/edit-history dialogs + report snackbar
- Profile.js section map:
- `33-190`: file-local constants/helpers (default profile, form builders, rich-text/date formatters, completeness calculator)
- `192-387`: component setup: mutations/queries, local state/refs, memoized derived data
- `388-412`: sync/reset effects (connection hover reset + per-profile state reset)
- `413-1005`: action handlers (messaging/connect/follow, profile edit, experience/education CRUD, skills, featured posts, photo/cover uploads)
- `1007-1368`: profile header UI (cover/avatar uploads, identity/meta, completeness bar, action buttons, connections panel)
- `1369-1515`: Posts tab UI (featured posts management + posts list rendering)
- `1517-1562`: Activity tab UI (recent activity cards)
- `1564-1898`: About tab UI (about rich text + experience/education/skills sections)
- `1900-2051`: experience + education dialogs
- `2053-2146`: edit profile dialog with about formatting preview
