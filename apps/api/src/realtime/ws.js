import { subscribeRealtime } from './hub.js'
import { getDashboardSnapshot } from '../domain/services.js'

function send(socket, message) {
  if (socket.readyState === 1) {
    socket.send(JSON.stringify(message))
  }
}

export function registerRealtime(app) {
  app.register(async function websocketRoutes(fastify) {
    fastify.get('/ws/v1', { websocket: true }, (socket) => {
      send(socket, {
        type: 'connection.hello',
        ts: new Date().toISOString(),
        payload: {
          version: 'v1',
          serverTime: new Date().toISOString(),
        },
      })

      send(socket, {
        type: 'overview.snapshot',
        ts: new Date().toISOString(),
        payload: getDashboardSnapshot(),
      })

      const unsubscribe = subscribeRealtime((message) => {
        send(socket, message)
      })

      const heartbeat = setInterval(() => {
        send(socket, {
          type: 'health.updated',
          ts: new Date().toISOString(),
          payload: {
            backendStatus: 'healthy',
            gatewayStatus: 'unknown',
            nodesOnline: 0,
            lastSyncAt: new Date().toISOString(),
          },
        })
      }, 15000)

      socket.on('close', () => {
        clearInterval(heartbeat)
        unsubscribe()
      })
    })
  })
}
