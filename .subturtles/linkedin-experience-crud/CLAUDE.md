## Current Task
All backlog items completed.

## End Goal with Specs
- Experience entries are structured: title, company, startDate, endDate, description.
- Users can add, edit, delete experience entries on their profile.
- Data stored on user record (array of objects) in Convex.

## Backlog
- [x] Update `linkedin-demo/src/convex/schema.ts` to add `experienceEntries` array schema.
- [x] Add mutations in `linkedin-demo/src/convex/users.ts`: `addExperience`, `updateExperience`, `removeExperience` (auth required).
- [x] Update `linkedin-demo/src/components/profile/Profile.js` to render experience list + modal form for CRUD.
- [x] Commit: `add experience section crud`

## Notes
- Use stable ids per entry (uuid or timestamp) for updates.
- Keep UI simple and inline with existing profile styles.

## Loop Control
STOP
