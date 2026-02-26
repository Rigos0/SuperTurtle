## Current Task
✅ COMPLETED — All backlog items are done. The restart button now sits beside the d-pad in a horizontal flex layout, and the game no longer auto-starts when pressing arrows. Users must tap Restart to begin, then use arrows to steer.

## End Goal with Specs
1. **Restart button position:** Place the Restart button to the RIGHT of the d-pad, vertically centered with it. They should be in a horizontal flex row: [d-pad] [restart button]. Remove the `.restart-container` absolute positioning — put the button inline next to the d-pad.

2. **Game start flow fix:** The game should NOT start when you press a d-pad arrow if the game hasn't been started yet. Flow should be:
   - Page loads → game is NOT running, status says "Tap Restart to begin"
   - User taps Restart → game starts
   - User uses d-pad arrows to steer (arrows do NOT start the game)
   - Game over → user must tap Restart again to play again
   - D-pad arrows during game over should do nothing (no auto-restart)

3. **Layout:** Wrap the d-pad + restart button in a horizontal flex container, centered below the canvas. Keep the neon aesthetic.

## Backlog
- [x] Remove `.restart-container` from its current position (top-right absolute)
- [x] Create a horizontal flex wrapper holding d-pad on left, restart button on right, centered
- [x] Update `handleDpadClick()` — remove the `startGame()` calls, arrows only call `setDirection()`
- [x] Update status text: "Tap Restart to begin" on load, "Game over — tap Restart" on death
- [x] Verify: arrows steer only, restart starts/restarts only, both look good side by side on mobile
- [x] Commit

## Notes
- Single file: `.subturtles/.archive/snake-speedrun/index.html`
- Key functions: `handleDpadClick()`, `startGame()`, `handleStartOrRestart()`
- The restart button currently has class `.button` and is inside `.restart-container` with absolute positioning
- The d-pad is inside `.dpad-container` which sits after `.stage`
- Game is running at http://localhost:3000 with cloudflared tunnel

## Loop Control
STOP
