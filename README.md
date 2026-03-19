# OpenClaw Mission Control

Mission Control is a control-plane UI for OpenClaw.

It combines:
- an operational dashboard for agents, sessions, tasks, events, and health
- an **Office View** where agents appear at tables/desks so multi-agent work is easier to understand visually

## Current status
This repository currently contains a **mock MVP skeleton with a practical realtime pass and first live OpenClaw runtime presence adapter**:
- Fastify-based backend scaffold in `apps/api`
- Next.js frontend in `apps/web`, fetching dashboard data from the API
- shared contracts in `packages/contracts`
- planning and design artifacts in `mission-control/`
- first-pass PostgreSQL migration + seed files in `apps/api/db`

It is not production-ready yet, but it is structured to evolve into:
- Fastify backend
- Next.js frontend
- PostgreSQL persistence
- WebSocket realtime updates
- OpenClaw runtime integration

## Repository layout

```text
apps/
  api/          # backend scaffold + mock routes + realtime + db bootstrap files
  web/          # Next.js app-router frontend shell + live dashboard state
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
- PostgreSQL 15+ recommended for local DB setup

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

### 3. Optional: set up PostgreSQL locally
Set a connection string:

```bash
export DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/mission_control
```

Create the database and load the first migration + seed:

```bash
createdb mission_control
npm run db:migrate
npm run db:seed
```

More detail lives in `apps/api/db/README.md`.

### 4. Run the API
```bash
npm run dev:api
```

This starts the backend on:
- `http://localhost:4000`

### 5. Run the web app
In a second terminal:
```bash
npm run dev:web
```

This starts the Next.js frontend on:
- `http://localhost:3000`

By default, the frontend calls the API at `http://127.0.0.1:4000`.
Override that if needed with:
```bash
MISSION_CONTROL_API_URL=http://your-api-host:4000 npm run dev:web
```

## Local scripts

### Root
```bash
npm run dev:api
npm run dev:web
npm run build
npm run typecheck
npm run db:migrate
npm run db:seed
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
- `GET /ws/v1` — websocket stream with hello, snapshot, mutation broadcasts, and health heartbeat

## Realtime status
Current websocket behavior is now intentionally useful, not just a shell:
- sends `connection.hello` on connect
- sends `overview.snapshot` immediately after connect for fast resync
- broadcasts `task.updated`, `session.updated`, `agent.updated`, and `event.created` on in-memory mutations
- emits periodic `health.updated` heartbeats
- frontend applies websocket updates client-side so task board, office cards, event feed, and infra status refresh without a page reload

This is still mock/in-memory state, but it preserves the intended architecture for later runtime adapters and a Postgres repository.

## PostgreSQL status
Postgres is now documented and bootstrapped at a first-pass level:
- `apps/api/db/migrations/0001_init.sql` — initial schema
- `apps/api/db/seed/0001_mock_seed.sql` — seed aligned with the current mock data
- `apps/api/db/README.md` — local setup instructions

The API does **not** persist to Postgres yet. That is the next repository-layer step, not part of this pass.

## Notes on the current implementation
- tasks/events/mutations are still mocked/in-memory on the API side
- agent/session presence now prefers live OpenClaw runtime data from the local CLI (`openclaw sessions --all-agents --active ... --json` + `openclaw system presence --json`) and falls back to mock agents/sessions when live data is unavailable
- the web app is a real Next.js app-router frontend fetching overview, rooms, agents, tasks, and events from the API
- the frontend now keeps a live local dashboard state hydrated by websocket snapshots + mutation events
- the Office View can now show the current main assistant and active subagents in a generated `Live Runtime` room when OpenClaw session data is available
- websocket support now includes snapshot resync and mutation-driven broadcasts
- route validation schemas are wired into Fastify for the mutation endpoints and ID-based routes

## Recommended next steps
1. introduce a repository adapter boundary so the API can swap mock storage for Postgres cleanly
2. persist mutation-generated events and audit records in the database-backed repository
3. replace mock health/runtime values with real OpenClaw gateway + runtime sync state
4. split frontend sections into focused route-level pages and add command surfaces
5. add reconnect backoff and stale-data indicators in the dashboard UI
