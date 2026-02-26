const fs = require("fs");
const http = require("http");
const path = require("path");
const WebSocket = require("ws");

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const TICK_MS = 200;
const CELL_COUNT = 24;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

function respond(res, code, body, headers = {}) {
  res.writeHead(code, headers);
  res.end(body);
}

function fileFromUrl(url) {
  if (url === "/") {
    return path.join(ROOT, "index.html");
  }
  return path.join(ROOT, decodeURIComponent(url));
}

const server = http.createServer((req, res) => {
  const requestUrl = req.url || "/";
  const safeUrl = requestUrl.split("?")[0];

  if (safeUrl.includes("..")) {
    return respond(res, 403, "Forbidden");
  }

  const filePath = fileFromUrl(safeUrl);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  fs.readFile(filePath, (error, data) => {
    if (error) {
      if (error.code === "ENOENT") {
        return respond(res, 404, "Not found");
      }
      console.error(error);
      return respond(res, 500, "Server error");
    }
    respond(res, 200, data, { "Content-Type": contentType });
  });
});

// WebSocket server
const wss = new WebSocket.Server({ server });

// Game state
let gameState = {
  player1: {
    id: null,
    snake: [
      { x: 3, y: 3 },
      { x: 2, y: 3 },
      { x: 1, y: 3 },
    ],
    direction: { x: 1, y: 0 },
    nextDirection: { x: 1, y: 0 },
    score: 0,
  },
  player2: {
    id: null,
    snake: [
      { x: 21, y: 21 },
      { x: 22, y: 21 },
      { x: 23, y: 21 },
    ],
    direction: { x: -1, y: 0 },
    nextDirection: { x: -1, y: 0 },
    score: 0,
  },
  food: { x: 12, y: 10 },
  isRunning: false,
  isGameOver: false,
  countdown: null,
  winner: null,
};

let gameLoop = null;

function randomFood() {
  let candidate;
  do {
    candidate = {
      x: Math.floor(Math.random() * CELL_COUNT),
      y: Math.floor(Math.random() * CELL_COUNT),
    };
  } while (isOnAnySnake(candidate));
  return candidate;
}

function isOnAnySnake(cell) {
  const bothSnakes = [...gameState.player1.snake, ...gameState.player2.snake];
  return bothSnakes.some((segment) => segment.x === cell.x && segment.y === cell.y);
}

function setDirection(playerId, dx, dy) {
  const player = playerId === "player1" ? gameState.player1 : gameState.player2;
  if (!gameState.isRunning) {
    player.direction = { x: dx, y: dy };
    player.nextDirection = { x: dx, y: dy };
    return;
  }

  if (dx === -player.direction.x && dy === -player.direction.y) {
    return;
  }

  player.nextDirection = { x: dx, y: dy };
}

function step() {
  // Move player 1
  moveSnake(gameState.player1);
  // Move player 2
  moveSnake(gameState.player2);

  // Check collisions
  const p1Head = gameState.player1.snake[0];
  const p2Head = gameState.player2.snake[0];

  // Self-collision: player hits own body
  const p1HitSelf = gameState.player1.snake
    .slice(1)
    .some((segment) => segment.x === p1Head.x && segment.y === p1Head.y);
  const p2HitSelf = gameState.player2.snake
    .slice(1)
    .some((segment) => segment.x === p2Head.x && segment.y === p2Head.y);

  // Cross-collision: player hits other player's body
  const p1HitP2Body = gameState.player2.snake
    .slice(1)
    .some((segment) => segment.x === p1Head.x && segment.y === p1Head.y);
  const p2HitP1Body = gameState.player1.snake
    .slice(1)
    .some((segment) => segment.x === p2Head.x && segment.y === p2Head.y);

  // Head-to-head collision
  const headToHead = p1Head.x === p2Head.x && p1Head.y === p2Head.y;

  const p1Died = p1HitSelf || p1HitP2Body || headToHead;
  const p2Died = p2HitSelf || p2HitP1Body || headToHead;

  if (p1Died || p2Died) {
    gameState.isRunning = false;
    gameState.isGameOver = true;

    if (p1Died && p2Died) {
      gameState.winner = "draw";
    } else if (p1Died) {
      gameState.winner = "player2";
    } else {
      gameState.winner = "player1";
    }
  }

  // Food collision
  if (
    gameState.player1.snake[0].x === gameState.food.x &&
    gameState.player1.snake[0].y === gameState.food.y
  ) {
    gameState.player1.score += 1;
    gameState.food = randomFood();
  } else {
    gameState.player1.snake.pop();
  }

  if (
    gameState.player2.snake[0].x === gameState.food.x &&
    gameState.player2.snake[0].y === gameState.food.y
  ) {
    gameState.player2.score += 1;
    gameState.food = randomFood();
  } else {
    gameState.player2.snake.pop();
  }

  broadcastGameState();

  if (gameState.isGameOver) {
    clearInterval(gameLoop);
    setTimeout(startNewRound, 5000);
  }
}

