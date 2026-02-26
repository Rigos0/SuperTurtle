## Current Task
Major UX cleanup of the Snake game for mobile play.

## End Goal with Specs
Fix multiple layout and UX issues to make the game clean and mobile-friendly.

### Changes required:

1. **Remove the "Start" button entirely** — the game should auto-start when you first tap a d-pad arrow or swipe. No explicit start button needed. On game over, tapping an arrow starts a new game.

2. **Move Score directly under the title "Snake Speedrun"** — the score should be prominently visible at all times while playing. Place it right below the h1 title, styled clearly (e.g. `Score: 0` as a subtitle).

3. **Remove the description paragraph** — delete "Playable snake core with grid movement, food collection, collisions, scoring, and restart flow." entirely.

4. **Remove the status pill** — no "Tap Start to begin" text needed. The d-pad arrows are self-explanatory.

5. **Remove the .hud div entirely** — score is now under the title, status pill is gone, start button is gone. The hud section is no longer needed.

6. **Center and align everything properly for mobile** — the canvas/game board should be perfectly centered. The d-pad should be centered below it. Everything should feel balanced and aligned on a phone screen. Pay special attention to:
   - Canvas centered horizontally in the card
   - D-pad centered horizontally below the canvas
   - Consistent margins/padding
   - No awkward gaps or misalignments
   - The game board should use available width well on mobile (not too small, not overflowing)

7. **Game flow change:**
   - Page loads → snake is visible, score shows 0, d-pad arrows visible
   - User taps any arrow → game starts, snake moves that direction
   - Game over overlay shows → user taps any arrow → new game starts
   - Swipe on canvas also starts/steers
   - Keyboard Space/Enter/R still works on desktop

### Updated `handleDpadClick()`:
```js
function handleDpadClick(dx, dy) {
  if (!isRunning || isGameOver) {
    startGame();
    // Set direction after starting so first move goes the tapped direction
    setDirection(dx, dy);
    return;
  }
  setDirection(dx, dy);
}
```

## Backlog
- [x] Remove the Start button from HTML and JS
- [x] Remove the description paragraph
- [x] Remove the .hud div and status pill
- [x] Move score display to right below the h1 title (always visible)
- [x] Update `handleDpadClick()` to start game on first arrow tap
- [x] Update swipe handler to also start game if not running
- [x] Center canvas and d-pad properly for mobile (flexbox, margin auto, etc.)
- [x] Clean up any unused CSS (.hud, .pill, .button, .controls-wrapper adjustments)
- [x] Test mobile layout — everything centered and balanced
- [x] Commit

## Notes
- Single file: `.subturtles/.archive/snake-speedrun/index.html`
- Remove: description p tag, .hud div, status-pill, restart-btn, Start button
- Keep: title, score (move under title), canvas, d-pad, swipe, keyboard controls
- The `restartButton` JS variable and its event listener should be removed too
- Game is running at http://localhost:3000 with cloudflared tunnel

## Loop Control
STOP
