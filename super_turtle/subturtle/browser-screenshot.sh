#!/usr/bin/env bash
set -euo pipefail

# browser-screenshot.sh — capture a page screenshot via Peekaboo CLI
#
# Usage:
#   ./super_turtle/subturtle/browser-screenshot.sh <url> [output.png] [options]
#
# Examples:
#   ./super_turtle/subturtle/browser-screenshot.sh http://localhost:3000
#   ./super_turtle/subturtle/browser-screenshot.sh https://example.com ./tmp/example.png --retina

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

DEFAULT_APP="Google Chrome"
DEFAULT_MODE="window"
DEFAULT_WAIT_MS="1200"
DEFAULT_CAPTURE_FOCUS="auto"
DEFAULT_FORMAT="png"
PEEKABOO_BIN="${PEEKABOO_BIN:-peekaboo}"

usage() {
  cat <<'EOF'
Usage:
  ./super_turtle/subturtle/browser-screenshot.sh <url> [output.png] [options]

Options:
  --app <name>                Target browser app (default: "Google Chrome")
  --mode <name>               Peekaboo image mode: window|frontmost|screen|multi
                              (default: window)
  --capture-focus <name>      Focus mode: auto|background|foreground (default: auto)
  --format <name>             Output format: png|jpg (default: png)
  --retina                    Capture at 2x Retina scale
  --wait-ms <milliseconds>    Delay before capture after opening URL (default: 1200)
  --json-output               Pass through Peekaboo JSON output
  --help                      Show this help

Environment:
  PEEKABOO_BIN                Peekaboo executable path (default: peekaboo)

Notes:
  - If output path is omitted, image is written under .tmp/screenshots/ in repo root.
  - URL is opened in the selected app via "peekaboo app launch --open <url>".
  - Compatibility flags from the old Playwright wrapper (--browser, --viewport,
    --timeout-ms, --wait-selector, --full-page) are accepted but ignored.
EOF
}

die() {
  echo "[browser-screenshot] ERROR: $*" >&2
  exit 1
}

require_command() {
  local cmd="$1"
  command -v "$cmd" >/dev/null 2>&1 || die "required command not found: ${cmd}"
}

is_integer() {
  [[ "$1" =~ ^[0-9]+$ ]]
}

map_browser_app() {
  local browser="$1"
  case "$browser" in
    cr|chromium|chrome|google-chrome)
      echo "Google Chrome"
      ;;
    ff|firefox)
      echo "Firefox"
      ;;
    wk|webkit|safari)
      echo "Safari"
      ;;
    *)
      die "unsupported --browser value: ${browser}"
      ;;
  esac
}

warn() {
  echo "[browser-screenshot] WARN: $*" >&2
}

url=""
output=""
app="${DEFAULT_APP}"
mode="${DEFAULT_MODE}"
wait_ms="${DEFAULT_WAIT_MS}"
capture_focus="${DEFAULT_CAPTURE_FOCUS}"
format="${DEFAULT_FORMAT}"
retina="false"
json_output="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --help|-h)
      usage
      exit 0
      ;;
    --app)
      app="${2:-}"
      [[ -n "$app" ]] || die "--app requires a value"
      shift 2
      ;;
    --mode)
      mode="${2:-}"
      [[ -n "$mode" ]] || die "--mode requires a value"
      shift 2
      ;;
    --capture-focus)
      capture_focus="${2:-}"
      [[ -n "$capture_focus" ]] || die "--capture-focus requires a value"
      shift 2
      ;;
    --format)
      format="${2:-}"
      [[ -n "$format" ]] || die "--format requires a value"
      shift 2
      ;;
    --retina)
      retina="true"
      shift
      ;;
    --json-output)
      json_output="true"
      shift
      ;;
    --browser|-b)
      app="$(map_browser_app "${2:-}")"
      warn "--browser is deprecated; use --app instead"
      shift 2
      ;;
    --viewport)
      [[ -n "${2:-}" ]] || die "--viewport requires a value"
      warn "--viewport is not supported by Peekaboo CLI and will be ignored"
      shift 2
      ;;
    --timeout-ms)
      [[ -n "${2:-}" ]] || die "--timeout-ms requires a value"
      warn "--timeout-ms is not supported by Peekaboo CLI and will be ignored"
      shift 2
      ;;
    --wait-selector)
      [[ -n "${2:-}" ]] || die "--wait-selector requires a value"
      warn "--wait-selector is not supported by Peekaboo CLI and will be ignored"
      shift 2
      ;;
    --full-page)
      warn "--full-page is not supported by Peekaboo CLI and will be ignored"
      shift
      ;;
    --wait-ms)
      wait_ms="${2:-}"
      [[ -n "$wait_ms" ]] || die "--wait-ms requires a value"
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

[[ "$mode" =~ ^(window|frontmost|screen|multi)$ ]] || die "invalid --mode: ${mode}"
[[ "$capture_focus" =~ ^(auto|background|foreground)$ ]] || die "invalid --capture-focus: ${capture_focus}"
[[ "$format" =~ ^(png|jpg)$ ]] || die "invalid --format: ${format}"
is_integer "$wait_ms" || die "--wait-ms must be an integer"

if [[ -z "$output" ]]; then
  stamp="$(date +%Y%m%d-%H%M%S)"
  output="${PROJECT_DIR}/.tmp/screenshots/screenshot-${stamp}.${format}"
fi

output_dir="$(dirname "$output")"
mkdir -p "$output_dir"

require_command "${PEEKABOO_BIN}"

if [[ "$(uname -s)" != "Darwin" ]]; then
  warn "Peekaboo works on macOS; current host is $(uname -s)"
fi

echo "[browser-screenshot] Opening: ${url} (app: ${app})"
"${PEEKABOO_BIN}" app launch "${app}" --open "${url}" --wait-until-ready >/dev/null

if (( wait_ms > 0 )); then
  sleep_seconds="$(awk "BEGIN {printf \"%.3f\", ${wait_ms} / 1000}")"
  sleep "${sleep_seconds}"
fi

capture_cmd=(
  "${PEEKABOO_BIN}" image
  "--app=${app}"
  "--mode=${mode}"
  "--capture-focus=${capture_focus}"
  "--format=${format}"
  "--path=${output}"
)

if [[ "${retina}" == "true" ]]; then
  capture_cmd+=(--retina)
fi

if [[ "${json_output}" == "true" ]]; then
  capture_cmd+=(--json-output)
fi

echo "[browser-screenshot] Capturing with Peekaboo (${mode}): ${url}"
"${capture_cmd[@]}"

if [[ -f "$output" ]]; then
  output_abs="$(cd "$output_dir" && pwd)/$(basename "$output")"
  echo "[browser-screenshot] Saved: ${output_abs}"
else
  die "peekaboo reported success but output file was not found at ${output}"
fi
