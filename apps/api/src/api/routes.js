import { sendJson } from '../lib/http.js'
import {
  createTaskView,
  getAgentView,
  getAgentsView,
  getEventsView,
  getHealth,
  getOverview,
  getRoomsView,
  getSessionView,
  getSessionsView,
  getTaskView,
  getTasksView,
} from '../domain/services.js'
import { assignTask, retryTask, sendSessionMessage, stopSession, updateTask } from '../domain/commands.js'

export function registerRoutes(app) {
  app.get('/health', async (_request, reply) => {
    return sendJson(reply, 200, { ok: true, service: 'mission-control-api' })
  })

  app.get('/api/v1/health', async (_request, reply) => {
    return sendJson(reply, 200, { data: getHealth() })
  })

  app.get('/api/v1/overview', async (_request, reply) => {
    return sendJson(reply, 200, { data: getOverview() })
  })

  app.get('/api/v1/agents', async (_request, reply) => {
    return sendJson(reply, 200, { data: { items: getAgentsView() } })
  })

  app.get('/api/v1/agents/:id', async (request, reply) => {
    const view = getAgentView(request.params.id)
    if (!view) {
      return sendJson(reply, 404, { error: { code: 'AGENT_NOT_FOUND', message: `Agent ${request.params.id} was not found` } })
    }
    return sendJson(reply, 200, { data: view })
  })

  app.get('/api/v1/sessions', async (_request, reply) => {
    return sendJson(reply, 200, { data: { items: getSessionsView() } })
  })

  app.get('/api/v1/sessions/:id', async (request, reply) => {
    const view = getSessionView(request.params.id)
    if (!view) {
      return sendJson(reply, 404, { error: { code: 'SESSION_NOT_FOUND', message: `Session ${request.params.id} was not found` } })
    }
    return sendJson(reply, 200, { data: view })
  })

  app.get('/api/v1/tasks', async (_request, reply) => {
    return sendJson(reply, 200, { data: { items: getTasksView() } })
  })

  app.get('/api/v1/tasks/:id', async (request, reply) => {
    const view = getTaskView(request.params.id)
    if (!view) {
      return sendJson(reply, 404, { error: { code: 'TASK_NOT_FOUND', message: `Task ${request.params.id} was not found` } })
    }
    return sendJson(reply, 200, { data: view })
  })

  app.get('/api/v1/events', async (_request, reply) => {
    return sendJson(reply, 200, { data: { items: getEventsView() } })
  })

  app.get('/api/v1/rooms', async (_request, reply) => {
    return sendJson(reply, 200, { data: getRoomsView() })
  })

  app.post('/api/v1/tasks', async (request, reply) => {
    const task = createTaskView(request.body || {})
    return sendJson(reply, 201, { data: { task } })
  })

  app.patch('/api/v1/tasks/:id', async (request, reply) => {
    const task = updateTask(request.params.id, request.body || {})
    if (!task) {
      return sendJson(reply, 404, { error: { code: 'TASK_NOT_FOUND', message: `Task ${request.params.id} was not found` } })
    }
    return sendJson(reply, 200, { data: { task } })
  })

  app.post('/api/v1/tasks/:id/assign', async (request, reply) => {
    const task = assignTask(request.params.id, request.body?.agentId)
    if (!task) {
      return sendJson(reply, 404, { error: { code: 'TASK_NOT_FOUND', message: `Task ${request.params.id} was not found` } })
    }
    return sendJson(reply, 200, { data: { task } })
  })

  app.post('/api/v1/tasks/:id/retry', async (request, reply) => {
    const task = retryTask(request.params.id, request.body?.reason)
    if (!task) {
      return sendJson(reply, 404, { error: { code: 'TASK_NOT_FOUND', message: `Task ${request.params.id} was not found` } })
    }
    return sendJson(reply, 200, { data: { task } })
  })

  app.post('/api/v1/sessions/:id/message', async (request, reply) => {
    const result = sendSessionMessage(request.params.id, request.body?.message)
    if (!result) {
      return sendJson(reply, 404, { error: { code: 'SESSION_NOT_FOUND', message: `Session ${request.params.id} was not found` } })
    }
    return sendJson(reply, 202, { data: result })
  })

  app.post('/api/v1/sessions/:id/stop', async (request, reply) => {
    const result = stopSession(request.params.id, request.body?.reason)
    if (!result) {
      return sendJson(reply, 404, { error: { code: 'SESSION_NOT_FOUND', message: `Session ${request.params.id} was not found` } })
    }
    return sendJson(reply, 202, { data: result })
  })
}
