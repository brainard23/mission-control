# API App Scaffold

This backend is now a mock-data MVP skeleton.

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
- replace the HTTP server with Fastify
- move mock data into services/repositories
- add websocket support
- add real OpenClaw adapters
- add persistence with Postgres and migrations
