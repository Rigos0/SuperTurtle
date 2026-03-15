# Current task
All backlog items are complete.

# End goal with specs
A lightweight backend that stores and retrieves chat messages for `texting-page/`.

- Use SQLite via `better-sqlite3` (Node.js) for simplicity — no external DB needed
- Create a small Express or Bun server (`texting-page/server.js`) that serves the HTML and provides API endpoints
- Endpoints: `GET /api/messages` (load history), `POST /api/messages` (save new message)
- Messages table: id, text, sender ("user" or "bot"), timestamp
- Seed the DB with the same sample messages currently hardcoded in the HTML
- Update `index.html` to fetch messages from the API on load and POST new messages on send
- Auto-replies should also be persisted
- Add a `package.json` with start script
- DB file: `texting-page/chat.db` (gitignored)

# Roadmap (Completed)
- Texting page base UI shipped

# Roadmap (Upcoming)
- Add database persistence to texting page

# Backlog
- [x] Read existing `texting-page/index.html` to understand message structure and send logic
- [x] Create `texting-page/package.json` with dependencies (express or bun server, better-sqlite3)
- [x] Create `texting-page/server.js` with SQLite setup, messages table, and seed data
- [x] Add GET /api/messages and POST /api/messages endpoints
- [x] Update `index.html` to fetch messages on load and POST on send instead of DOM-only
- [x] Persist auto-reply messages to DB as well
- [x] Add .gitignore for chat.db, test that server starts and serves the page
- [x] Commit changes

## Loop Control
STOP
