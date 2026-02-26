## Current Task
All current snake-face tasks are complete.

## End Goal with Specs
The snake head should have a cute/fun face with:

### Eyes:
- Two small white circles with dark pupils on the snake head
- Pupils should face the direction the snake is moving (e.g. if moving right, pupils are shifted right)
- Eyes should be proportional to CELL_SIZE (about 30% of cell size each)

### Tongue:
- A small red forked tongue sticking out from the front of the head in the movement direction
- The tongue should be animated — flickering in and out (like a real snake)
- Use a simple sine-wave or toggle animation: tongue extends and retracts every ~300ms
- The tongue extends from the leading edge of the head cell, in the direction of movement

### Implementation:
- All drawing happens in the `render()` function in `.subturtles/.archive/snake-speedrun/index.html`
- After drawing the head cell, draw the eyes and tongue on top
- Use `context.arc()` for circular eyes
- Use `context.beginPath()` + lines for the forked tongue
- Add an animation variable (e.g. `tongueOut`) that toggles with `Date.now()` or a frame counter
- The tongue animation should work during gameplay (when `isRunning` is true)

### Direction-aware positioning:
- Moving RIGHT: eyes on right half of cell, tongue extends right
- Moving LEFT: eyes on left half of cell, tongue extends left
- Moving UP: eyes on upper half of cell, tongue extends up
- Moving DOWN: eyes on lower half of cell, tongue extends down

## Backlog
- [x] Add tongue animation state variable (toggle based on Date.now() % 600 < 300)
- [x] After drawing head in render(), draw two white eye circles with black pupils offset by direction
- [x] Draw animated forked tongue extending from head in movement direction
- [x] Verify eyes and tongue rotate correctly for all 4 directions
- [x] Verify animation looks smooth during gameplay
- [x] Commit

## Notes
- Single file: `.subturtles/.archive/snake-speedrun/index.html`
- Head is drawn at line ~361: `drawCell(segment.x, segment.y, index === 0 ? "#b8ff4a" : body, ...)`
- `direction` variable holds current {x, y} for movement direction
- CELL_SIZE = canvas.width / 24 = 20px
- Head color is `#b8ff4a` (bright yellow-green)
- Game is running at http://localhost:3000 with cloudflared tunnel

## Loop Control
STOP
