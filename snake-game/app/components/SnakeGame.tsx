"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type GameState = "start" | "playing" | "gameover";
type Direction = "up" | "down" | "left" | "right";

type Point = {
  x: number;
  y: number;
};

const GRID_SIZE = 20;
const CELL_SIZE = 24;
const BOARD_SIZE = GRID_SIZE * CELL_SIZE;
const STEP_MS_BASE = 115;
const STEP_MS_MIN = 55;
const FOOD_PER_LEVEL = 5;
const HIGH_SCORE_KEY = "snake-high-score";

const KEY_TO_DIRECTION: Record<string, Direction> = {
  arrowup: "up",
  w: "up",
  arrowdown: "down",
  s: "down",
  arrowleft: "left",
  a: "left",
  arrowright: "right",
  d: "right",
};

const DIRECTION_VECTORS: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

function getStepMs(level: number): number {
  return Math.max(STEP_MS_MIN, STEP_MS_BASE - (level - 1) * 6);
}

function isOppositeDirection(a: Direction, b: Direction): boolean {
  return (
    (a === "up" && b === "down") ||
    (a === "down" && b === "up") ||
    (a === "left" && b === "right") ||
    (a === "right" && b === "left")
  );
}

function createInitialSnake(): Point[] {
  const middle = Math.floor(GRID_SIZE / 2);
  return [
    { x: middle, y: middle },
    { x: middle - 1, y: middle },
    { x: middle - 2, y: middle },
  ];
}

function randomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

function pickNextFood(snake: Point[]): Point {
  const occupied = new Set(snake.map((segment) => `${segment.x},${segment.y}`));
  const freeCells: Point[] = [];

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      if (!occupied.has(`${x},${y}`)) {
        freeCells.push({ x, y });
      }
    }
  }

  if (freeCells.length === 0) {
    return { x: 0, y: 0 };
  }

  return freeCells[randomInt(freeCells.length)];
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

