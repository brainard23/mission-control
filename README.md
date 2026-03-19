# OpenClaw Mission Control

Mission Control is a control-plane UI for OpenClaw.

It combines:
- an operational dashboard for agents, sessions, tasks, events, and health
- an **Office View** where agents appear at tables/desks so multi-agent work is easier to understand visually

## Current status
This repository currently contains a **mock MVP skeleton**:
- Fastify-based backend scaffold in `apps/api`
- rendered frontend shell in `apps/web`
- shared contracts in `packages/contracts`
- planning and design artifacts in `mission-control/`

It is not production-ready yet, but it is structured to evolve into:
- Fastify backend
- Next.js frontend
- PostgreSQL persistence
- WebSocket realtime updates
- OpenClaw runtime integration

## Repository layout

```text
apps/
  api/          # backend scaffold + mock data routes + websocket shell
  web/          # frontend shell + mock dashboard renderer
packages/
  contracts/    # shared domain/API/websocket contracts
mission-control/
  README.md
  MONOREPO.md
  WIREFRAMES.md
  IMPLEMENTATION_CHECKLIST.md
```

## Prerequisites
- Node.js 22+ recommended
- npm 10+ recommended

## Setup locally

### 1. Clone the repository
```bash
git clone https://github.com/brainard23/mission-control.git
cd mission-control
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run the API
```bash
npm run dev:api
```

This starts the backend on:
- `http://localhost:4000`

### 4. Run the web shell
In a second terminal:
```bash
npm run dev:web
```

This starts the mock frontend shell on:
- `http://localhost:3000`

## Local scripts

### Root
```bash
npm run dev:api
npm run dev:web
npm run build
npm run typecheck
```

### API only
```bash
npm --workspace @mission-control/api run dev
npm --workspace @mission-control/api run build
npm --workspace @mission-control/api run typecheck
```

### Web only
```bash
npm --workspace @mission-control/web run dev
npm --workspace @mission-control/web run build
npm --workspace @mission-control/web run typecheck
```

## Current API routes
- `GET /health`
- `GET /api/v1/health`
- `GET /api/v1/overview`
- `GET /api/v1/agents`
- `GET /api/v1/agents/:id`
- `GET /api/v1/sessions`
- `GET /api/v1/sessions/:id`
- `GET /api/v1/tasks`
- `GET /api/v1/tasks/:id`
- `GET /api/v1/events`
- `GET /api/v1/rooms`
- `POST /api/v1/tasks`
- `PATCH /api/v1/tasks/:id`
- `POST /api/v1/tasks/:id/assign`
- `POST /api/v1/tasks/:id/retry`
- `POST /api/v1/sessions/:id/message`
- `POST /api/v1/sessions/:id/stop`
- `GET /ws/v1` — websocket shell (hello + mock health heartbeat)

## Notes on the current implementation
- data is still mocked/in-memory
- the web app is still a rendered Node shell, not Next.js yet
- websocket support is only a shell for now
- route validation schemas are now wired into Fastify for the mutation endpoints and ID-based routes

## Recommended next steps
1. split Fastify routes into per-resource modules
2. replace the rendered Node web shell with a real Next.js app
3. connect the web app to the API instead of local mock data
4. replace mock repositories with Postgres-backed persistence
5. wire the backend to real OpenClaw runtime state
