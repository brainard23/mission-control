# Mission Control Implementation Checklist

## Milestone 0 — Foundation
- [ ] Create monorepo structure (`apps/web`, `apps/api`, `packages/contracts`)
- [ ] Add shared TS config and lint config
- [ ] Wire package manager workspace
- [ ] Add environment variable strategy

## Milestone 1 — Contracts and schema
- [ ] Finalize shared domain contracts
- [ ] Finalize API request/response contracts
- [ ] Finalize websocket contracts
- [ ] Implement PostgreSQL schema
- [ ] Add migrations
- [ ] Seed default rooms

## Milestone 2 — Backend control plane
- [ ] Create Fastify app shell
- [ ] Add health route
- [ ] Build OpenClaw client abstraction
- [ ] Implement adapters for sessions/subagents/nodes/gateway
- [ ] Implement runtime sync loop
- [ ] Implement reconciler and stale detection
- [ ] Add in-memory runtime cache

## Milestone 3 — Core APIs
- [ ] `GET /api/v1/overview`
- [ ] `GET /api/v1/agents`
- [ ] `GET /api/v1/agents/:id`
- [ ] `GET /api/v1/sessions`
- [ ] `GET /api/v1/sessions/:id`
- [ ] `GET /api/v1/tasks`
- [ ] `GET /api/v1/tasks/:id`
- [ ] `GET /api/v1/events`
- [ ] `GET /api/v1/rooms`
- [ ] `GET /api/v1/health`

## Milestone 4 — Mutations and audit
- [ ] `POST /api/v1/tasks`
- [ ] `PATCH /api/v1/tasks/:id`
- [ ] `POST /api/v1/tasks/:id/assign`
- [ ] `POST /api/v1/tasks/:id/retry`
- [ ] `POST /api/v1/sessions/:id/message`
- [ ] `POST /api/v1/sessions/:id/stop`
- [ ] Add command audit trail
- [ ] Emit events for all mutations

## Milestone 5 — Realtime
- [ ] WebSocket server `/ws/v1`
- [ ] connection hello event
- [ ] `agent.updated`
- [ ] `session.updated`
- [ ] `task.updated`
- [ ] `event.created`
- [ ] `health.updated`
- [ ] reconnect handling and snapshot resync

## Milestone 6 — Frontend shell
- [ ] Build app shell and navigation
- [ ] Add query client and websocket client
- [ ] Build overview page
- [ ] Build sessions page
- [ ] Build tasks page
- [ ] Build events page
- [ ] Add right-side detail drawer

## Milestone 7 — Office View
- [ ] Build rooms + placements query layer
- [ ] Build Office page layout
- [ ] Build agent desk cards
- [ ] Add filters/search
- [ ] Add activity rail
- [ ] Add selected detail panel
- [ ] Add working/waiting/blocked visual states

## Milestone 8 — Polish
- [ ] disconnected/reconnecting banner
- [ ] loading/empty states
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
