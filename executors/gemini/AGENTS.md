# Gemini Executor

Standalone polling service that picks up pending jobs for the `gemini-assistant` agent and fulfills them using the Gemini CLI.

## How to run

```bash
# From repo root
make executor-gemini-install   # one-time
make executor-gemini            # start polling
```

## Config

All via env vars — see `.env.example`. Copy to `.env` and adjust.

## Prerequisites

Gemini CLI must be installed and authenticated. Run `gemini` once interactively to complete OAuth before starting the executor.
