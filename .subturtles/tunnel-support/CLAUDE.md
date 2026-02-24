# Current task

Create `super_turtle/subturtle/start-tunnel.sh` helper script that starts a dev server + cloudflared tunnel, captures the tunnel URL, and writes it to `.tunnel-url` in the SubTurtle workspace.

# End goal with specs

Add preview tunnel support to the SubTurtle infrastructure. When a SubTurtle works on a frontend, it starts a dev server + cloudflared quick tunnel itself, writes the URL to its workspace, and the meta agent picks it up on the next cron check-in and sends it to the user on Telegram.

## How it works

1. **SubTurtle's CLAUDE.md** includes a backlog item like: "Start dev server + cloudflared tunnel, write URL to .tunnel-url"
2. SubTurtle runs `npm run dev` (background), then `cloudflared tunnel --url http://localhost:3000` (background), parses the URL from stderr, writes it to `.subturtles/<name>/.tunnel-url`
3. SubTurtle continues with its actual coding work — tunnel stays alive in the background
4. **Meta agent** on the next cron check-in reads `.tunnel-url`, sends the link to the user on Telegram
5. When SubTurtle is stopped (via `ctl stop`), the entire process group dies — tunnel + dev server cleaned up automatically (since they're children of the SubTurtle process, and ctl kills the session)

## What "done" looks like

- `cloudflared` is installed and available on the system
- A small helper script exists at `super_turtle/subturtle/start-tunnel.sh` that SubTurtles can call:
  - Takes a project dir and optional port as args
  - Runs `npm run dev` in background
  - Waits for the dev server to be ready (poll localhost:<port>)
  - Runs `cloudflared tunnel --url http://localhost:<port>` in background
  - Parses the tunnel URL from cloudflared stderr
  - Writes URL to stdout and to the SubTurtle's `.tunnel-url` file
  - This is a convenience script — SubTurtles could also do it inline, but a script keeps it clean and reusable
- `ctl stop` cleanup works — killing the SubTurtle's process group takes down tunnel + dev server too
- `ctl status` and `ctl list` show the tunnel URL if `.tunnel-url` exists in the workspace
- META_SHARED.md updated: on cron check-ins, if `.tunnel-url` exists and hasn't been sent yet, send it to the user

## Constraints

- Use `cloudflared tunnel --url http://localhost:<port>` (quick tunnel — no account, no config, free)
- Default port 3000
- The helper script should be callable from any SubTurtle's Claude session (it has bash access)
- Don't modify the SubTurtle loop code or ctl spawn logic — this is purely additive

# Roadmap (Completed)

- **cloudflared installation** — installed via Homebrew, verified working

# Roadmap (Upcoming)

- **Milestone: Tunnel infrastructure** — cloudflared installed, helper script, meta agent docs

# Backlog

- [x] Install cloudflared via Homebrew, verify `cloudflared tunnel --url http://localhost:3000` works (spin up a temp python http server to test, capture the URL from stderr)
- [ ] Create `super_turtle/subturtle/start-tunnel.sh` helper script — takes project dir + optional port, starts dev server + tunnel, writes URL to .tunnel-url in the SubTurtle workspace (passed as arg or auto-detected from cwd) <- current
- [ ] Verify cleanup: start a tunnel via the helper, then kill the parent process — confirm tunnel + dev server die too. If not, add PID tracking + trap cleanup to the helper.
- [ ] Update `ctl status` and `ctl list` to show tunnel URL if `.tunnel-url` exists in workspace
- [ ] Update META_SHARED.md: on cron check-ins, check for `.tunnel-url` in the SubTurtle workspace. If found and not yet sent to user, send the link. Document that SubTurtles doing frontend work should have "start tunnel" as their first backlog item.
- [ ] End-to-end test with snake-game/: write a mini CLAUDE.md that starts a tunnel, verify URL works in browser, stop and verify cleanup
