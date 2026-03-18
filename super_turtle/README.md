# SuperTurtle

SuperTurtle is a Telegram-controlled coding agent runtime that ships as a single npm package.

## Install

```bash
npm install -g superturtle
```

## Initialize a project

```bash
superturtle init
```

That creates the local `.superturtle/` project state used by the bot runtime, teleport, and SubTurtles.

The repo-root `.env.example` is the reference template. The actual env file is stored in `.superturtle/.env` together with project config and SuperTurtle state, and it is created by `superturtle init`.

## Common commands

```bash
superturtle start
superturtle service run
superturtle stop
superturtle status
superturtle doctor
```

## E2B and managed runtime

The same published package is used for:

- local installs
- E2B teleport sandboxes
- managed hosted runtimes

For the current E2B beta-package workflow, see `docs/E2B_BETA_RUNTIME_DX.md`.
