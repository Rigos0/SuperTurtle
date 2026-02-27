## Current Task
All greeting backlog items are complete.

## End Goal with Specs

The Telegram bot should feel alive. Twice a day it sends a short greeting with a random turtle sticker — morning and evening. This is an Easter egg: zero usage cost, hidden from the user's cron UI, just warmth.

**Behavior:**
- **8:00 AM (user's local time, default to Europe/Prague):** Random morning greeting + random morning turtle sticker
- **8:00 PM:** Random evening greeting + random evening turtle sticker
- Messages are sent directly via `bot.api.sendSticker()` + `bot.api.sendMessage()` — NO LLM invocation
- Jobs are NOT stored in `cron-jobs.json` — they use a separate internal timer so they don't show up in `/cron`
- The feature is enabled by default but can be disabled via env var `TURTLE_GREETINGS=false`

**Morning message pool (pick random):**
- "good morning"
- "rise and shine"
- "morning!"
- "new day, new code"
- "wakey wakey"
- "time to build"
- "gm"
- "hope you slept well"
- "coffee time?"
- "let's go"

**Morning turtle sticker pool (emoji codepoints to combine with turtle):**
- `2615` (☕ coffee)
- `1f31e` (🌞 sun)
- `1f60a` (😊 smiling)
- `1f525` (🔥 fire)
- `2b50` (⭐ star)
- `1f4aa` (💪 flexed biceps)
- `1f33a` (🌺 flower)

**Evening message pool (pick random):**
- "have you eaten yet?"
- "had dinner?"
- "are we building anything tonight?"
- "good evening"
- "don't forget to eat"
- "winding down?"
- "how was your day?"
- "time to rest? or time to ship?"
- "evening check-in"
- "still coding?"

**Evening turtle sticker pool (emoji codepoints):**
- `1f307` (🌇 sunset)
- `1f30c` (🌌 milky way)
- `1f634` (😴 sleeping)
- `1f355` (🍕 pizza)
- `1f354` (🍔 hamburger)
- `1f60e` (😎 sunglasses)
- `1f917` (🤗 hugging)
- `1f974` (🥴 woozy — for late nights)

**Implementation approach:**

File to modify: `super_turtle/claude-telegram-bot/src/index.ts`

1. Create a new file: `super_turtle/claude-telegram-bot/src/turtle-greetings.ts`
   - Export a `startTurtleGreetings(bot, chatId)` function
   - Import the turtle combos JSON from `send_turtle_mcp/turtle-combos.json`
   - On init, calculate ms until next 8am and 8pm (Europe/Prague timezone)
   - Use `setTimeout` for the first fire, then `setInterval(24h)` for recurring
   - Each fire: pick random message + random sticker from the appropriate pool
   - To send the sticker: fetch the gstatic URL from turtle-combos.json, download the image buffer, then send via `bot.api.sendSticker(chatId, new InputFile(buffer, "turtle.webp"))`
   - Then send the text message via `bot.api.sendMessage(chatId, message)`
   - Sticker first, then text (so it looks like the turtle is speaking)
   - Wrap in try/catch — failures are silent (just log, never crash)

2. In `index.ts` startup (after `startCronTimer()` and before `bot.start()`):
   - Check `process.env.TURTLE_GREETINGS !== 'false'`
   - If enabled: `startTurtleGreetings(bot, ALLOWED_USERS[0])`
   - Log: `console.log("Turtle greetings enabled (8am/8pm Europe/Prague)")`

**Key constraint:** The sticker must be sent via `bot.api.sendSticker()` using an `InputFile` buffer with filename `"turtle.webp"` — this renders as a proper Telegram sticker (not a square photo). See the existing implementation in `streaming.ts` line 140-141 for the exact pattern.

**Key constraint 2:** This must NOT show up in `/cron` output. It's a completely separate timer, not using the cron-jobs.json system at all.

## Backlog
- [x] Create `turtle-greetings.ts` with message/sticker pools, timezone-aware scheduling, and direct bot.api sending
- [x] Wire into `index.ts` startup with env var gate
- [x] Test that stickers render correctly (not as photos)
- [x] Verify `/cron` does not show the greeting jobs
- [x] Commit

## Notes
- InputFile import: `import { InputFile } from "grammy"`
- Turtle combos path: `../send_turtle_mcp/turtle-combos.json` (relative from src/)
- The bot instance type is `Bot` from grammy — use `bot.api.sendSticker(chatId, inputFile)` and `bot.api.sendMessage(chatId, text)`
- ALLOWED_USERS is an array of numbers — use `ALLOWED_USERS[0]` for the chat ID
- Europe/Prague timezone: UTC+1 (winter) / UTC+2 (summer). Use Intl.DateTimeFormat or manual offset calculation.

## Loop Control
STOP
