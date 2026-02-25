# Browser Tester Memory

## Environment
- Use chrome-headless-shell (NOT full Chrome for Testing) for Puppeteer automation — avoids hanging on page.screenshot and page.evaluate
- Shell path: `/Users/Richard.Mladek/.cache/puppeteer/chrome-headless-shell/mac_arm-145.0.7632.77/chrome-headless-shell-mac-arm64/chrome-headless-shell`
- Do NOT use --single-process or --no-zygote flags — they cause screenshot/evaluate hangs
- Safe launch args: `--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --disable-gpu`
- Use `waitUntil: 'domcontentloaded'` NOT `networkidle0` — Next.js HMR keeps connections open indefinitely

## Project: Landing Page (localhost:3000)
- Next.js dev server on port 3000 (NOT 5173/5174)
- Cloudflare tunnel URL stored at `.subturtles/landing/.tunnel-url` — may be stale/offline
- Always test localhost:3000 directly
- "N" badge visible in screenshots = Next.js dev toolbar, not a content bug

## Puppeteer Patterns
- Run test scripts in foreground with explicit timeout: `node script.mjs` with Bash timeout param
- Background tasks (`run_in_background`) can stall reading output — prefer foreground for test scripts
- For section screenshots: get section `top` via `getBoundingClientRect().top + scrollY`, then use clip coordinates
- `page.evaluate` queries with `forEach` on large DOMs can be slow but work fine with chrome-headless-shell
