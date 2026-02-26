## Current Task
All items completed. Layout refactored: d-pad moved to normal flow below canvas, Restart button relocated to top-right.

## End Goal with Specs
The d-pad should sit directly below the canvas (inside `.stage` or right after it), NOT overlaid on top of the game. The Restart button must NOT be near the d-pad arrows — move it to the top-right corner of the card or somewhere it won't interfere with gameplay.

Requirements:
- Move `.dpad-container` OUT of the `.stage` div — place it right after `.stage`, before `.hud`
- Remove `position: absolute` from `.dpad-container` — use normal flow layout, centered
- Keep the d-pad centered horizontally, with minimal gap between canvas and arrows
- Move the Restart button to the top-right of the `.card` (absolute positioned) or into the title bar area — anywhere that's NOT near the d-pad
- Score pill stays visible (in the hud or near the top)
- Status pill can stay in hud or move to top area too
- Keep neon green aesthetic, large touch targets (min 56px)
- Keyboard + swipe controls unchanged
- Mobile responsive — works well on small screens

## Backlog
- [x] Move `.dpad-container` div from inside `.stage` to after `.stage` (normal flow, not absolute)
- [x] Update `.dpad-container` CSS: remove position absolute, center with margin auto, reduce top gap
- [x] Relocate Restart button to top-right of `.card` or title area (away from d-pad)
- [x] Adjust `.hud` layout — score/status pills can stay, just no restart button near arrows
- [x] Verify mobile layout looks clean and d-pad is easy to reach
- [x] Commit

## Loop Control
STOP

## Notes
- Single file: `.subturtles/.archive/snake-speedrun/index.html`
- The `.dpad-container` is currently inside `.stage` with `position: absolute; bottom: 1rem`
- The Restart button is in `.hud` div which sits right below `.stage`
- Keep everything in the single index.html (inline CSS + JS)
- Server at `server.js` needs no changes
- Game is running at http://localhost:3000 with cloudflared tunnel
