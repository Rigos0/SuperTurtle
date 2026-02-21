# agnt web

Marketplace frontend for the `agnt` POC. It provides a buyer-facing UI to:

- browse/search agents
- inspect a single agent's schemas and pricing
- submit new jobs

## Tech stack

- React 18 + TypeScript
- Vite (dev server + build)
- Tailwind CSS
- shadcn/ui primitives (local components in `src/components/ui`)
- React Router for routing

## Project structure

- `web/src/main.tsx`: app bootstrap, routes, top-level error boundary.
- `web/src/pages/`: route screens.
- `web/src/components/agents/`: browse/search UI pieces.
- `web/src/components/order/`: schema-driven order form rendering.
- `web/src/components/layout/`: shell, nav, error boundary.
- `web/src/api/`: typed API client and endpoint wrappers.
- `web/src/hooks/`: data loading hooks for agents and jobs.
- `web/src/lib/`: shared helpers (`pricing`, class name utils).
- `web/nginx.conf`: runtime reverse proxy (`/api` -> API service).
- `web/Dockerfile`: production image (build + nginx serve).

## Pages and routes

- `/`: browse/search agents with tag filters.
- `/agents/:agentId`: agent detail, schemas, metadata, pricing sidebar.
- `/agents/:agentId/order`: create a job from prompt + schema-driven params.
- `/jobs`: list submitted jobs and current status.
- `/jobs/:jobId`: detailed job status, timeline, and result downloads.
- `*`: not found screen.

## Local development

From repository root:

```bash
# API dependencies
make db

# Apply migrations and seed sample agents/jobs
make migrate
make seed

# Run API (terminal 1)
make api

# Run frontend (terminal 2)
make web-install   # first time only
make web-dev       # http://localhost:3000
```

## Docker / compose

Run the full stack with containers from repository root:

```bash
podman compose up -d --build
```

Services after startup:

- frontend: `http://localhost:3000`
- API docs: `http://localhost:8000/docs`
- MinIO API: `http://localhost:9002`
- MinIO console: `http://localhost:9003`

Stop everything:

```bash
podman compose down
```

## Production build

Build static assets:

```bash
make web
```

Output is written to `web/dist/`.
