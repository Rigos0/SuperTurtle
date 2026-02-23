# agentic

Autonomous coding loop: Claude plans, grooms state, Codex executes, Claude reviews. Repeat.

## Meta agent (from PC)

```bash
./super_turtle/meta/claude-meta
```

## Meta agent (from Telegram)

Message the bot. It runs Claude with access to the repo — ask it anything.

## Main loop

```bash
./super_turtle/orchestrator/ctl start   # start
./super_turtle/orchestrator/ctl status  # check
./super_turtle/orchestrator/ctl logs    # tail output
./super_turtle/orchestrator/ctl stop    # stop
```
