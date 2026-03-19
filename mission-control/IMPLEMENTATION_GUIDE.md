# Mission Control Complete Implementation Guide

This is the full end-to-end implementation guide for **OpenClaw Mission Control**.

It is intended to answer:
- what Mission Control is
- what has already been built
- how the system is structured
- how to run it locally
- how to implement the remaining features
- what the full roadmap looks like from start to finish

This document is the canonical build guide for the project.

---

# 1. Product vision

Mission Control is a control-plane application for OpenClaw.

It combines three ideas:

1. **Ops dashboard**
   - shows agents, sessions, tasks, events, health, and system activity

2. **Office View**
   - shows agents as desks/tables in rooms
   - gives a spatial model of what the system is doing

3. **Assistant workspace**
   - eventually lets the user interact with Kite directly inside Mission Control
   - supports observability first, then orchestration, then in-app collaboration

The long-term goal is not just “a dashboard.”
It is a **live command center for OpenClaw**.

---

# 2. End-state product goals

Mission Control should eventually allow a user to:

- see all active OpenClaw agents and sessions
- understand what each agent is doing
- detect blocked or stale work
- inspect events and health in realtime
- understand multi-agent collaboration spatially
- assign work and send instructions
- talk to Kite from inside the app
- review history, audit trails, and runtime changes
- operate from persistent storage rather than mock memory

---

# 3. Current implementation state

## Already implemented

### Backend
- Fastify API in `apps/api`
- modular route layer
- validation schemas for ID routes and mutations
- websocket endpoint `GET /ws/v1`
- live OpenClaw runtime presence integration
- runtime snapshot diffing and broadcast updates
- mock/in-memory task/event storage
- Postgres bootstrap SQL and seed files

### Frontend
- Next.js app-router frontend in `apps/web`
- Mission Control dashboard shell
- API-backed data fetching
- websocket-backed realtime status/live update path
- Office View + dashboard layout preserved from design direction

### Realtime
- `connection.hello`
- `overview.snapshot`
- `health.updated`
- `agent.updated`
- `session.updated`
- `task.updated`
- `event.created`
- runtime presence changes now broadcast live

### Docs
- setup docs
- DB bootstrap docs
- implementation checklist
- this full implementation guide

---

# 4. Repository structure

```text
apps/
  api/
    db/
      migrations/
      seed/
    src/
      api/
      domain/
      realtime/
      integrations.openclaw-runtime.js
      server.js
  web/
    app/
    lib/
packages/
  contracts/
mission-control/
  IMPLEMENTATION_CHECKLIST.md
  IMPLEMENTATION_GUIDE.md
  MONOREPO.md
  WIREFRAMES.md
```

---

# 5. Architecture overview

## 5.1 Backend
The backend is the control plane.

Responsibilities:
- aggregate runtime state
- normalize entities
- expose REST APIs
- expose websocket updates
- execute commands
- eventually persist operational data

## 5.2 Frontend
The frontend is the operator surface.

Responsibilities:
- render overview/dashboard state
- render Office View
- connect to REST + websocket
- eventually host chat/intervention controls

## 5.3 Contracts package
Shared types between frontend and backend.

Responsibilities:
- domain entities
- API response/request shapes
- websocket event payloads

---

# 6. Core domain model

Mission Control revolves around these entities:

## Agent
Represents a worker identity.

## Session
Represents a live runtime/execution context.

## Task
Represents work tracked by Mission Control.

## Event
Represents a timeline record.

## Room
Represents a group/zone in Office View.

## Placement
Represents where an agent appears spatially in Office View.

---

# 7. Environment and local setup

## 7.1 `.env`
Place `.env` in the repo root.

