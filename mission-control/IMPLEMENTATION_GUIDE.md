# Mission Control Implementation Guide

This document explains how Mission Control is structured today, what has already been implemented, and how to continue building the remaining features.

---

# 1. Product goal

Mission Control is a control-plane UI for OpenClaw.

It combines:
- an operational dashboard for agents, sessions, tasks, events, and health
- an **Office View** where agents appear like desks/tables in a shared workspace
- realtime visibility into live OpenClaw runtime presence
- a foundation for future in-app interaction with the assistant

---

# 2. Current implementation status

## Already implemented

### Backend
- Fastify-based API in `apps/api`
- route validation schemas for mutations and ID-based routes
- websocket endpoint at `GET /ws/v1`
- live OpenClaw runtime presence adapter
- runtime sync loop
- runtime change diffing + websocket broadcasts
- mock/in-memory task/event persistence layer
- PostgreSQL bootstrap SQL files + setup docs

### Frontend
- Next.js app-router app in `apps/web`
- dashboard UI with:
  - stats
  - Office View
  - sessions summary
  - task board
  - alerts
  - events
  - realtime status card
- frontend now fetches from the backend API
- first-pass websocket client path for realtime state/status

### Shared contracts
- domain models in `packages/contracts`
- REST contract types
- websocket contract types

---

# 3. Repository structure

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

# 4. Backend architecture

## 4.1 Main layers

### `src/server.js`
Bootstraps the Fastify server.
Registers:
- REST routes
- websocket routes
- runtime sync / integration startup

### `src/api/`
Transport layer.
Responsible for:
- route registration
- request validation
- HTTP response formatting

### `src/domain/`
Application logic.
Responsible for:
- repository access
- composing view models
- commands/mutations
- task/event/session logic

### `src/realtime/`
Websocket handling.
Responsible for:
- connection hello
- snapshot push
- fanout broadcasting
- heartbeat/health pushes

### `src/integrations.openclaw-runtime.js`
Runtime adapter.
Responsible for:
- reading live OpenClaw runtime presence
- mapping runtime output into Mission Control domain entities
- diffing runtime snapshots
- triggering live updates

---

# 5. Frontend architecture

## 5.1 Main layers

### `app/`
Next.js app-router UI.
Key files include:
- `app/page.tsx`
- `app/layout.tsx`
- `app/globals.css`
- realtime/status UI helpers

### `lib/api.ts`
Frontend API client.
Responsible for fetching:
- overview
- agents
- tasks
- events
- rooms

### Realtime path
Frontend connects to backend websocket and applies live state/snapshot updates.

Current state:
- enough for live presence/status updates
- not yet a full robust client-side state engine with reconnection/backoff/stale strategies

---

# 6. Feature breakdown

## 6.1 Overview dashboard
Shows:
- active agent count
- active session count
- task state counts
- health
- alerts
- recent events

### Data sources
- `/api/v1/overview`
- websocket `overview.snapshot`
- websocket `health.updated`

---

## 6.2 Office View
Shows agents in grouped rooms.

### Current behavior
- live runtime agents are grouped into generated runtime room(s)
- office cards reflect live presence when available
- fallback/mock task/event data still exists beside runtime presence

### Current limitation
Task linkage for live runtime agents is still not fully real.

---

## 6.3 Sessions / live presence
Current active OpenClaw sessions/subagents are mapped into:
- agent cards
- session entries
- health/overview state

### Current runtime source
The backend currently uses OpenClaw CLI/runtime output as a lightweight integration source.

### Current limitation
This is not yet a fully abstracted gateway-native client.

---

## 6.4 Realtime updates
Current websocket events include:
- `connection.hello`
- `overview.snapshot`
- `health.updated`
- `agent.updated`
- `session.updated`
- `event.created`
- `task.updated`

### Current behavior
Runtime changes trigger websocket updates so presence appears/disappears without refresh.

### Current limitation
Explicit removal/delete events are not yet first-class; removals are handled through snapshot resync.

---

# 7. Database setup

## Current database artifacts
- `apps/api/db/migrations/0001_init.sql`
- `apps/api/db/seed/0001_mock_seed.sql`
- `apps/api/db/README.md`

## Current reality
Postgres bootstrap files exist, but the runtime repository is still primarily in-memory.

That means:
- SQL schema exists
- setup path exists
- the app is not yet fully reading/writing production data through Postgres

## Goal of the DB layer
Move these concerns into Postgres:
- tasks
- task history
- retained events
- rooms/placements
- command audit
- eventually cached runtime snapshots if useful

---

# 8. Environment variables

Use a root `.env` file.

