## Current Task
Fix inconsistent naming or style patterns in the Snake game files.

## End Goal with Specs
Review all recent Snake game changes for code quality issues — dead code, TODOs, inconsistent style, unused variables, overly complex logic, missing error handling. Fix anything found and commit clean.

Files to review:
- `.subturtles/.archive/snake-speedrun/index.html` (871 lines — the main game)
- `.subturtles/.archive/snake-speedrun/server.js` (361 lines — WebSocket multiplayer server)

## Backlog
- [x] Read index.html and server.js thoroughly
- [x] Identify dead code, unused variables, console.logs left behind, TODOs
  - Progress: Removed unused `isOnSnake` helper and stripped non-essential client/server `console.log` calls.
- [ ] Fix inconsistent naming or style patterns <- current
- [ ] Simplify overly complex functions (especially collision logic, rendering)
- [ ] Remove any debug/temp code
- [ ] Ensure error handling is solid (WebSocket disconnect, edge cases)
- [ ] Commit all cleanup changes with descriptive message
- [ ] Write `## Loop Control\nSTOP` to CLAUDE.md