Example:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/mission_control
MISSION_CONTROL_API_URL=http://localhost:4000
NEXT_PUBLIC_MISSION_CONTROL_API_URL=http://localhost:4000
HOST=0.0.0.0
PORT=4000
NODE_ENV=development
```

## 7.2 Install

```bash
npm install
```

## 7.3 Create database

```bash
createdb mission_control
```

## 7.4 Run migrations

```bash
npm run db:migrate
```

## 7.5 Seed mock data

```bash
npm run db:seed
```

## 7.6 Start API

```bash
npm run dev:api
```

## 7.7 Start web

```bash
npm run dev:web
```

## 7.8 URLs
- Web: `http://localhost:3000`
- API: `http://localhost:4000/api/v1/overview`
- WebSocket: `ws://localhost:4000/ws/v1`

---

# 8. Database bootstrap

Current DB bootstrap files:
- `apps/api/db/migrations/0001_init.sql`
- `apps/api/db/seed/0001_mock_seed.sql`
- `apps/api/db/README.md`

## Important note
The app is **not yet fully DB-backed**.

Right now:
- schema exists
- migration path exists
- seed path exists
- runtime/task/event repository is still partly in-memory

That is intentional for the current stage.

---

# 9. Current API surface

## Read routes
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

## Write routes
- `POST /api/v1/tasks`
- `PATCH /api/v1/tasks/:id`
- `POST /api/v1/tasks/:id/assign`
- `POST /api/v1/tasks/:id/retry`
- `POST /api/v1/sessions/:id/message`
- `POST /api/v1/sessions/:id/stop`

## WebSocket
- `GET /ws/v1`

---

# 10. Current realtime protocol

Current websocket events include:
- `connection.hello`
- `overview.snapshot`
- `health.updated`
- `agent.updated`
- `session.updated`
- `task.updated`
- `event.created`

Current behavior:
- initial hello + snapshot on connect
- runtime changes are diffed and broadcast
- removals are currently reconciled through `overview.snapshot`

---

# 11. Start-to-finish implementation roadmap

This is the recommended order for the entire product.

---

# Phase 0 — Foundation and scaffolding

## Goal
Create a working monorepo structure and agree on contracts.

## Delivered
- root workspace config
- `apps/api`
- `apps/web`
- `packages/contracts`
- planning docs
- wireframes
- initial README/docs

## Why it mattered
Without this, later work would drift.

---

# Phase 1 — Presence mode

## Goal
Make Mission Control show **real OpenClaw presence** instead of only static mock agents.

## What Phase 1 includes
- live runtime adapter
- mapping active OpenClaw sessions/subagents into Mission Control entities
- generated runtime room
- showing real active assistant presence in Office View / dashboard

## Delivered
- runtime integration path
- live runtime-backed agents/sessions
- overview/health linked to runtime presence
- runtime sync loop

## Remaining Phase 1 polish
- richer status mapping
- better stale/offline detection
- configurable room placement rules
- richer runtime metadata enrichment
- better live task linkage

---

# Phase 1.5 — Live runtime broadcasting

## Goal
Make presence updates appear in the UI immediately without refresh.

## What Phase 1.5 includes
- runtime snapshot diffing
- broadcast of runtime changes over websocket
- overview resync when entities disappear
- live UI updates for appearance/disappearance/change

## Delivered
- runtime diff logic
- `agent.updated`
- `session.updated`
- `overview.snapshot`
- `health.updated`
- UI refresh path for runtime changes

## Remaining polish
- explicit removal/delete events instead of relying on snapshot reconciliation
- reconnect/backoff UX
- stale/disconnected banners and state treatment

---

# Phase 2 — Talk to Kite inside Mission Control

## Goal
Add a chat surface inside Mission Control so the user can interact with Kite directly.

## Product result
The user opens Mission Control and can:
- click Kite’s live card
- open a chat drawer/panel
- send a message
- receive a reply
- inspect the current assistant session

## Required backend work
- route to send messages into the active assistant session
- route to fetch recent transcript/history
- optional reply streaming path or message polling
- route/session resolution logic for active assistant session

