#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

cp "$ROOT_DIR"/introduction.mdx "$ROOT_DIR"/quickstart.mdx "$ROOT_DIR"/architecture.mdx "$TMP_DIR"/

cat >"$TMP_DIR/docs.json" <<'EOF'
{
  "$schema": "https://mintlify.com/docs.json",
  "name": "Super Turtle",
  "description": "Core page validation sandbox",
  "theme": "mint",
  "colors": {
    "primary": "#E53935",
    "light": "#FF6F61",
    "dark": "#C62828"
  },
  "navigation": {
    "groups": [
      {
        "group": "Getting Started",
        "pages": [
          "introduction",
          "quickstart",
          "architecture"
        ]
      }
    ]
  }
}
EOF

cd "$TMP_DIR"
npx -y mintlify@latest validate
