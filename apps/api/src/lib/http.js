import Fastify from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'

export async function createApp() {
  const app = Fastify({ logger: false })
  await app.register(cors, { origin: true })
  await app.register(websocket)
  return app
}

export function sendJson(reply, status, payload) {
  return reply.code(status).send(payload)
}
