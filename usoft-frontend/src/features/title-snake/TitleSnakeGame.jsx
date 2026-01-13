import { useState, useEffect, useRef, useCallback } from "react";

const WIDTH = 40;
const HEIGHT = 4;
const BRAILLE_WIDTH = WIDTH / 2;
const BRAILLE_BASE = 0x2800;
const BRAILLE_DOTS = [
  [0x01, 0x08],
  [0x02, 0x10],
  [0x04, 0x20],
  [0x40, 0x80],
];

export function TitleSnakeGame({ onGameOver }) {
  const game = useRef({
    snake: [
      { x: 3, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 1 },
    ],
    food: { x: 20, y: 2 },
    direction: { x: 1, y: 0 },
    directionQueue: [],
    score: 0,
    isGameOver: false,
  });

  const [tick, setTick] = useState(0);

  const spawnFood = () => {
    while (true) {
      const newFood = {
        x: Math.floor(Math.random() * WIDTH),
        y: Math.floor(Math.random() * HEIGHT),
      };
      if (
        !game.current.snake.some((p) => p.x === newFood.x && p.y === newFood.y)
      ) {
        game.current.food = newFood;
        break;
      }
    }
  };

  const runGameStep = useCallback(() => {
    if (game.current.directionQueue.length > 0) {
      const nextDir = game.current.directionQueue.shift();
      if (
        nextDir.x !== -game.current.direction.x ||
        nextDir.y !== -game.current.direction.y
      ) {
        game.current.direction = nextDir;
      }
    }

    const head = {
      x: (game.current.snake[0].x + game.current.direction.x + WIDTH) % WIDTH,
      y: (game.current.snake[0].y + game.current.direction.y + HEIGHT) % HEIGHT,
    };

    for (let i = 1; i < game.current.snake.length; i++) {
      if (
        head.x === game.current.snake[i].x &&
        head.y === game.current.snake[i].y
      ) {
        game.current.isGameOver = true;
      }
    }

    if (game.current.isGameOver) {
      setTick((t) => t + 1);
      return;
    }

    game.current.snake.unshift(head);

    if (head.x === game.current.food.x && head.y === game.current.food.y) {
      game.current.score++;
      spawnFood();
    } else {
      game.current.snake.pop();
    }

    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (game.current.isGameOver) {
      if (onGameOver) onGameOver(game.current.score);
      return;
    }

    let pixelGrid = Array.from({ length: HEIGHT }, () =>
      Array(WIDTH).fill(false)
    );
    game.current.snake.forEach((part) => {
      pixelGrid[part.y][part.x] = true;
    });
    game.current.food.y !== null &&
      (pixelGrid[game.current.food.y][game.current.food.x] = true);

    let titleString = "";
    for (let x = 0; x < BRAILLE_WIDTH; x++) {
      let charCode = BRAILLE_BASE;
      for (let y = 0; y < HEIGHT; y++) {
        if (pixelGrid[y][x * 2]) charCode |= BRAILLE_DOTS[y][0];
        if (pixelGrid[y][x * 2 + 1]) charCode |= BRAILLE_DOTS[y][1];
      }
      titleString += String.fromCharCode(charCode);
    }
    document.title = `[${game.current.score}] ${titleString}`;
  }, [onGameOver, tick]);

  useEffect(() => {
    const gameInterval = setInterval(runGameStep, 150);

    const handleKeyDown = (e) => {
      if (game.current.isGameOver) return;

      const key = e.key.toLowerCase();
      const lastQueuedDir =
        game.current.directionQueue.length > 0
          ? game.current.directionQueue[game.current.directionQueue.length - 1]
          : game.current.direction;

      if (game.current.directionQueue.length >= 2) return;

      let moved = false;
      switch (key) {
        case "w":
          if (lastQueuedDir.y === 0) {
            game.current.directionQueue.push({ x: 0, y: -1 });
            moved = true;
          }
          break;
        case "s":
          if (lastQueuedDir.y === 0) {
            game.current.directionQueue.push({ x: 0, y: 1 });
            moved = true;
          }
          break;
        case "a":
          if (lastQueuedDir.x === 0) {
            game.current.directionQueue.push({ x: -1, y: 0 });
            moved = true;
          }
          break;
        case "d":
          if (lastQueuedDir.x === 0) {
            game.current.directionQueue.push({ x: 1, y: 0 });
            moved = true;
          }
          break;
        default:
      }
      if (moved) e.preventDefault();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearInterval(gameInterval);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [runGameStep]);

  return null;
}
