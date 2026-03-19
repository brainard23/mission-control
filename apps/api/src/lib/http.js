import Fastify from 'fastify'

export function createApp() {
  return Fastify({ logger: false })
}

export function sendJson(reply, status, payload) {
  return reply.code(status).send(payload)
}
