# agentic

Autonomous coding system: **Super Turtle** (meta agent) directs **SubTurtles** (autonomous coding loops) that plan, groom state, execute, and review — one commit at a time.

## Meta agent (from PC)

```bash
./super_turtle/meta/claude-meta
```

## Meta agent (from Telegram)

Message the bot. It runs Claude with access to the repo — ask it anything.

## SubTurtles (autonomous workers)

Each SubTurtle gets its own workspace at `.subturtles/<name>/` with its own CLAUDE.md state file. Multiple can run concurrently on different tasks.

```bash
./super_turtle/subturtle/ctl start [name]    # spawn a SubTurtle (default: 'default')
./super_turtle/subturtle/ctl stop  [name]    # stop it
./super_turtle/subturtle/ctl status [name]   # check if running
./super_turtle/subturtle/ctl logs  [name]    # tail output
./super_turtle/subturtle/ctl list            # list all SubTurtles
```
