# Frontend Skill

React & Next.js best practices, component patterns, styling, accessibility, and testing guidance for building high-quality modern web applications.

## Component Architecture

### Functional Components & Hooks

- Always use functional components with React hooks (`useState`, `useRef`, `useCallback`, `useEffect`)
- Use the `"use client"` directive in Next.js for client-side interactivity (not needed for server components)
- Co-locate state and logic with the component that uses it—avoid prop drilling

### State Management Patterns

**useState**: For UI state that should trigger re-renders
```tsx
const [gameState, setGameState] = useState<GameState>("start");
```

**useRef**: For values that persist across renders but don't trigger re-renders (e.g., animation frame IDs, game logic state)
```tsx
const canvasRef = useRef<HTMLCanvasElement>(null);
const accumulatorRef = useRef<number>(0);
```

**useCallback**: For memoized callbacks that should be stable across renders
- Include all dependencies in the dependency array
- Use to prevent unnecessary child re-renders and in event listeners

**useEffect**: For side effects (event listeners, data fetching, subscriptions)
- Return cleanup function when needed (e.g., to remove event listeners)
- Include proper dependency arrays to avoid infinite loops
- Group related state updates with useEffect synchronization

### Type Safety

- Always declare types for component props, state, and callback parameters
- Use TypeScript `type` or `interface` for custom types
- Export types alongside components for external use
```tsx
type Direction = "up" | "down" | "left" | "right";
type GameState = "start" | "playing" | "gameover" | "levelup";

interface VisualProperties {
  bgColorStart: string;
  bgColorEnd: string;
  // ...
}
```

## Styling Approaches

### Tailwind CSS for Layout & Utilities

- Use Tailwind utility classes for responsive layouts, spacing, typography
- Responsive prefixes (`sm:`, `md:`, `lg:`) for mobile-first design
- Combine with custom CSS for complex animations and effects

```tsx
<div className="flex min-h-screen w-full items-center justify-center p-4 sm:p-8">
  {/* responsive padding and flexbox */}
</div>
```

### Custom CSS for Complex Effects

- Use CSS modules or global stylesheets for animations and advanced effects
- Neon/glow aesthetic: leverage `box-shadow` and `text-shadow` with `rgba()` colors
- CSS gradients for backgrounds and visual depth

```css
.neon-pulse {
  animation: neonPulse 1.8s ease-in-out infinite;
}

@keyframes neonPulse {
  0%, 100% {
    text-shadow: 0 0 8px rgba(4, 217, 255, 0.7);
  }
  50% {
    text-shadow: 0 0 12px rgba(4, 217, 255, 1);
  }
}
```

### Canvas API for High-Performance Graphics

- Use canvas for games, visualizations, and real-time rendering
- Handle context properly: check for null before using
- Clear and redraw on each frame for animation
- Use `requestAnimationFrame` for 60fps animations

```tsx
const drawFrame = useCallback(() => {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);
  // Draw operations
}, []);

const animate = (timestamp: number) => {
  drawFrame();
  animationFrameRef.current = window.requestAnimationFrame(animate);
};
```

### Responsive Design

- Mobile-first approach: design for mobile, then enhance with larger breakpoints
- Use aspect-ratio utilities for consistent dimensions across devices
- Test touch events alongside keyboard/mouse events
- Use viewport-relative measurements for mobile responsiveness

```tsx
const minDimension = Math.min(window.innerWidth, window.innerHeight);
const threshold = Math.max(30, minDimension * 0.15); // Responsive threshold
```

## Event Handling

### Keyboard Events

- Normalize keys with `.toLowerCase()` for consistent handling
- Prevent default browser behavior for game keys with `event.preventDefault()`
- Create key-to-action mappings for multiple input methods (arrow keys + WASD)

### Touch Events

- Implement swipe detection with `touchstart` and `touchend` events
- Calculate delta movement and apply a responsive threshold
- Use `{ passive: true }` for non-blocking touch listeners, `{ passive: false }` for preventDefault
- Remember to clean up event listeners in the effect return

```tsx
const onTouchEnd = (event: TouchEvent) => {
  const deltaX = touch.clientX - touchStartRef.current.x;
  const deltaY = touch.clientY - touchStartRef.current.y;
  // Determine direction based on delta
};

window.addEventListener("touchstart", onTouchStart, { passive: true });
window.addEventListener("touchend", onTouchEnd, { passive: true });

return () => {
  window.removeEventListener("touchstart", onTouchStart);
  window.removeEventListener("touchend", onTouchEnd);
};
```

