# API App Scaffold

This backend is now organized like a lightweight Fastify-style app, but without external dependencies yet.

## Current structure
- `src/server.js` — server bootstrap
- `src/lib/http.js` — tiny routing/http layer
- `src/api/routes.js` — route registration
- `src/domain/repository.js` — mock data access
- `src/domain/services.js` — view composition and business logic
- `src/mock-data.js` — in-memory seed data

## Current routes
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

## Next implementation steps
- swap `src/lib/http.js` for real Fastify
- split routes into per-resource modules
- add validation schemas
- add websocket support
- add real OpenClaw adapters and Postgres persistence
