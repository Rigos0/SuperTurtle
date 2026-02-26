 "use client";

import { useEffect, useMemo, useState } from 'react';

type Direction = "up" | "down" | "left" | "right";
type Point = { x: number; y: number };

type GameState = {
  snake: Point[];
  food: Point;
  direction: Direction;
  nextDirection: Direction;
  score: number;
  running: boolean;
  gameOver: boolean;
};

const GRID_SIZE = 16;
const TICK_MS = 130;
const COLORS = {
  head: "#ff2f2f",
  headGoggle: "#ffdfe6",
  headGoggleRing: "#ffe5c9",
  body: "#ff6a5d",
  tail: "#c92f25",
  food: "#ffbe73",
};

function getRandomPoint(): Point {
  return {
    x: Math.floor(Math.random() * GRID_SIZE),
    y: Math.floor(Math.random() * GRID_SIZE),
  };
}

function generateFood(snake: Point[]): Point {
  const occupied = new Set(snake.map((segment) => `${segment.x},${segment.y}`));

  let food = getRandomPoint();
  while (occupied.has(`${food.x},${food.y}`)) {
    food = getRandomPoint();
  }
  return food;
}

function initialSnake(): Point[] {
  return [
    { x: 7, y: 8 },
    { x: 6, y: 8 },
    { x: 5, y: 8 },
  ];
}

function initialState(): GameState {
  const snake = initialSnake();
  return {
    snake,
    food: generateFood(snake),
    direction: "right",
    nextDirection: "right",
    score: 0,
    running: true,
    gameOver: false,
  };
}

function moveOne(step: Direction, point: Point): Point {
  switch (step) {
    case "up":
      return { ...point, y: point.y - 1 };
    case "down":
      return { ...point, y: point.y + 1 };
    case "left":
      return { ...point, x: point.x - 1 };
    case "right":
      return { ...point, x: point.x + 1 };
  }
}

function isOpposite(a: Direction, b: Direction) {
  return (
    (a === "up" && b === "down") ||
    (a === "down" && b === "up") ||
    (a === "left" && b === "right") ||
    (a === "right" && b === "left")
  );
}

function collide(point: Point, snake: Point[]) {
  const hitWall = point.x < 0 || point.x >= GRID_SIZE || point.y < 0 || point.y >= GRID_SIZE;
  const hitSelf = snake.some((segment) => segment.x === point.x && segment.y === point.y);
  return hitWall || hitSelf;
}