## Required frontend work
- chat drawer/panel
- transcript list
- message input
- loading/streaming state
- error/disconnected state
- optional session picker

## Suggested implementation order
1. add transcript/history API route
2. add send-message API route
3. add chat drawer UI
4. connect to active assistant session
5. add live reply updates

## Definition of done
- user can talk to Kite inside the app
- reply appears in app reliably
- active session is resolved automatically or chosen explicitly
- errors are handled cleanly

---

# Phase 3 — Real persistence

## Goal
Move Mission Control-owned state off in-memory storage and into Postgres.

## What should become persistent
- tasks
- task history
- events
- rooms
- placements
- command audit
- optionally runtime snapshots/cache

## Required backend work
- repository abstraction boundary
- Postgres repository implementation
- migration-driven schema usage
- read/write flow moved off in-memory arrays
- websocket broadcast triggered after DB writes

## Suggested implementation order
1. define repository interface
2. implement Postgres-backed repository
3. move tasks + task history first
4. move events next
5. move rooms/placements next
6. add command audit

## Definition of done
- restart no longer wipes Mission Control-owned data
- tasks/events persist across runs
- db-backed writes still trigger realtime updates

---

# Phase 4 — Better OpenClaw integration depth

## Goal
Replace the current lightweight runtime adapter with a more robust integration boundary.

## Improve
- better OpenClaw client abstraction
- richer gateway/node/health/session metadata
- stronger failure handling
- cleaner transport boundaries
- less CLI-shaped coupling

## Suggested work
1. formalize runtime integration module interface
2. isolate mapping logic from transport acquisition
3. enrich session/agent health metadata
4. expose clearer degraded-state semantics

## Definition of done
- runtime adapter is clearly abstracted
- richer and more stable domain mapping
- backend no longer feels tied to a thin first-pass runtime scraping approach

---

# Phase 5 — Orchestration controls

## Goal
Turn Mission Control into a real intervention surface, not just a viewer.

## Features
- assign/reassign tasks
- retry failed work
- stop/pause sessions
- send intervention messages
- inspect command/audit trail

## Current status
Partial groundwork exists.

Already present:
- task mutations
- session stop/message endpoints

Still needed:
- polished UI controls
- audit views
- stronger validation/permissions
- better operator workflow in the frontend

## Definition of done
- operator can intervene cleanly from UI
- actions are visible, auditable, and reflected in realtime

---

# Phase 6 — Historical views and auditability

## Goal
Make Mission Control useful for debugging and analysis, not only live operations.

## Features
- persisted events timeline
- retained task history
- command audit
- session history correlation
- possibly time-window filters and replay-ish behavior

## Suggested order
1. persist events
2. add event filters and pagination
3. add command audit UI
4. add richer history/detail panes

## Definition of done
- operator can answer “what happened?” after the fact
- event/task/session history is inspectable and durable

---

# Phase 7 — UX polish and operator reliability

## Goal
Make Mission Control feel trustworthy and production-shaped.

## Needed improvements
- loading states
- reconnect/backoff behavior
- stale/disconnected UI
- clearer error surfaces
- accessibility review
- keyboard navigation
- denser but more readable component structure
- Office View layout polish

## Definition of done
- app remains legible during failures
- realtime behavior is understandable
- operators trust what they are seeing

---

# Phase 8 — Advanced rooming and collaboration model

## Goal
Move beyond a generated runtime room into configurable spaces.

## Features
- custom rooms
- room assignment rules
- placement persistence
- team/workflow grouping
- room filters
- maybe operator-specific saved layouts

## Definition of done
- Office View becomes an intentional workspace, not only a generated cluster

---

# Phase 9 — Smarter analytics / intelligence layer

## Goal
Make Mission Control proactively informative.

## Potential features
- blocked work detection
- stale session recommendations
- workload balancing suggestions
- summary generation
- “why is this blocked?” explanations
- anomaly surfacing

