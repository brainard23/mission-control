# OpenClaw Mission Control

Mission Control is a control-plane UI for OpenClaw.

It combines:
- an operational dashboard for agents, sessions, tasks, events, and health
- an **Office View** where agents appear at tables/desks so multi-agent work is easier to understand visually

## Current status
This repository currently contains a **mock MVP skeleton**:
- modular backend scaffold in `apps/api`
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
  api/          # backend scaffold + mock data routes
  web/          # frontend shell + mock dashboard renderer
packages/
  contracts/    # shared domain/API/websocket contracts
mission-control/
  README.md
  MONOREPO.md
  WIREFRAMES.md
  IMPLEMENTATION_CHECKLIST.md
```

## Current mock API routes
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

## Local development

### API
```bash
node apps/api/src/server.js
```

### Web shell
```bash
node apps/web/src/server.js
```

Then open:
- API: `http://localhost:4000`
- Web: `http://localhost:3000`

## Recommended next steps
1. replace the lightweight HTTP layer with Fastify
2. replace the rendered Node web shell with a real Next.js app
3. add WebSocket updates
4. replace mock data with repositories + Postgres
5. wire the backend to real OpenClaw runtime state
