# SubTurtle Helpers

## Browser screenshots (Playwright)

Use the screenshot wrapper for frontend visual verification:

```bash
bash super_turtle/subturtle/browser-screenshot.sh <url> [output.png] [options]
```

This helper uses `npx playwright screenshot` under the hood:
- Launches headless Chromium (no GUI or macOS permissions needed)
- Captures full-page screenshots by default
- Writes output to the provided path or `.tmp/screenshots/`

### Examples

```bash
# Local dev server (auto output path under .tmp/screenshots/)
bash super_turtle/subturtle/browser-screenshot.sh http://localhost:3000

# Save a specific artifact for SubTurtle milestone proof
bash super_turtle/subturtle/browser-screenshot.sh \
  "$TUNNEL_URL" \
  ".subturtles/my-task/screenshots/home.png"

# Custom viewport size
bash super_turtle/subturtle/browser-screenshot.sh \
  http://localhost:3000 \
  .tmp/screenshots/desktop.png \
  --viewport 1440x900

# Viewport-only (no full-page scroll)
bash super_turtle/subturtle/browser-screenshot.sh \
  http://localhost:3000 \
  --no-full-page --viewport 1440x900

# Wait for a specific element before capture
bash super_turtle/subturtle/browser-screenshot.sh \
  http://localhost:3000 \
  --wait-selector ".content-loaded"
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--full-page` | Capture full scrollable page | `true` |
| `--no-full-page` | Capture viewport only | — |
| `--viewport WxH` | Set viewport size | browser default |
| `--wait-ms N` | Wait N ms before capture | `1200` |
| `--format png\|jpg` | Output format | `png` |
| `--timeout-ms N` | Navigation timeout | `30000` |
| `--wait-selector SEL` | Wait for CSS selector | — |

### Compatibility notes

Legacy Peekaboo flags are accepted as no-op compatibility switches:
- `--app`, `--mode`, `--capture-focus`, `--retina`, `--json-output`, `--browser`

Use `--help` to see current options and defaults.
