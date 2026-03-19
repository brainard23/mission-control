# Mission Control Implementation Checklist

## Milestone 0 — Foundation
- [x] Create monorepo structure (`apps/web`, `apps/api`, `packages/contracts`)
- [x] Add shared TS config and lint config
- [x] Wire package manager workspace
- [ ] Add environment variable strategy

## Milestone 1 — Contracts and schema
- [x] Finalize shared domain contracts
- [x] Finalize API request/response contracts
- [x] Finalize websocket contracts
- [x] Implement PostgreSQL schema
- [x] Add migrations
- [x] Seed default rooms

## Milestone 2 — Backend control plane
- [x] Create Fastify app shell
- [x] Add health route
- [ ] Build OpenClaw client abstraction
- [ ] Implement adapters for sessions/subagents/nodes/gateway
- [ ] Implement runtime sync loop
- [ ] Implement reconciler and stale detection
- [x] Add in-memory runtime cache

## Milestone 3 — Core APIs
- [x] `GET /api/v1/overview`
- [x] `GET /api/v1/agents`
- [x] `GET /api/v1/agents/:id`
- [x] `GET /api/v1/sessions`
- [x] `GET /api/v1/sessions/:id`
- [x] `GET /api/v1/tasks`
- [x] `GET /api/v1/tasks/:id`
- [x] `GET /api/v1/events`
- [x] `GET /api/v1/rooms`
- [x] `GET /api/v1/health`

## Milestone 4 — Mutations and audit
- [x] `POST /api/v1/tasks`
- [x] `PATCH /api/v1/tasks/:id`
- [x] `POST /api/v1/tasks/:id/assign`
- [x] `POST /api/v1/tasks/:id/retry`
- [x] `POST /api/v1/sessions/:id/message`
- [x] `POST /api/v1/sessions/:id/stop`
- [ ] Add command audit trail
- [x] Emit events for all mutations

## Milestone 5 — Realtime
- [x] WebSocket server `/ws/v1`
- [x] connection hello event
- [x] `agent.updated`
- [x] `session.updated`
- [x] `task.updated`
- [x] `event.created`
- [x] `health.updated`
- [x] reconnect handling and snapshot resync

## Milestone 6 — Frontend shell
- [x] Build app shell and navigation
- [ ] Add query client and websocket client
- [x] Build overview page
- [x] Build sessions page
- [x] Build tasks page
- [x] Build events page
- [ ] Add right-side detail drawer

## Milestone 7 — Office View
- [x] Build rooms + placements query layer
- [x] Build Office page layout
- [x] Build agent desk cards
- [ ] Add filters/search
- [ ] Add activity rail
- [ ] Add selected detail panel
- [x] Add working/waiting/blocked visual states

## Milestone 8 — Polish
- [ ] disconnected/reconnecting banner
- [x] loading/empty states
- [ ] keyboard navigation pass
- [ ] accessibility pass
- [ ] performance test with 20–50 active agents
- [ ] event retention and cleanup strategy

## Suggested build order
1. contracts
2. DB schema
3. OpenClaw client/adapters
4. runtime sync + cache
5. overview API
6. websocket
7. frontend overview
8. sessions/tasks/events
9. office view
10. mutations + polish
