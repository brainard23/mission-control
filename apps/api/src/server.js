import { createApp } from './lib/http.js'
import { registerRoutes } from './api/routes.js'
import { registerRealtime } from './realtime/ws.js'
import { refreshRuntimeSnapshot, startRuntimeSync } from './integrations.openclaw-runtime.js'
import { startChannelWatchdog } from './integrations.docker-stats.js'
import { initDb } from './db.js'

const port = Number(process.env.PORT || 4000)
const host = process.env.HOST || '0.0.0.0'
const app = await createApp()

await initDb()
registerRoutes(app)
registerRealtime(app)

// Start runtime sync in background — don't block server startup
refreshRuntimeSnapshot().catch(() => {})
startRuntimeSync()

// Start channel health watchdog — auto-reconnects WhatsApp if it drops
startChannelWatchdog()

app.listen({ port, host }).then(() => {
  console.log(`Mission Control API listening on http://localhost:${port}`)
}).catch((error) => {
  console.error(error)
  process.exit(1)
})
