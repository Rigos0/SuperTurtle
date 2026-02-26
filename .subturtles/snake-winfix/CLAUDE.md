## Current Task
No pending task. Collision winner fix is complete.

## End Goal with Specs
The winner/loser is currently INVERTED — the losing player sees "You Win" and vice versa. The bug is in the server-side collision detection in `step()` function of `.subturtles/.archive/snake-speedrun/server.js`.

### The bug (lines 127-174):
The variable names are misleading and the death conditions are wrong:

```js
// Line 142-144: This checks HEAD-TO-HEAD, not P1 head hitting P2 body
const p1HeadHitP2Body = p1head.x === p2head.x && p1head.y === p2head.y;

// Line 145-147: This checks if P1's head is on P2's body (P1 runs into P2) — P1 should die
const p2HeadHitP1Body = gameState.player2.snake.slice(1).some(seg => seg.x === p1head.x && seg.y === p1head.y);

// Line 148-150: This checks if P2's head is on P1's body (P2 runs into P1) — P2 should die
const p1HeadHitP2BodyOther = gameState.player1.snake.slice(1).some(seg => seg.x === p2head.x && seg.y === p2head.y);
```

Then the death conditions on lines 152-160 mix these up.

### The fix:
Rewrite the collision section with CLEAR variable names:

```js
function step() {
  moveSnake(gameState.player1);
  moveSnake(gameState.player2);

  const p1Head = gameState.player1.snake[0];
  const p2Head = gameState.player2.snake[0];

  // Self-collision: player hits own body
  const p1HitSelf = gameState.player1.snake.slice(1).some(s => s.x === p1Head.x && s.y === p1Head.y);
  const p2HitSelf = gameState.player2.snake.slice(1).some(s => s.x === p2Head.x && s.y === p2Head.y);

  // Cross-collision: player hits OTHER player's body
  const p1HitP2Body = gameState.player2.snake.slice(1).some(s => s.x === p1Head.x && s.y === p1Head.y);
  const p2HitP1Body = gameState.player1.snake.slice(1).some(s => s.x === p2Head.x && s.y === p2Head.y);

  // Head-to-head: both heads on same cell
  const headToHead = p1Head.x === p2Head.x && p1Head.y === p2Head.y;

  // Determine who died
  const p1Died = p1HitSelf || p1HitP2Body || headToHead;
  const p2Died = p2HitSelf || p2HitP1Body || headToHead;

  if (p1Died || p2Died) {
    gameState.isRunning = false;
    gameState.isGameOver = true;

    if (p1Died && p2Died) {
      gameState.winner = "draw";
    } else if (p1Died) {
      gameState.winner = "player2";  // P1 died, so P2 wins
    } else {
      gameState.winner = "player1";  // P2 died, so P1 wins
    }
  }

  // ... rest of food logic unchanged
}
```

Key insight:
- `p1HitP2Body` means P1's HEAD ran into P2's BODY → P1 dies → P2 wins
- `p2HitP1Body` means P2's HEAD ran into P1's BODY → P2 dies → P1 wins

## Backlog
- [x] Replace the entire collision section in `step()` with the corrected logic above
- [x] Verify variable names match what they check (self-hit, cross-hit, head-to-head)
- [x] Verify winner assignment: p1Died → winner = "player2", p2Died → winner = "player1"
- [x] Restart the server (`lsof -ti:3000 | xargs kill -9` then start server.js)
- [x] Commit

## Notes
- Server file: `.subturtles/.archive/snake-speedrun/server.js`
- The `step()` function starts at line 127
- Only the collision detection section (lines 133-174) needs rewriting
- The food logic, moveSnake(), broadcastGameState() etc are all fine
- Client-side winner display logic is CORRECT — the bug is server-side only
- DO NOT touch index.html — only fix server.js

## Loop Control
STOP
