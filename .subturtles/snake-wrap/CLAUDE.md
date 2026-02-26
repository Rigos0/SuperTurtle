## Current Task
Snake wall-wrap and Start-label update is complete; no remaining backlog items.

## End Goal with Specs

### 1. Wall wrapping
When the snake head goes off one edge, it appears on the opposite side. Classic snake behavior:
- Goes past right edge → appears on left
- Goes past left edge → appears on right
- Goes past bottom → appears on top
- Goes past top → appears on bottom

In `step()`, instead of the `hitWall` check that calls `gameOver()`, wrap the coordinates:
```js
next.x = (next.x + CELL_COUNT) % CELL_COUNT;
next.y = (next.y + CELL_COUNT) % CELL_COUNT;
```
Remove the `hitWall` block entirely. The snake only dies from self-collision now.

### 2. Rename Restart → Start
- Change the button text from "Restart" to "Start"
- When game is over, tapping Start begins a new game (same as current restart behavior)
- Update status pill texts: "Tap Start to begin", "Game over — tap Start"
- The button ID can stay `restart-btn` internally, just change the visible text

## Backlog
- [x] In `step()`: remove the hitWall game-over check, add modular wrapping for next.x and next.y
- [x] Change button text from "Restart" to "Start" in HTML
- [x] Update all status pill text references from "Restart" to "Start"
- [x] Verify wall wrapping works in all 4 directions
- [x] Verify self-collision still kills the snake
- [x] Commit

## Notes
- Single file: `.subturtles/.archive/snake-speedrun/index.html`
- The hitWall check is around lines 290-296 in `step()` function
- The button is `<button class="button" id="restart-btn">Restart</button>` around line 299
- Status texts are set in `startGame()`, `gameOver()`, and initial render
- Game is running at http://localhost:3000 with cloudflared tunnel

## Loop Control
STOP
