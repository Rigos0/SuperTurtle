const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Database setup
const db = new Database(path.join(__dirname, 'chat.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    sender TEXT NOT NULL CHECK(sender IN ('user', 'bot')),
    timestamp TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// Seed data if table is empty
const count = db.prepare('SELECT COUNT(*) as n FROM messages').get();
if (count.n === 0) {
  const insert = db.prepare('INSERT INTO messages (text, sender, timestamp) VALUES (?, ?, ?)');
  const seeds = [
    ["Hey! How's it going?", 'bot', '2025-01-01 09:41:00'],
    ['Pretty good! Just working on some code.', 'user', '2025-01-01 09:42:00'],
    ['Nice, what are you building?', 'bot', '2025-01-01 09:42:30'],
    ['A texting UI that looks like this!', 'user', '2025-01-01 09:43:00'],
    ['Ha, very meta. Looks clean though!', 'bot', '2025-01-01 09:43:30'],
  ];
  const seedAll = db.transaction(() => {
    for (const [text, sender, timestamp] of seeds) {
      insert.run(text, sender, timestamp);
    }
  });
  seedAll();
}

// Auto-reply pool
const replies = [
  "That's awesome!",
  "Tell me more!",
  "Haha nice one",
  "I totally agree",
  "Wait really? No way",
  "Sounds good to me",
  "Interesting... go on",
  "Lol same",
  "You're on fire today",
  "Makes sense!",
  "Oh wow, that's cool",
  "Keep going, I'm listening",
];

// GET /api/messages - load message history
app.get('/api/messages', (req, res) => {
  const messages = db.prepare('SELECT id, text, sender, timestamp FROM messages ORDER BY id ASC').all();
  res.json(messages);
});

// POST /api/messages - save a new user message (and auto-reply)
app.post('/api/messages', (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'text is required' });
  }

  const insert = db.prepare('INSERT INTO messages (text, sender) VALUES (?, ?)');
  const userMsg = insert.run(text.trim(), 'user');

  // Generate and persist auto-reply
  const reply = replies[Math.floor(Math.random() * replies.length)];
  const botMsg = insert.run(reply, 'bot');

  res.json({
    userMessage: { id: Number(userMsg.lastInsertRowid), text: text.trim(), sender: 'user' },
    botReply: { id: Number(botMsg.lastInsertRowid), text: reply, sender: 'bot' },
  });
});

app.listen(PORT, () => {
  console.log(`Texting page server running at http://localhost:${PORT}`);
});
