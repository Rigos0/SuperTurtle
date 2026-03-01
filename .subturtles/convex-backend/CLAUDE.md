## Current Task
Create `convex/seed.ts` with a `seedData` mutation that checks if posts table is empty, then inserts 4 users and 9 posts with the exact data below.

## End Goal with Specs
Convex backend with:
- `users` table: displayName, photoURL, title, headline, location, about, experience (array of strings), connections (number), followers (number), isFeatured (boolean — true for Tadeáš)
- `posts` table: authorId (reference to users), description (string), fileType (optional string), fileData (optional string), createdAt (number — epoch ms), likesCount (number), commentsCount (number)
- Query functions: `listPosts` (returns posts joined with author data, sorted by createdAt desc), `getUser` (get user by id), `getFeaturedUser` (get the user with isFeatured=true for the profile page)
- Mutation: `seedData` — inserts all mock users and posts if the posts table is empty
- All functions pushed to Convex cloud and working

## Backlog
- [x] Create `convex/schema.ts` with users and posts table definitions as described above
- [x] Create `convex/users.ts` with `getUser` query (by id) and `getFeaturedUser` query (isFeatured === true)
- [x] Create `convex/posts.ts` with `listPosts` query that fetches all posts sorted by createdAt desc, and for each post resolves the author from the users table (returning author displayName, photoURL, title alongside post data)
- [ ] Create `convex/seed.ts` with a `seedData` mutation that checks if posts table is empty, then inserts 4 users and 9 posts with the exact data below <- current
- [ ] Run `npx convex dev --once` to push functions and verify no errors
- [ ] Commit with message "Add Convex schema, queries, and seed data for Bíbr In"

## Seed Data — Users
1. Tadeáš Bíbr: displayName "Tadeáš Bíbr", photoURL "/tadeas-bibr.jpg" (will be resolved on frontend), title "📦 Co-Founder @ ReKrabice | Box Whisperer | Saving the planet one reusable package at a time", headline "I put things in boxes so you don't have to throw them away.", location "Prague, Czech Republic 🇨🇿", about "Serial box enthusiast. Co-founded ReKrabice because I saw a cardboard box in a dumpster and thought 'there has to be a better way.' Previously convinced the CEO of Slevomat that I was essential (still unconfirmed). When I'm not evangelizing reusable packaging, I'm probably at a Startup Night telling founders their MVP needs more boxes.", experience ["📦 Co-Founder — ReKrabice (Reusable boxes that come back like boomerangs)", "📈 Business Development — Behavio (Reading people's minds, ethically)", "⚙️ EA to CEO — Slevomat (Professional calendar Tetris champion)"], connections 842, followers 1337, isFeatured true
2. Avery Chen: displayName "Avery Chen", photoURL "https://i.pravatar.cc/200?img=12", title "Design Systems Lead @ Figma's Fever Dream", isFeatured false (all other profile fields can be empty strings / empty arrays / 0)
3. Devin Carter: displayName "Devin Carter", photoURL "https://i.pravatar.cc/200?img=33", title "Frontend Engineer | div Alignment Specialist", isFeatured false
4. Sofia Morales: displayName "Sofia Morales", photoURL "https://i.pravatar.cc/200?img=44", title "Product Marketing | Making Decks Nobody Reads", isFeatured false

## Seed Data — Posts (use Date.now() - minutesAgo * 60000 for createdAt)
Post 1: author=Tadeáš, 8min ago, "Thrilled to announce that ReKrabice just hit 10,000 boxes returned..."
Post 2: author=Avery, 17min ago, "Hot take: your design system is not a product...", fileType "image", fileData "https://picsum.photos/id/1015/1200/700"
Post 3: author=Devin, 35min ago, "Day 847 of centering a div..."
Post 4: author=Sofia, 62min ago, "Just finished 12 customer interviews..."
Post 5: author=Tadeáš, 95min ago, "People ask me: 'Tadeáš, why reusable boxes?...'", fileType "image", fileData "https://picsum.photos/id/1025/1200/700"
Post 6: author=Avery, 130min ago, "Agree? 👇\n\nThe best design is invisible..."
Post 7: author=Devin, 188min ago, "Removed 2,000 lines of CSS today..."
Post 8: author=Sofia, 255min ago, "Made a 73-slide deck for a feature...", fileType "image", fileData "https://picsum.photos/id/1043/1200/700"
Post 9: author=Tadeáš, 320min ago, "I used to be EA to the CEO of Slevomat..."

## Notes
- Convex folder is at `linkedin-demo/convex/` (NOT src/convex)
- The generated types are in `linkedin-demo/convex/_generated/`
- Use `import { query, mutation } from "./_generated/server";` and `import { v } from "convex/values";`
- For the schema, use `import { defineSchema, defineTable } from "convex/server";`
- CRA uses REACT_APP_ prefix — env is already set in `.env.local`
- Run all commands from the `linkedin-demo/` directory
- The seed mutation should store authorId as a reference: use `Id<"users">` type
- Use `ctx.db.query("posts").collect()` pattern for queries
- Use `ctx.db.insert("users", {...})` for inserts
- After creating schema.ts, run `npx convex dev --once` to push — this validates the schema