## Definition of done
- Mission Control helps interpret system state, not only display it

---

# 12. Full implementation order recommendation

If building from today forward, this is the recommended sequence:

1. Presence mode
2. Live runtime broadcasting
3. Talk to Kite panel
4. Postgres-backed repository
5. Better OpenClaw integration boundary
6. Frontend orchestration controls
7. Event/audit persistence and history
8. UX resilience and polish
9. Configurable office/room model
10. Intelligence/analytics layer

---

# 13. Practical engineering task list by area

## Backend next tasks
- create transcript/history route for assistant session
- create assistant session resolution helper
- persist tasks/events to Postgres
- add runtime delete/remove websocket events
- formalize repository interfaces
- formalize OpenClaw client abstraction

## Frontend next tasks
- build Talk to Kite drawer
- split dashboard into reusable components
- add richer websocket state handling
- add stale/disconnected UX
- add action controls on agent/session/task cards

## Data next tasks
- hook current SQL schema into repository layer
- add DB-backed tasks/events/rooms
- preserve websocket fanout on successful writes

---

# 14. How to implement Phase 2 specifically

## Frontend spec
Add a right-side drawer called **Talk to Kite**.

### Contents
- session badge
- connection status
- recent messages
- message composer
- send button

### Entry points
- click Kite card
- top-nav action button
- maybe command palette later

## Backend spec
Add:
- `GET /api/v1/chat/session` or equivalent assistant-session resolver
- `GET /api/v1/chat/history`
- `POST /api/v1/chat/message`

## Realtime enhancement
Optionally stream replies via websocket or trigger snapshot refresh on new messages.

---

# 15. How to implement Phase 3 specifically

## Step 1
Create repository interfaces:
- tasks repository
- events repository
- rooms repository
- command audit repository

## Step 2
Implement Postgres adapters.

## Step 3
Replace in-memory writes with DB writes.

## Step 4
Keep websocket fanout after successful persistence.

## Step 5
Move read endpoints to DB-backed reads.

---

# 16. Known limitations right now

Current limitations include:
- live task correlation is still partial
- some event/task data remains mock/in-memory
- runtime adapter is still a first-pass implementation
- websocket removal handling is still partly snapshot-based
- frontend reconnect/state resiliency can improve
- chat-in-app is not implemented yet
- Postgres is not yet the active storage layer for core entities

---

# 17. Definition of done by milestone

## Presence mode done when
- live assistant/session presence is visible
- appears/disappears without refresh
- Office View reflects runtime changes
- stale/offline state is reasonably surfaced

## Chat mode done when
- user can message Kite from Mission Control
- replies render in app
- active session resolves correctly
- failures/disconnects are handled

## Persistence mode done when
- tasks/events/rooms survive restart
- DB becomes source of truth for Mission Control-owned data
- realtime updates still work against DB writes

## Operations mode done when
- user can inspect, intervene, assign, retry, and stop from UI
- changes are auditable and reflected live

---

# 18. Best next step right now

The strongest next step is:

## Build Phase 2 — Talk to Kite inside Mission Control

Reason:
- presence is now live
- runtime updates are now live
- the next obvious user value is actual in-app interaction

If backend/data-first is preferred instead, the alternative next step is:
- implement Postgres-backed repositories before adding chat

---

# 19. Related documents

Also read:
- `README.md`
- `mission-control/IMPLEMENTATION_CHECKLIST.md`
- `mission-control/MONOREPO.md`
- `mission-control/WIREFRAMES.md`
- `apps/api/db/README.md`

---

# 20. Short roadmap summary

If you only need the compact version:

1. Foundation
2. Presence mode
3. Realtime presence updates
4. Talk to Kite panel
5. Postgres-backed persistence
6. Better OpenClaw integration
7. Frontend control workflows
8. History/audit
9. UX polish
10. Configurable office model
11. Intelligence layer

That is the full start-to-finish Mission Control roadmap.
