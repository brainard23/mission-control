# API App Scaffold

This is the initial Mission Control backend scaffold.

## Next implementation steps
- replace the placeholder Node HTTP server with Fastify
- add `/api/v1/overview`, `/api/v1/agents`, `/api/v1/sessions`, `/api/v1/tasks`
- add the OpenClaw integration layer under `src/integrations/openclaw`
- add a runtime sync loop and websocket broadcaster
- add PostgreSQL access and migrations
