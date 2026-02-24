# Current task

Snake game is production-ready. This is a test task to verify tunnel preview support works end-to-end.

# End goal

Verify that:
1. The tunnel helper script starts a dev server + cloudflared tunnel
2. The generated tunnel URL is accessible in a browser
3. Stopping the tunnel cleanly kills both dev server and tunnel processes

# Backlog

- [x] Start dev server + cloudflared tunnel using the helper script
- [x] Verify tunnel URL is accessible in browser
- [x] Verify cleanup when tunnel is stopped