export default function Home() {
  const [state, setState] = useState<GameState>(() => initialState());

  const head = state.snake[0];
  const tail = state.snake[state.snake.length - 1];
  const snakeBody = useMemo(
    () => new Set(state.snake.map((segment) => `${segment.x},${segment.y}`)),
    [state.snake],
  );

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const directionMap: Record<string, Direction> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        w: "up",
        W: "up",
        s: "down",
        S: "down",
        a: "left",
        A: "left",
        d: "right",
        D: "right",
      };

      const direction = directionMap[event.key];
      if (!direction) return;

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        event.preventDefault();
      }

      setState((prev) => {
        if (prev.gameOver) return prev;
        if (isOpposite(prev.direction, direction)) return prev;
        return { ...prev, nextDirection: direction };
      });
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    if (!state.running || state.gameOver) return;
    const interval = window.setInterval(() => {
      setState((prev) => {
        if (!prev.running || prev.gameOver) return prev;

        const direction = prev.nextDirection;
        const nextHead = moveOne(direction, prev.snake[0]);

        if (collide(nextHead, prev.snake)) {
          return { ...prev, running: false, gameOver: true };
        }

        const eatsFood = nextHead.x === prev.food.x && nextHead.y === prev.food.y;
        const nextSnake = [nextHead, ...prev.snake];
        if (!eatsFood) {
          nextSnake.pop();
        }

        return {
          ...prev,
          snake: nextSnake,
          food: eatsFood ? generateFood(nextSnake) : prev.food,
          direction,
          score: prev.score + (eatsFood ? 1 : 0),
        };
      });
    }, TICK_MS);

    return () => window.clearInterval(interval);
  }, [state.running, state.gameOver]);

  const toggleRun = () => {
    setState((prev) => {
      if (prev.gameOver) {
        return initialState();
      }

      return { ...prev, running: !prev.running };
    });
  };

  const statusText = state.gameOver ? "Restart" : state.running ? "Stop" : "Resume";

  return (
    <main className="meetup-page">
      <div className="background-grid" aria-hidden="true" />

      <section className="hero-card">
        <p className="eyebrow">Epify Puzlo</p>
        <h1>Snake Sprint</h1>
        <div className="hero-badge-row">
          <span className="hero-badge">Red-forward</span>
          <span className="hero-badge hero-badge--soft">Score only</span>
        </div>

        <p className="status-row" style={{ color: "#ffdfd9", marginTop: "0.9rem", marginBottom: "0.9rem", justifyContent: "space-between" }}>
          <span style={{ fontSize: "1.2rem", fontWeight: 700 }}>Score: {state.score}</span>
          <button
            type="button"
            onClick={toggleRun}
            className="cta-secondary"
            style={{ padding: "0.55rem 0.9rem", fontWeight: 800 }}
          >
            {statusText}
          </button>
        </p>

        <div
          aria-label="Snake game board"
          className="panel"
          style={{
            marginTop: "0.9rem",
            display: "grid",
            gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
            gap: "3px",
            padding: "0.7rem",
            backgroundColor: "rgba(22, 8, 12, 0.84)",
            borderColor: "rgba(255, 132, 116, 0.45)",
            maxWidth: "min(92vw, 420px)",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => {
            const x = index % GRID_SIZE;
            const y = Math.floor(index / GRID_SIZE);
            const isFood = state.food.x === x && state.food.y === y;
            const isHead = head.x === x && head.y === y;
            const isTail = tail.x === x && tail.y === y && !isHead;
            const isBody = snakeBody.has(`${x},${y}`);

            const cellClass = isHead
              ? "snake-head"
              : isTail
                ? "snake-tail"
                : isBody
                  ? "snake-body"
                  : "snake-empty";

            return (
              <div
                key={`${x}-${y}`}
                className={cellClass}
                style={{
                  aspectRatio: "1 / 1",
                  borderRadius: isHead || isTail || isBody ? "0.4rem" : "0.2rem",
                  position: "relative",
                  backgroundColor: isHead
                    ? COLORS.head
                    : isTail
                      ? COLORS.tail
                      : isBody
                        ? COLORS.body
                        : isFood
                          ? COLORS.food
                          : "rgba(24, 10, 14, 0.9)",
                  boxShadow: isHead || isBody || isTail
                    ? "inset 0 -3px 0 rgba(0,0,0,0.24)"
                    : isFood
                      ? "0 0 0 1px rgba(255, 190, 115, 0.46) inset"
                      : "none",
                }}
              >
                {isHead && (
                  <>
                    <span
                      style={{
                        position: "absolute",
                        width: "0.34rem",
                        height: "0.34rem",
                        borderRadius: "9999px",
                        left: "0.3rem",
                        top: "0.33rem",
                        background: COLORS.headGoggleRing,
                        boxShadow: `inset 0 0 0 2px ${COLORS.headGoggle}`,
                      }}
                      aria-hidden="true"
                    />
                    <span
                      style={{
                        position: "absolute",
                        width: "0.34rem",
                        height: "0.34rem",
                        borderRadius: "9999px",
                        right: "0.3rem",
                        top: "0.33rem",
                        background: COLORS.headGoggleRing,
                        boxShadow: `inset 0 0 0 2px ${COLORS.headGoggle}`,
                      }}
                      aria-hidden="true"
                    />
                  </>
                )}
                {isFood && !isBody && !isHead && !isTail && (
                  <span
                    style={{
                      position: "absolute",
                      inset: "28%",
                      borderRadius: "9999px",
                      background: "#ffebd8",
                      boxShadow: "0 0 8px rgba(255, 190, 115, 0.65)",
                    }}
                    aria-hidden="true"
                  />
                  )}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
