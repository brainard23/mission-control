import { createServer } from 'node:http'

const port = Number(process.env.PORT || 4000)

const routes = {
  '/health': () => ({ ok: true, service: 'mission-control-api' }),
  '/api/v1/health': () => ({
    data: {
      backendStatus: 'healthy',
      gatewayStatus: 'unknown',
      nodesOnline: 0,
      sync: { lastSyncAt: null, adapterFailures: 0 },
      websocketReady: false,
    },
  }),
}

const server = createServer((req, res) => {
  const path = req.url || '/'
  const handler = routes[path]

  if (!handler) {
    res.writeHead(404, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Route not found' } }))
    return
  }

  res.writeHead(200, { 'content-type': 'application/json' })
  res.end(JSON.stringify(handler()))
})

server.listen(port, () => {
  console.log(`Mission Control API listening on http://localhost:${port}`)
})
