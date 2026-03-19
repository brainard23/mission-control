import { createServer } from 'node:http'
import { createApp } from './lib/http.js'
import { registerRoutes } from './api/routes.js'

const port = Number(process.env.PORT || 4000)
const app = createApp()

registerRoutes(app)

const server = createServer((req, res) => app.handle(req, res))

server.listen(port, () => {
  console.log(`Mission Control API listening on http://localhost:${port}`)
})
