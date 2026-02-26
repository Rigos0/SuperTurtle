## Current Task
Identify dead code, unused variables, console logs, and TODOs in the Snake game files.

## End Goal with Specs
Review all recent Snake game changes for code quality issues — dead code, TODOs, inconsistent style, unused variables, overly complex logic, missing error handling. Fix anything found and commit clean.

Files to review:
- `.subturtles/.archive/snake-speedrun/index.html` (871 lines — the main game)
- `.subturtles/.archive/snake-speedrun/server.js` (361 lines — WebSocket multiplayer server)

## Backlog
- [x] Read index.html and server.js thoroughly
- [ ] Identify dead code, unused variables, console.logs left behind, TODOs <- current
  - Progress: Removed unused client/server code paths (`player1Direction`, `isTouchDevice`, `drawCell`, unused `drawSnakeEyes` arg, server `clients` map, unused player `color` fields).
- [ ] Fix inconsistent naming or style patterns
- [ ] Simplify overly complex functions (especially collision logic, rendering)
- [ ] Remove any debug/temp code
- [ ] Ensure error handling is solid (WebSocket disconnect, edge cases)
- [ ] Commit all cleanup changes with descriptive message
- [ ] Write `## Loop Control\nSTOP` to CLAUDE.md
