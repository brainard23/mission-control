export function registerRealtime(app) {
  app.register(async function websocketRoutes(fastify) {
    fastify.get('/ws/v1', { websocket: true }, (socket) => {
      const hello = {
        type: 'connection.hello',
        ts: new Date().toISOString(),
        payload: {
          version: 'v1',
          serverTime: new Date().toISOString(),
        },
      }

      socket.send(JSON.stringify(hello))

      const heartbeat = setInterval(() => {
        if (socket.readyState === 1) {
          socket.send(
            JSON.stringify({
              type: 'health.updated',
              ts: new Date().toISOString(),
              payload: {
                backendStatus: 'healthy',
                gatewayStatus: 'unknown',
                nodesOnline: 0,
                lastSyncAt: new Date().toISOString(),
              },
            }),
          )
        }
      }, 15000)

      socket.on('close', () => {
        clearInterval(heartbeat)
      })
    })
  })
}