## Game Loop & Timing

### Fixed Time-Step Pattern

- Separate rendering (frame-based) from logic (time-based)
- Use accumulator pattern to handle variable frame rates
- Cap delta time to prevent large time jumps on tab switches

```tsx
const delta = Math.min(timestamp - lastFrameRef.current, 500); // Cap at 500ms
accumulatorRef.current += delta;

while (accumulatorRef.current >= stepMs) {
  stepGame(); // Fixed time-step logic
  accumulatorRef.current -= stepMs;
}
drawFrame(); // Render at refresh rate
```

## Accessibility Best Practices

### ARIA & Semantic HTML

- Use semantic HTML elements (`<section>`, `<header>`, `<main>`) when appropriate
- Add `aria-label` to interactive elements and canvas elements
- Provide text alternatives for visual content

```tsx
<canvas
  ref={canvasRef}
  width={BOARD_SIZE}
  height={BOARD_SIZE}
  aria-label="Game board canvas"
/>
```

### Keyboard Navigation

- Support keyboard-only control (arrow keys, WASD, Enter, Escape)
- Avoid relying solely on mouse/touch
- Provide visual feedback for focused elements

### Mobile Accessibility

- Touch targets should be at least 44×44px for easy interaction
- Support both portrait and landscape orientations
- Test on various device sizes and screen readers

## Testing Patterns

### Component Testing

- Test component rendering with different props
- Verify state updates and state changes
- Test event handling and callbacks

**Example with React Testing Library:**
```tsx
import { render, screen, fireEvent } from '@testing-library/react';

test('renders game title', () => {
  render(<SnakeGame />);
  expect(screen.getByText('SNAKE')).toBeInTheDocument();
});

test('starts game on key press', () => {
  render(<SnakeGame />);
  fireEvent.keyDown(document, { key: 'ArrowUp' });
  // Assert game state changed
});
```

### Integration Testing

- Test multiple components together
- Verify state flows and side effects work correctly
- Test user interactions end-to-end

### Canvas Testing

- Canvas rendering is hard to test directly
- Test logic separately from rendering
- Use visual regression testing for canvas-heavy components

## Data Constants & Helper Functions

### Organization

- Define type definitions and constants at the top of the file
- Create pure helper functions for reusable logic
- Keep helper functions close to where they're used

```tsx
const GRID_SIZE = 20;
const CELL_SIZE = 24;
const KEY_TO_DIRECTION: Record<string, Direction> = { /* ... */ };

function getStepMs(level: number, lap: number): number {
  // Pure function, no side effects
}

function pickNextFood(snake: Point[], obstacles: Set<string>): Point {
  // Reusable game logic
}
```

## Performance Optimization

### Memoization

- Use `useCallback` to memoize callbacks used in event listeners
- Memoize expensive calculations with `useMemo` if needed
- Avoid creating new objects/functions in render if they're used as dependencies

### Efficient Rendering

- Canvas-based games avoid component re-renders
- Use refs for state that doesn't need to trigger renders
- Keep state updates batched to minimize re-renders

### Animation & Timing

- Use `requestAnimationFrame` for smooth animations (60fps)
- Avoid blocking operations in the game loop
- Profile with browser DevTools to identify bottlenecks

## File Structure & Organization

### Next.js App Router

```
app/
├── page.tsx           // Root page component
├── layout.tsx         // Root layout & metadata
├── globals.css        // Global styles
├── components/
│   ├── SnakeGame.tsx  // Main game component
│   └── ...
└── ...
```

### Component Files

- One component per file
- Named exports for components and types
- Import styles at the top of the file
- Keep file size manageable (split large components)

## Common Pitfalls to Avoid

- **Missing dependency arrays**: Always include all dependencies in useEffect/useCallback
- **Stale closures**: Use refs for values that need fresh state in callbacks
- **Memory leaks**: Always clean up event listeners, intervals, and subscriptions
- **Over-rendering**: Be mindful of state shape—split large state objects to avoid unnecessary re-renders
- **Hardcoded values**: Extract magic numbers to constants with descriptive names
- **Missing types**: Always type state, props, and callback parameters

## Resources & Best Practices

- [React Docs - Hooks](https://react.dev/reference/react)
- [Next.js Docs - App Router](https://nextjs.org/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [MDN - Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [MDN - Web Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [Web Content Accessibility Guidelines (WCAG)](https://www.w3.org/WAI/WCAG21/quickref/)
