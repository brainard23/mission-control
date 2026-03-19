# Mission Control Artifact Pack

This directory contains the current planning artifacts for the OpenClaw Mission Control project.

## Included
- `contracts/domain.ts` — shared core entity and composite types
- `contracts/api.ts` — REST request/response contracts
- `contracts/ws.ts` — websocket event contracts
- `MONOREPO.md` — recommended repo/app/package structure
- `WIREFRAMES.md` — first-pass ASCII layouts for key screens
- `IMPLEMENTATION_CHECKLIST.md` — phased engineering plan

## Recommended next implementation moves
1. turn these contracts into `packages/contracts/src/*`
2. implement the DB schema in Drizzle or Prisma
3. scaffold `apps/api` and `apps/web`
4. build the sync layer before the fancy Office View
