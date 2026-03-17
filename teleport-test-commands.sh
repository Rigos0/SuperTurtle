#!/usr/bin/env bash

# Terminal 1: start the local turtle with the beta E2B target.
cd /Users/Richard.Mladek/Documents/projects/agentic
export SUPERTURTLE_E2B_TEMPLATE_CHANNEL=beta
export SUPERTURTLE_RUNTIME_INSTALL_SPEC=superturtle@0.2.6-beta.1773748226.1
node super_turtle/bin/superturtle.js stop || true
cd super_turtle/claude-telegram-bot
bun run start

# In Telegram, send:
# /teleport

# Terminal 2: inspect the remote sandbox after /teleport.
cd /Users/Richard.Mladek/Documents/projects/agentic
node super_turtle/bin/e2b-webhook-poc.js status
node super_turtle/bin/e2b-webhook-poc.js logs --lines 100

# Optional pause/resume test while still teleported:
cd /Users/Richard.Mladek/Documents/projects/agentic
node super_turtle/bin/e2b-webhook-poc.js pause
node super_turtle/bin/e2b-webhook-poc.js status
node super_turtle/bin/e2b-webhook-poc.js logs --lines 100

# Then send another Telegram message to wake the same sandbox.

# When done, send in Telegram:
# /home
