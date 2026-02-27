# SubTurtle Helpers

## Browser screenshots (Peekaboo)

Use the screenshot wrapper for frontend visual verification:

```bash
bash super_turtle/subturtle/browser-screenshot.sh <url> [output.png] [options]
```

This helper uses `peekaboo` under the hood:
- Opens the URL in a target browser app (`peekaboo app launch`)
- Captures an image (`peekaboo image`)
- Writes output to the provided path or `.tmp/screenshots/`

### Examples

```bash
# Local dev server (auto output path under .tmp/screenshots/)
bash super_turtle/subturtle/browser-screenshot.sh http://localhost:3000

# Save a specific artifact for SubTurtle milestone proof
bash super_turtle/subturtle/browser-screenshot.sh \
  "$TUNNEL_URL" \
  ".subturtles/my-task/screenshots/home.png" \
  --app "Google Chrome" \
  --mode window

# Retina capture
bash super_turtle/subturtle/browser-screenshot.sh \
  http://localhost:3000 \
  .tmp/screenshots/home@2x.png \
  --retina
```

### Compatibility notes

Legacy Playwright wrapper flags are accepted as no-op compatibility switches during transition:
- `--browser`
- `--viewport`
- `--timeout-ms`
- `--wait-selector`
- `--full-page`

Use `--help` to see current options and defaults.
