## Current Task
Start dev server and cloudflared tunnel for the existing snake-speedrun game; locate/fix the missing `snake-speedrun/` workspace path so the launch command can run.

## End Goal with Specs
Serve the already-built snake game at `snake-speedrun/` via a public cloudflared tunnel so the user can play it in their browser.

## Backlog
- [ ] Start dev server + cloudflared tunnel using `bash super_turtle/subturtle/start-tunnel.sh snake-speedrun 3000`, write URL to `.tunnel-url` <- current
- [ ] Verify the tunnel URL loads the snake game
- [ ] Keep running (do NOT self-stop — the tunnel must stay alive)

## Notes
- The game is already built in `snake-speedrun/`. Do NOT rebuild or modify anything.
- Current run blocked: `bash super_turtle/subturtle/start-tunnel.sh snake-speedrun 3000` failed with `cd: snake-speedrun: No such file or directory` in `/Users/Richard.Mladek/Documents/projects/agentic`.
- Just run `bash super_turtle/subturtle/start-tunnel.sh snake-speedrun 3000` and confirm the URL works.
- Do NOT write `## Loop Control\nSTOP` — the tunnel needs to stay alive for the user to play.
