## Current Task
Animate food: pulsing glow effect using sin wave on render.

## End Goal with Specs
The snake game should feel alive and polished, not like a bare-bones prototype. Key fixes:

### 1. Snake eyes — softer, more character
- The white eyes (#ffffff) are too harsh/bright against the neon green head. Use a softer color — maybe a light mint or pale green that blends with the head
- Make pupils slightly larger and more expressive
- Consider adding a tiny highlight/reflection dot in each eye for that "alive" look
- Eyes should feel cute/cartoonish, not creepy

### 2. Snake body — gradient glow effect
- The snake body should have a smoother gradient from head to tail
- Head: bright yellow-green (#b8ff4a)
- Body: transition smoothly to deeper green toward the tail
- Add a subtle glow/shadow around the snake segments so it feels like it's glowing on the dark grid
- Consider rounded corners on segments for a smoother look

### 3. Food — make it pulse/animate
- The red food square should pulse (scale up/down subtly) to draw attention
- Add a glow effect around the food
- Maybe a slight rotation animation

### 4. Background grid — subtler, more atmospheric
- The grid lines are fine but could pulse very subtly
- Add a subtle vignette effect (darker corners) to the canvas

### 5. Score display — animate on change
- When score increases, briefly flash/scale the score text
- Add a subtle glow to the score number

### 6. Game over screen — more dramatic
- Fade in the game over overlay (not instant)
- Maybe shake the canvas briefly on death
- Make "Game Over" text glow/pulse

### 7. General polish
- Smooth out the d-pad button styling
- Add subtle CSS animations to the card (breathing glow on the border)
- The tongue animation is good — keep it

## Backlog
- [x] Fix snake eyes: softer color (light mint/pale green), add highlight dot, make pupils more expressive
- [x] Improve snake body rendering: smoother gradient, subtle glow/shadow per segment, rounded look
- [ ] Animate food: pulsing glow effect using sin wave on render <- current
- [ ] Add canvas vignette effect (radial gradient overlay, darker edges)
- [ ] Animate score: flash/scale on score change (CSS animation triggered by JS)
- [ ] Improve game over: fade-in overlay, text glow/pulse, optional screen shake
- [ ] Add CSS breathing glow animation to the card border
- [ ] Clean up any rough edges, test on mobile
- [ ] Commit

## Notes
- Single file: `.subturtles/.archive/snake-speedrun/index.html`
- All rendering in `render()` function, uses canvas 2D context
- CELL_SIZE = 20px (480/24)
- Eye drawing starts around line 364 in render()
- Current eye color is #ffffff (too bright) — change to something like #d4ffe0 or rgba(200, 255, 220, 0.9)
- Food is drawn at line 356: `drawCell(food.x, food.y, "#ff3b5c", ...)`
- Game is running at http://localhost:3000 with cloudflared tunnel
- Keep all changes in the single index.html file