Example:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/mission_control
MISSION_CONTROL_API_URL=http://localhost:4000
HOST=0.0.0.0
PORT=4000
NODE_ENV=development
NEXT_PUBLIC_MISSION_CONTROL_API_URL=http://localhost:4000
```

---

# 9. Local setup

## 9.1 Install dependencies

```bash
cd /path/to/mission-control
npm install
```

## 9.2 Create database

```bash
createdb mission_control
```

## 9.3 Run migration

```bash
npm run db:migrate
```

## 9.4 Seed mock data

```bash
npm run db:seed
```

## 9.5 Start backend

```bash
npm run dev:api
```

## 9.6 Start frontend

```bash
npm run dev:web
```

Frontend:
- `http://localhost:3000`

API:
- `http://localhost:4000/api/v1/overview`

---

# 10. How the live presence feature works

## Step 1 — runtime sync
The backend periodically reads active OpenClaw runtime presence.

## Step 2 — map into domain model
Runtime output is transformed into Mission Control entities.

## Step 3 — diff snapshots
The current snapshot is compared to the previous snapshot.

## Step 4 — publish changes
On change, websocket events are broadcast.

## Step 5 — UI updates
Frontend receives those events and refreshes displayed state.

---

# 11. How to continue implementation

## Phase 1 — Presence mode
Status: mostly implemented.

Includes:
- live assistant/session visibility
- realtime presence updates
- Office View presence

### Remaining polish
- better stale/offline detection
- richer status mapping
- cleaner room placement rules
- explicit delete/remove websocket events

---

## Phase 2 — Talk to Kite inside Mission Control
This is the next major product feature.

### Goal
Add an in-app chat panel or drawer that lets the user talk to the assistant from Mission Control itself.

### Required pieces

#### Frontend
- chat panel component
- session/thread selector
- message list
- input box
- loading/streaming states

#### Backend
- route to send message into current OpenClaw session
- optional route to fetch recent transcript/messages
- optional streaming or polling mechanism for responses

#### Integration
Possible backend actions:
- send session message to active assistant session
- fetch session history
- map transcript into Mission Control message format

### Suggested UI shape
- right-side drawer called **Talk to Kite**
- click current live assistant card to open it
- show recent conversation + input field

### Recommended build order
1. add backend route for message send
2. add backend route for transcript/history read
3. build chat drawer UI
4. wire it to active assistant session
5. add live reply updates

---

## Phase 3 — Real persistence
Move off the in-memory repository.

### Replace with Postgres-backed repository
Target:
- `tasks`
- `task_history`
- `events`
- `rooms`
- `placements`
- `command_audit`

### Recommended steps
1. create repository interface boundary
2. implement Postgres repository
3. switch task/event flows to DB
4. retain websocket broadcasts on successful writes

---

## Phase 4 — Better OpenClaw integration
Current runtime integration is already useful, but not the final shape.

### Improve by adding
- proper OpenClaw client abstraction
- gateway-native integration where possible
- richer health/node/session metadata
- better error handling / degraded-state behavior

---

# 12. Recommended next engineering tasks

## Best immediate next task
Build **Phase 2: Talk to Kite panel**.

Why:
- presence mode now exists
- live runtime presence now updates
- the next obvious user-facing value is interacting with Kite from inside Mission Control

## If you want backend-first first
Do this order:
1. transcript/history route
2. send-message route
3. websocket reply updates
4. chat drawer UI

## If you want data-first first
Do this order:
1. Postgres repository implementation
2. migrate task/event storage off memory
3. keep live runtime adapter on top

---

# 13. Known limitations

Current limitations include:
- task correlation for live runtime agents is still partial
- some event/task data is still mocked/in-memory
- runtime integration is CLI-shaped, not yet fully abstracted client-side
- explicit websocket delete events are not yet first-class
- reconnect/stale UX can still improve

---

# 14. Definition of done for the major features

## Presence mode done when
- active assistant and subagents show live
- appear/disappear without refresh
- Office View reflects runtime changes reliably
- stale/offline state is visually clear

## Chat mode done when
- user can talk to Kite from inside Mission Control
- current session is selectable or auto-resolved
- replies appear in the app
- failures/disconnects are handled gracefully

## Persistence done when
- tasks/events/rooms are backed by Postgres
- app restart does not wipe those entities
- realtime broadcasts still work against DB writes

---

# 15. Related docs

Also read:
- `mission-control/MONOREPO.md`
- `mission-control/WIREFRAMES.md`
- `mission-control/IMPLEMENTATION_CHECKLIST.md`
- `apps/api/db/README.md`

---

# 16. Short version

If you only want the practical roadmap:

1. Presence mode — done enough to use
2. Phase 2 — add Talk to Kite panel
3. Replace in-memory repository with Postgres
4. Improve OpenClaw integration depth
5. Polish reliability and UX