function moveSnake(player) {
  const head = player.snake[0];
  const next = {
    x: (head.x + player.nextDirection.x + CELL_COUNT) % CELL_COUNT,
    y: (head.y + player.nextDirection.y + CELL_COUNT) % CELL_COUNT,
  };
  player.direction = player.nextDirection;
  player.snake.unshift(next);
}

function broadcastGameState() {
  const serializedGameState = {
    player1Snake: gameState.player1.snake,
    player2Snake: gameState.player2.snake,
    food: gameState.food,
    player1Score: gameState.player1.score,
    player2Score: gameState.player2.score,
    isRunning: gameState.isRunning,
    isGameOver: gameState.isGameOver,
    countdown: gameState.countdown,
    winner: gameState.winner,
  };

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(serializedGameState));
    }
  });
}

function resetGameState() {
  // Preserve player socket references
  const player1Socket = gameState.player1.id;
  const player2Socket = gameState.player2.id;

  gameState = {
    player1: {
      id: player1Socket,
      snake: [
        { x: 3, y: 3 },
        { x: 2, y: 3 },
        { x: 1, y: 3 },
      ],
      direction: { x: 1, y: 0 },
      nextDirection: { x: 1, y: 0 },
      score: 0,
    },
    player2: {
      id: player2Socket,
      snake: [
        { x: 21, y: 21 },
        { x: 22, y: 21 },
        { x: 23, y: 21 },
      ],
      direction: { x: -1, y: 0 },
      nextDirection: { x: -1, y: 0 },
      score: 0,
    },
    food: randomFood(),
    isRunning: false,
    isGameOver: false,
    countdown: null,
    winner: null,
  };
}

function startCountdown() {
  if (!gameState.player1.id || !gameState.player2.id) {
    return;
  }

  gameState.countdown = 3;
  broadcastGameState();

  const countdownInterval = setInterval(() => {
    gameState.countdown -= 1;
    broadcastGameState();

    if (gameState.countdown <= 0) {
      clearInterval(countdownInterval);
      gameState.countdown = null;
      gameState.isRunning = true;
      broadcastGameState();
      gameLoop = setInterval(step, TICK_MS);
    }
  }, 1000);
}

function startNewRound() {
  resetGameState();
  broadcastGameState();
  startCountdown();
}

wss.on("connection", (socket) => {
  let playerId = null;

  // Assign player
  if (!gameState.player1.id) {
    playerId = "player1";
    gameState.player1.id = socket;
  } else if (!gameState.player2.id) {
    playerId = "player2";
    gameState.player2.id = socket;
    // Start countdown when both players connected
    if (gameLoop) {
      clearInterval(gameLoop);
    }
    startCountdown();
  } else {
    // Third player - spectator mode
    socket.send(JSON.stringify({ spectator: true }));
  }

  // Send player assignment to the client
  if (playerId) {
    socket.send(JSON.stringify({ type: "assigned", playerId }));
  }

  // Send current state to new player
  broadcastGameState();

  socket.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === "direction" && playerId) {
        setDirection(playerId, data.dx, data.dy);
      } else if (data.type === "newGame") {
        startNewRound();
      }
    } catch (error) {
      console.error("Error parsing message:", error);
    }
  });

  socket.on("close", () => {
    if (playerId === "player1") {
      gameState.player1.id = null;
    } else if (playerId === "player2") {
      gameState.player2.id = null;
    }
    if (gameState.isRunning) {
      gameState.isRunning = false;
      clearInterval(gameLoop);
    }
  });
});

server.listen(PORT);