export default function SnakeGame() {
  const [gameState, setGameState] = useState<GameState>("start");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [foodEatenThisLevel, setFoodEatenThisLevel] = useState(0);
  const [snake, setSnake] = useState<Point[]>(() => createInitialSnake());
  const [food, setFood] = useState<Point>(() => pickNextFood(createInitialSnake()));
  const [direction, setDirection] = useState<Direction>("right");

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const gameStateRef = useRef<GameState>(gameState);
  const scoreRef = useRef(score);
  const highScoreRef = useRef(highScore);
  const levelRef = useRef(level);
  const foodEatenThisLevelRef = useRef(foodEatenThisLevel);
  const snakeRef = useRef<Point[]>(snake);
  const foodRef = useRef<Point>(food);
  const directionRef = useRef<Direction>(direction);

  const queuedDirectionRef = useRef<Direction | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number>(0);
  const accumulatorRef = useRef<number>(0);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    highScoreRef.current = highScore;
  }, [highScore]);

  useEffect(() => {
    levelRef.current = level;
  }, [level]);

  useEffect(() => {
    foodEatenThisLevelRef.current = foodEatenThisLevel;
  }, [foodEatenThisLevel]);

  useEffect(() => {
    const stored = window.localStorage.getItem(HIGH_SCORE_KEY);
    const parsed = Number.parseInt(stored ?? "", 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      setHighScore(parsed);
      highScoreRef.current = parsed;
    }
  }, []);

  useEffect(() => {
    snakeRef.current = snake;
  }, [snake]);

  useEffect(() => {
    foodRef.current = food;
  }, [food]);

  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  useEffect(() => {
    window.localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
  }, [highScore]);

  const resetGame = useCallback((startDirection?: Direction) => {
    const freshSnake = createInitialSnake();
    const allowedDirection =
      startDirection && !isOppositeDirection("right", startDirection)
        ? startDirection
        : "right";

    const freshFood = pickNextFood(freshSnake);

    queuedDirectionRef.current = null;
    accumulatorRef.current = 0;
    lastFrameRef.current = performance.now();

    setSnake(freshSnake);
    snakeRef.current = freshSnake;

    setFood(freshFood);
    foodRef.current = freshFood;

    setDirection(allowedDirection);
    directionRef.current = allowedDirection;

    setScore(0);
    scoreRef.current = 0;

    setLevel(1);
    levelRef.current = 1;

    setFoodEatenThisLevel(0);
    foodEatenThisLevelRef.current = 0;

    setGameState("playing");
    gameStateRef.current = "playing";
  }, []);

  const queueDirection = useCallback((nextDirection: Direction) => {
    if (queuedDirectionRef.current !== null) {
      return;
    }

    const currentDirection = directionRef.current;
    if (
      nextDirection === currentDirection ||
      isOppositeDirection(currentDirection, nextDirection)
    ) {
      return;
    }

    queuedDirectionRef.current = nextDirection;
  }, []);

  const stepGame = useCallback(() => {
    if (gameStateRef.current !== "playing") {
      return;
    }

    const nextDirection = queuedDirectionRef.current ?? directionRef.current;
    queuedDirectionRef.current = null;

    if (nextDirection !== directionRef.current) {
      setDirection(nextDirection);
      directionRef.current = nextDirection;
    }

    const velocity = DIRECTION_VECTORS[nextDirection];
    const currentSnake = snakeRef.current;
    const currentHead = currentSnake[0];
    const nextHead = {
      x: currentHead.x + velocity.x,
      y: currentHead.y + velocity.y,
    };

    const hitsWall =
      nextHead.x < 0 ||
      nextHead.x >= GRID_SIZE ||
      nextHead.y < 0 ||
      nextHead.y >= GRID_SIZE;

    const hitsSelf = currentSnake.some(
      (segment, i) =>
        i < currentSnake.length - 1 &&
        segment.x === nextHead.x &&
        segment.y === nextHead.y,
    );

    if (hitsWall || hitsSelf) {
      setGameState("gameover");
      gameStateRef.current = "gameover";

      if (scoreRef.current > highScoreRef.current) {
        setHighScore(scoreRef.current);
        highScoreRef.current = scoreRef.current;
      }
      return;
    }

    const ateFood =
      nextHead.x === foodRef.current.x && nextHead.y === foodRef.current.y;

    const nextSnake = [nextHead, ...currentSnake];
    if (!ateFood) {
      nextSnake.pop();
    }

    setSnake(nextSnake);
    snakeRef.current = nextSnake;

    if (ateFood) {
      const nextScore = scoreRef.current + 1;
      setScore(nextScore);
      scoreRef.current = nextScore;

      const nextFoodEatenThisLevel = foodEatenThisLevelRef.current + 1;
      if (nextFoodEatenThisLevel === FOOD_PER_LEVEL) {
        const nextLevel = levelRef.current + 1;
        setLevel(nextLevel);
        levelRef.current = nextLevel;
        accumulatorRef.current = 0;

        setFoodEatenThisLevel(0);
        foodEatenThisLevelRef.current = 0;
      } else {
        setFoodEatenThisLevel(nextFoodEatenThisLevel);
        foodEatenThisLevelRef.current = nextFoodEatenThisLevel;
      }

      if (nextScore > highScoreRef.current) {
        setHighScore(nextScore);
        highScoreRef.current = nextScore;
      }

      const nextFood = pickNextFood(nextSnake);
      setFood(nextFood);
      foodRef.current = nextFood;
    }
  }, []);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, BOARD_SIZE, BOARD_SIZE);

    const background = ctx.createLinearGradient(0, 0, BOARD_SIZE, BOARD_SIZE);
    background.addColorStop(0, "#03060f");
    background.addColorStop(1, "#090d1a");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);

    ctx.strokeStyle = "rgba(4, 217, 255, 0.08)";
    ctx.lineWidth = 1;
    for (let i = 1; i < GRID_SIZE; i += 1) {
      const p = i * CELL_SIZE;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, BOARD_SIZE);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(BOARD_SIZE, p);
      ctx.stroke();
    }

    const currentFood = foodRef.current;
    const foodCenterX = currentFood.x * CELL_SIZE + CELL_SIZE / 2;
    const foodCenterY = currentFood.y * CELL_SIZE + CELL_SIZE / 2;
    const foodRadius = CELL_SIZE * 0.3;

    ctx.save();
    ctx.shadowBlur = 16;
    ctx.shadowColor = "#ff6ec7";
    ctx.fillStyle = "#ff6ec7";
    ctx.beginPath();
    ctx.arc(foodCenterX, foodCenterY, foodRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const currentSnake = snakeRef.current;
    currentSnake.forEach((segment, index) => {
      const x = segment.x * CELL_SIZE + 2;
      const y = segment.y * CELL_SIZE + 2;
      const size = CELL_SIZE - 4;

      ctx.save();
      if (index === 0) {
        ctx.fillStyle = "#6bff45";
        ctx.shadowBlur = 22;
      } else {
        ctx.fillStyle = "#39ff14";
        ctx.shadowBlur = 14;
      }
      ctx.shadowColor = "#39ff14";
      drawRoundedRect(ctx, x, y, size, size, 6);
      ctx.restore();
    });

    if (gameStateRef.current !== "playing") {
      ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
      ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);

      ctx.textAlign = "center";
      ctx.shadowBlur = 16;

      if (gameStateRef.current === "start") {
        ctx.fillStyle = "#04d9ff";
        ctx.shadowColor = "#04d9ff";
        ctx.font = "700 34px monospace";
        ctx.fillText("SNAKE", BOARD_SIZE / 2, BOARD_SIZE / 2 - 40);

        ctx.shadowBlur = 8;
        ctx.fillStyle = "#39ff14";
        ctx.shadowColor = "#39ff14";
        ctx.font = "600 14px monospace";
        ctx.fillText("Press any key to start", BOARD_SIZE / 2, BOARD_SIZE / 2 + 8);

        if (highScoreRef.current > 0) {
          ctx.fillStyle = "#ff6ec7";
          ctx.shadowColor = "#ff6ec7";
          ctx.font = "600 14px monospace";
          ctx.fillText(
            `High Score: ${highScoreRef.current}`,
            BOARD_SIZE / 2,
            BOARD_SIZE / 2 + 40,
          );
        }
      }

      if (gameStateRef.current === "gameover") {
        ctx.fillStyle = "#ff6ec7";
        ctx.shadowColor = "#ff6ec7";
        ctx.font = "700 30px monospace";
        ctx.fillText("GAME OVER", BOARD_SIZE / 2, BOARD_SIZE / 2 - 46);

        ctx.fillStyle = "#39ff14";
        ctx.shadowColor = "#39ff14";
        ctx.font = "600 15px monospace";
        ctx.fillText(`Score: ${scoreRef.current}`, BOARD_SIZE / 2, BOARD_SIZE / 2 - 8);
        ctx.fillText(
          `High Score: ${highScoreRef.current}`,
          BOARD_SIZE / 2,
          BOARD_SIZE / 2 + 18,
        );

        ctx.fillStyle = "#04d9ff";
        ctx.shadowColor = "#04d9ff";
        ctx.font = "600 14px monospace";
        ctx.fillText(`Level: ${levelRef.current}`, BOARD_SIZE / 2, BOARD_SIZE / 2 + 38);

        ctx.fillStyle = "#04d9ff";
        ctx.shadowColor = "#04d9ff";
        ctx.font = "600 13px monospace";
        ctx.fillText("Press any key to restart", BOARD_SIZE / 2, BOARD_SIZE / 2 + 64);
      }
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const requestedDirection = KEY_TO_DIRECTION[key];

      if (requestedDirection) {
        event.preventDefault();
      }

      if (gameStateRef.current === "start") {
        resetGame(requestedDirection);
        return;
      }

      if (gameStateRef.current === "gameover") {
        resetGame(requestedDirection);
        return;
      }

      if (gameStateRef.current !== "playing" || !requestedDirection) {
        return;
      }

      queueDirection(requestedDirection);
    };

    window.addEventListener("keydown", onKeyDown, { passive: false });
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [queueDirection, resetGame]);

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (!lastFrameRef.current) {
        lastFrameRef.current = timestamp;
      }

      const delta = Math.min(timestamp - lastFrameRef.current, 500);
      lastFrameRef.current = timestamp;

      if (gameStateRef.current === "playing") {
        accumulatorRef.current += delta;
        while (true) {
          const stepMs = getStepMs(levelRef.current);
          if (accumulatorRef.current < stepMs) {
            break;
          }
          stepGame();
          accumulatorRef.current -= stepMs;
        }
      }

      drawFrame();
      animationFrameRef.current = window.requestAnimationFrame(animate);
    };

    animationFrameRef.current = window.requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [drawFrame, stepGame]);

  return (
    <section className="w-full max-w-3xl rounded-2xl border border-[#04d9ff]/30 bg-[#050712]/80 p-4 shadow-[0_0_30px_rgba(4,217,255,0.2)] backdrop-blur sm:p-6">
      <header className="mb-5 flex flex-col items-center gap-3 sm:mb-6 sm:flex-row sm:justify-between">
        <h1 className="neon-pulse text-center text-2xl tracking-[0.2em] text-[#04d9ff] sm:text-3xl">
          SNAKE
        </h1>
        <div className="flex items-center gap-4 text-xs uppercase tracking-[0.18em] sm:text-sm">
          <p className="text-[#04d9ff]">Level: {level}</p>
          <p className="text-[#39ff14]">Score: {score}</p>
          <p className="text-[#ff6ec7]">High: {highScore}</p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[560px]">
        <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-[#39ff14]/50 bg-black shadow-[0_0_22px_rgba(57,255,20,0.26)]">
          <canvas
            ref={canvasRef}
            width={BOARD_SIZE}
            height={BOARD_SIZE}
            className="h-full w-full"
            aria-label="Snake game board"
          />
        </div>
      </div>

      <p className="mt-4 text-center text-[10px] uppercase tracking-[0.24em] text-[#a4adca] sm:text-xs">
        Controls: Arrow Keys or WASD
      </p>
    </section>
  );
}
