## Current Task
Add mobile touch controls (on-screen d-pad) to the Snake game.

## End Goal with Specs
The snake game at `.subturtles/.archive/snake-speedrun/index.html` must be playable on phones. Add a visible d-pad (↑ ← ↓ →) below the game canvas that:
- Calls `setDirection(dx, dy)` on tap (same as keyboard arrows)
- Tapping the d-pad when game isn't running starts the game (same as pressing Space)
- Buttons are large enough to tap comfortably (min 56px touch targets)
- D-pad only shows on mobile/touch (or always shows — fine either way, just make sure it looks good)
- Styled to match the existing neon green aesthetic (var(--accent), var(--accent-rgb))
- Does NOT break keyboard controls — both work simultaneously
- Also add swipe gesture support on the canvas itself as an alternative to the d-pad

## Backlog
- [x] Add d-pad HTML below the .hud div (4 arrow buttons in a cross layout)
- [x] Style d-pad with neon theme, large touch targets, proper spacing
- [x] Wire d-pad buttons to setDirection() + start game if not running
- [x] Add touch swipe detection on the canvas element
- [x] Update status pill text to say "Tap arrows or swipe to steer" on mobile
- [x] Test that keyboard still works alongside touch
- [x] Commit

## Notes
- Single file: `.subturtles/.archive/snake-speedrun/index.html`
- Key functions: `setDirection(dx, dy)`, `startGame()`, `handleStartOrRestart()`
- The game is currently running at http://localhost:3000 with a cloudflared tunnel
- Keep it all in the single index.html file (inline CSS + JS)
- The server (`server.js`) just serves static files, no changes needed there

## Loop Control
STOP
