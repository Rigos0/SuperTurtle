## Current Task
Implement the next backlog step: snake game logic.

## End Goal with Specs
A simple but polished HTML/JS Snake game served by a local dev server, accessible via a public cloudflared tunnel URL. The game should be fully playable: arrow key controls, growing snake, food spawning, score display, game over + restart. Dark background with neon green snake for that classic retro look.

## Backlog
- [x] Create a minimal Next.js or static HTML snake game in `snake-speedrun/` directory (single page app — `app/page.tsx` or plain `index.html` + bundler)
- [ ] Implement snake game logic: grid canvas, arrow key movement, food, collision, score, game over screen with restart <- current
- [ ] Style it: dark background, neon green snake, retro aesthetic, centered on page, mobile-friendly
- [ ] Start dev server + cloudflared tunnel using `bash super_turtle/subturtle/start-tunnel.sh snake-speedrun 3000`, write URL to `.tunnel-url`
- [ ] Verify the game loads and is playable through the tunnel URL
- [ ] Commit with clear message

## Notes
- Use Next.js (`npx create-next-app@latest snake-speedrun --yes`) for quick scaffolding, then replace the default page with the snake game.
- The tunnel helper is at `super_turtle/subturtle/start-tunnel.sh` — call it with the project dir and port.
- Keep it simple — single page, no backend needed. All game logic in the client.
- Speed is the goal. Ship fast.
