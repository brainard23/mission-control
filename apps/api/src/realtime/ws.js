import { subscribeRealtime } from './hub.js'
import { getDashboardSnapshot, getHealth } from '../domain/services.js'

function send(socket, message) {
  if (socket.readyState === 1) {
    socket.send(JSON.stringify(message))
  }
}

export function registerRealtime(app) {
  app.register(async function websocketRoutes(fastify) {
    fastify.get('/ws/v1', { websocket: true }, async (socket) => {
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
        payload: await getDashboardSnapshot(),
      })

      const unsubscribe = subscribeRealtime((message) => {
        send(socket, message)
      })

      const heartbeat = setInterval(() => {
        const health = getHealth()
        send(socket, {
          type: 'health.updated',
          ts: new Date().toISOString(),
          payload: {
            backendStatus: health.backendStatus,
            gatewayStatus: health.gatewayStatus,
            nodesOnline: health.nodesOnline,
            lastSyncAt: health.sync.lastSyncAt || new Date().toISOString(),
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
