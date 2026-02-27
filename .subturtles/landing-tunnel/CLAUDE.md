## Current Task
Completed: landing page is served through a working tunnel URL and written to `.tunnel-url`.

## End Goal with Specs
Provide a shareable URL that serves the landing page (not the snake game). If conflicts exist, kill conflicting servers, then start a correct one. If cloudflared origin fails, try static export and serve `landing/out` with `npx serve`.

## Backlog
- [x] Kill any process currently bound to :3000 that is not the landing page
- [x] Start `landing` dev server and tunnel (use `bash super_turtle/subturtle/start-tunnel.sh landing 3000 .`)
- [x] Verify URL serves landing page (not snake) by curl and inspecting title/header
- [x] If tunnel 502 or wrong content, run `npm run build` and `npx serve@latest out -l 3000`, then tunnel to 127.0.0.1:3000
- [x] Write URL to `.tunnel-url` in SubTurtle workspace and report it
- [x] Update state and stop

## Notes
Check `curl -s http://127.0.0.1:3000 | head -n 5` for landing content. Ensure no lingering `snake-speedrun` server is on port 3000.
Resolved with fallback static flow after quick-tunnel origin errors; verified title `Apify Meetup with PostHog — Today` and `<h1>Super Turtle</h1>`.

## Loop Control
STOP
