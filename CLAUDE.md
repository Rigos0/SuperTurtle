# Current task

All core features implemented and polished. Snake game is production-ready at root directory.

# End goal with specs

A playable Snake game built with Next.js and React — with level progression. Requirements:

- **Next.js project** in a `snake-game/` directory at project root
- **Modern, polished UI** — dark theme, neon/glow aesthetic, smooth animations
- **Fast & energetic** — responsive controls (arrow keys + WASD), snappy game loop (60fps canvas or similar)
- **Core gameplay** — classic snake rules: eat food, grow, don't hit walls or yourself
- **10 levels, then loop** — classic arcade structure:
  - 10 hand-crafted levels, each with its own obstacle layout and speed
  - Level-up every 5 food eaten; brief "LEVEL X" flash, then board resets (score carries over, snake resets to center)
  - After beating level 10, loop back to level 1 with score intact (lap 2, 3, … — keeps getting harder or stays at max speed)
  - **Speed ramp** — tick interval decreases each level (e.g. 120ms at level 1 → ~60ms at level 10)
  - **Obstacles** — level 1 is empty; from level 2+ wall segments appear, getting progressively more complex (center wall → L-shapes → corridors → full maze)
  - **Visual escalation** — subtle per-level changes (grid color shifts, intensifying glow, background hue rotation)
- **Level & score display** — current level (1–10), current score, and high score (persisted in localStorage)
- **Game states** — start screen, playing, level-up transition, game over with restart
- **Responsive** — works well on different screen sizes
- **Installable** — `cd snake-game && npm install && npm run dev` should just work

# Roadmap (Completed)

- Moved active components under `super_turtle/`
- Updated orchestrator entrypoints and control script paths

# Roadmap (Upcoming)

- **Milestone: Level system** — speed ramp + obstacle walls + level-up transitions + visual escalation
- Playtest & polish pass
- Add small root wrappers if command ergonomics need to be preserved
- Tighten guard tests around symlink/path edge cases

# Backlog

- [x] Scaffold Next.js project and ship full Snake game (logic, neon UI, polish)
- [x] Fix tab-switch instant death (clamp rAF delta to 500ms max)
- [x] Bug-fix & cleanup pass (hydration mismatch, tail-collision false positive, scaffold assets)
- [x] Add level state + food counter + level-up at 5 food + show level in HUD & game-over screen
- [x] Implement speed ramp (decrease tick interval each level, e.g. 115ms → 105ms → 95ms …)
- [x] Add obstacle wall system — LEVEL_OBSTACLES data, getObstaclesForLevel helper, obstacle state/ref, collision check, food-spawn avoidance, neon cyan rendering (placeholder layouts for now)
- [x] Replace LEVEL_OBSTACLES with 10 hand-crafted layouts (L1 empty → L10 full maze), validate spawn safety & reachability
- [x] Add level-up transition — "levelup" game state, timed overlay with neon flash, board/snake reset, input blocking, accumulator guard
- [x] Add loop mechanic (after level 10, restart at level 1 with score intact; track lap count)
- [x] Visual escalation per level (grid color shifts, glow intensity, background hue rotation)
- [x] Playtest and feel-tuning pass (edge cases, mobile considerations, speed curves, obstacle fairness)
- [x] Relocate snake-game to root directory — moved from .subturtles/test-run/snake-game/ to snake-game/; verified production build succeeds; game is now installable as `cd snake-game && npm install && npm run dev` per spec
