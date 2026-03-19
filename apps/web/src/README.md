# Web App Legacy Notes

The old lightweight Node-rendered HTML shell still lives in `src/` as reference material while the active app now runs from the Next.js app-router structure in `app/`.

## Active frontend
- `app/` contains the real Next.js entrypoints and page structure
- `lib/mock-overview.ts` holds the mocked Mission Control data flow
- `app/globals.css` preserves the dashboard + office aesthetic in the new React app

## Why the legacy shell remains
- it preserves the original mock shell implementation for comparison during the transition
- it can be deleted once the Next.js app fully replaces it in a follow-up cleanup
