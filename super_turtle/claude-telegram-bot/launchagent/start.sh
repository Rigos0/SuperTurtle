#!/bin/bash
set -e

cd /Users/linuz90/Dev/claude-telegram-bot-ts

# Source environment variables
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

# Run the bot
exec /Users/linuz90/.bun/bin/bun run src/index.ts
