# Mission Control Monorepo Structure

## Recommended shape

```text
mission-control/
  apps/
    web/
      src/
        app/
          (mission-control)/
            overview/
            office/
            sessions/
            tasks/
            events/
            infra/
        components/
          mission-control/
            overview/
            office/
            sessions/
            tasks/
            events/
            shell/
        lib/
          api/
          ws/
          state/
    api/
      src/
        app/
        api/routes/
        domain/
        integrations/openclaw/
        sync/
        realtime/
        persistence/
        commands/
  packages/
    contracts/
      src/
        domain.ts
        api.ts
        ws.ts
    ui/
    config/
```

## Responsibilities

### apps/web
- Next.js frontend
- overview dashboard
- office view
- sessions/tasks/events screens
- websocket client
- query caching and optimistic UI where needed

### apps/api
- Fastify backend
- OpenClaw adapters
- runtime sync engine
- reconciler
- REST APIs
- websocket broadcaster
- DB access
- command execution layer

### packages/contracts
- shared TS types for domain models, REST, and websocket payloads
- consumed by both frontend and backend

### packages/ui
- optional shared design system primitives if app grows

### packages/config
- tsconfig/eslint/prettier shared config if needed

## First directories to create

```text
apps/web/src/app/(mission-control)/overview/page.tsx
apps/web/src/app/(mission-control)/office/page.tsx
apps/api/src/app/server.ts
apps/api/src/api/routes/overview.ts
apps/api/src/integrations/openclaw/client.ts
packages/contracts/src/domain.ts
```

## Notes
- Keep the backend as the control plane; do not let the frontend call raw OpenClaw surfaces directly.
- Keep all cross-app DTOs in `packages/contracts`.
- Build the Office View on top of the same models used by Overview and Sessions.
