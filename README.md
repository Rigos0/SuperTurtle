# agentic

Autonomous coding system: **Super Turtle** (meta agent) directs **SubTurtles** (autonomous coding loops) that plan, groom state, execute, and review — one commit at a time.

## Meta agent (from PC)

```bash
./super_turtle/meta/claude-meta
```

## Meta agent (from Telegram)

Message the bot. It runs Claude with access to the repo — ask it anything.

## SubTurtle (autonomous worker)

```bash
./super_turtle/subturtle/ctl start   # spawn a SubTurtle
./super_turtle/subturtle/ctl status  # check if running
./super_turtle/subturtle/ctl logs    # tail output
./super_turtle/subturtle/ctl stop    # stop
```
