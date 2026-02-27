#!/usr/bin/env bash
set -euo pipefail

# browser-screenshot.sh — capture a page screenshot via Playwright CLI
#
# Usage:
#   ./super_turtle/subturtle/browser-screenshot.sh <url> [output.png] [options]
#
# Examples:
#   ./super_turtle/subturtle/browser-screenshot.sh http://localhost:3000
#   ./super_turtle/subturtle/browser-screenshot.sh https://example.com ./tmp/example.png --full-page
#   ./super_turtle/subturtle/browser-screenshot.sh http://localhost:3000 --viewport 1440x900

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

DEFAULT_WAIT_MS="1200"
DEFAULT_FORMAT="png"
DEFAULT_VIEWPORT=""

usage() {
  cat <<'EOF'
Usage:
  ./super_turtle/subturtle/browser-screenshot.sh <url> [output.png] [options]

Options:
  --full-page                 Capture the full scrollable page (default: true)
  --no-full-page              Capture only the viewport
  --viewport <WxH>            Set viewport size, e.g. 1440x900
  --wait-ms <milliseconds>    Wait before capture (default: 1200)
  --format <name>             Output format: png|jpg (default: png)
  --timeout-ms <milliseconds> Navigation timeout (default: 30000)
  --wait-selector <selector>  Wait for a CSS selector before capture
  --help                      Show this help

Legacy flags (accepted, ignored):
  --app, --mode, --capture-focus, --retina, --json-output

Notes:
  - If output path is omitted, image is written under .tmp/screenshots/ in repo root.
  - Uses `npx playwright screenshot` under the hood.
  - Requires playwright to be installed (npm i -D playwright or npx handles it).
EOF
}

die() {
  echo "[browser-screenshot] ERROR: $*" >&2
  exit 1
}

is_integer() {
  [[ "$1" =~ ^[0-9]+$ ]]
}

warn() {
  echo "[browser-screenshot] WARN: $*" >&2
}

url=""
output=""
full_page="true"
viewport="${DEFAULT_VIEWPORT}"
wait_ms="${DEFAULT_WAIT_MS}"
format="${DEFAULT_FORMAT}"
timeout_ms="30000"
wait_selector=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --help|-h)
      usage
      exit 0
      ;;
    --full-page)
      full_page="true"
      shift
      ;;
    --no-full-page)
      full_page="false"
      shift
      ;;
    --viewport)
      viewport="${2:-}"
      [[ -n "$viewport" ]] || die "--viewport requires a value (e.g. 1440x900)"
      shift 2
      ;;
    --wait-ms)
      wait_ms="${2:-}"
      [[ -n "$wait_ms" ]] || die "--wait-ms requires a value"
      shift 2
      ;;
    --format)
      format="${2:-}"
      [[ -n "$format" ]] || die "--format requires a value"
      shift 2
      ;;
    --timeout-ms)
      timeout_ms="${2:-}"
      [[ -n "$timeout_ms" ]] || die "--timeout-ms requires a value"
      shift 2
      ;;
    --wait-selector)
      wait_selector="${2:-}"
      [[ -n "$wait_selector" ]] || die "--wait-selector requires a value"
      shift 2
      ;;
    # Legacy Peekaboo flags — accept and ignore
    --app|--mode|--capture-focus)
      warn "$1 is a legacy Peekaboo flag and will be ignored"
      shift 2
      ;;
    --retina|--json-output)
      warn "$1 is a legacy Peekaboo flag and will be ignored"
      shift
      ;;
    --browser|-b)
      warn "--browser is ignored; Playwright uses Chromium by default"
      shift 2
      ;;
    --*)
      die "unknown option: $1"
      ;;
    *)
      if [[ -z "$url" ]]; then
        url="$1"
      elif [[ -z "$output" ]]; then
        output="$1"
      else
        die "unexpected argument: $1"
      fi
      shift
      ;;
  esac
done

[[ -n "$url" ]] || {
  usage
  die "missing required <url> argument"
}

[[ "$format" =~ ^(png|jpg)$ ]] || die "invalid --format: ${format}"
is_integer "$wait_ms" || die "--wait-ms must be an integer"
is_integer "$timeout_ms" || die "--timeout-ms must be an integer"

if [[ -z "$output" ]]; then
  stamp="$(date +%Y%m%d-%H%M%S)"
  output="${PROJECT_DIR}/.tmp/screenshots/screenshot-${stamp}.${format}"
fi

output_dir="$(dirname "$output")"
mkdir -p "$output_dir"

# Verify npx/playwright is available
command -v npx >/dev/null 2>&1 || die "npx not found — install Node.js"

# Build the playwright screenshot command
capture_cmd=(
  npx playwright screenshot
  --timeout "$timeout_ms"
)

if [[ "${full_page}" == "true" ]]; then
  capture_cmd+=(--full-page)
fi

if [[ -n "$viewport" ]]; then
  # Playwright expects "width,height" — normalize "WxH" and "W,H" formats
  normalized_vp="${viewport//x/,}"
  normalized_vp="${normalized_vp//X/,}"
  capture_cmd+=(--viewport-size "$normalized_vp")
fi

if [[ -n "$wait_selector" ]]; then
  capture_cmd+=(--wait-for-selector "$wait_selector")
fi

# Add wait time if specified (Playwright uses --wait-for-timeout)
if (( wait_ms > 0 )); then
  capture_cmd+=(--wait-for-timeout "$wait_ms")
fi

# URL and output path are positional
capture_cmd+=("$url" "$output")

echo "[browser-screenshot] Capturing: ${url}"
echo "[browser-screenshot] Output: ${output}"
"${capture_cmd[@]}"

if [[ -f "$output" ]]; then
  output_abs="$(cd "$output_dir" && pwd)/$(basename "$output")"
  echo "[browser-screenshot] Saved: ${output_abs}"
else
  die "playwright command completed but output file was not found at ${output}"
fi
