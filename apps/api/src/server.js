import { createApp } from './lib/http.js'
import { registerRoutes } from './api/routes.js'
import { registerRealtime } from './realtime/ws.js'

const port = Number(process.env.PORT || 4000)
const host = process.env.HOST || '0.0.0.0'
const app = await createApp()

registerRoutes(app)
registerRealtime(app)

app.listen({ port, host }).then(() => {
  console.log(`Mission Control API listening on http://localhost:${port}`)
}).catch((error) => {
  console.error(error)
  process.exit(1)
})
