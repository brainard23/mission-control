import { sendJson } from '../lib/http.js'
import {
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
import { assignTask, createTaskView, retryTask, sendSessionMessage, stopSession, updateTask } from '../domain/commands.js'
import {
  agentIdParamSchema,
  assignTaskBodySchema,
  chatMessageBodySchema,
  createTaskBodySchema,
  idParamSchema,
  retryTaskBodySchema,
  sessionMessageBodySchema,
  sessionStopBodySchema,
  updateTaskBodySchema,
} from './schemas.js'
import {
  clearChatHistory,
  getChatHistory,
  listAvailableAgents,
  sendAgentMessage,
} from '../integrations.openclaw-chat.js'

export function registerRoutes(app) {
  app.get('/health', async (_request, reply) => {
    return sendJson(reply, 200, { ok: true, service: 'mission-control-api' })
  })

  app.get('/api/v1/health', async (_request, reply) => {
    return sendJson(reply, 200, { data: getHealth() })
  })

  app.get('/api/v1/overview', async (_request, reply) => {
    return sendJson(reply, 200, { data: await getOverview() })
  })

  app.get('/api/v1/agents', async (_request, reply) => {
    return sendJson(reply, 200, { data: { items: await getAgentsView() } })
  })

  app.get('/api/v1/agents/:id', { schema: { params: idParamSchema } }, async (request, reply) => {
    const view = await getAgentView(request.params.id)
    if (!view) {
      return sendJson(reply, 404, { error: { code: 'AGENT_NOT_FOUND', message: `Agent ${request.params.id} was not found` } })
    }
    return sendJson(reply, 200, { data: view })
  })

  app.get('/api/v1/sessions', async (_request, reply) => {
    return sendJson(reply, 200, { data: { items: await getSessionsView() } })
  })

  app.get('/api/v1/sessions/:id', { schema: { params: idParamSchema } }, async (request, reply) => {
    const view = await getSessionView(request.params.id)
    if (!view) {
      return sendJson(reply, 404, { error: { code: 'SESSION_NOT_FOUND', message: `Session ${request.params.id} was not found` } })
    }
    return sendJson(reply, 200, { data: view })
  })

  app.get('/api/v1/tasks', async (_request, reply) => {
    return sendJson(reply, 200, { data: { items: await getTasksView() } })
  })

  app.get('/api/v1/tasks/:id', { schema: { params: idParamSchema } }, async (request, reply) => {
    const view = await getTaskView(request.params.id)
    if (!view) {
      return sendJson(reply, 404, { error: { code: 'TASK_NOT_FOUND', message: `Task ${request.params.id} was not found` } })
    }
    return sendJson(reply, 200, { data: view })
  })

  app.get('/api/v1/events', async (_request, reply) => {
    return sendJson(reply, 200, { data: { items: await getEventsView() } })
  })

  app.get('/api/v1/rooms', async (_request, reply) => {
    return sendJson(reply, 200, { data: await getRoomsView() })
  })

  app.post('/api/v1/tasks', { schema: { body: createTaskBodySchema } }, async (request, reply) => {
    const task = await createTaskView(request.body || {})
    return sendJson(reply, 201, { data: { task } })
  })

  app.patch('/api/v1/tasks/:id', { schema: { params: idParamSchema, body: updateTaskBodySchema } }, async (request, reply) => {
    const task = await updateTask(request.params.id, request.body || {})
    if (!task) {
      return sendJson(reply, 404, { error: { code: 'TASK_NOT_FOUND', message: `Task ${request.params.id} was not found` } })
    }
    return sendJson(reply, 200, { data: { task } })
  })

  app.post('/api/v1/tasks/:id/assign', { schema: { params: idParamSchema, body: assignTaskBodySchema } }, async (request, reply) => {
    const task = await assignTask(request.params.id, request.body?.agentId)
    if (!task) {
      return sendJson(reply, 404, { error: { code: 'TASK_NOT_FOUND', message: `Task ${request.params.id} was not found` } })
    }
    return sendJson(reply, 200, { data: { task } })
  })

  app.post('/api/v1/tasks/:id/retry', { schema: { params: idParamSchema, body: retryTaskBodySchema } }, async (request, reply) => {
    const task = await retryTask(request.params.id, request.body?.reason)
    if (!task) {
      return sendJson(reply, 404, { error: { code: 'TASK_NOT_FOUND', message: `Task ${request.params.id} was not found` } })
    }
    return sendJson(reply, 200, { data: { task } })
  })

  app.post('/api/v1/sessions/:id/message', { schema: { params: idParamSchema, body: sessionMessageBodySchema } }, async (request, reply) => {
    const result = await sendSessionMessage(request.params.id, request.body?.message)
    if (!result) {
      return sendJson(reply, 404, { error: { code: 'SESSION_NOT_FOUND', message: `Session ${request.params.id} was not found` } })
    }
    return sendJson(reply, 202, { data: result })
  })

  app.post('/api/v1/sessions/:id/stop', { schema: { params: idParamSchema, body: sessionStopBodySchema } }, async (request, reply) => {
    const result = await stopSession(request.params.id, request.body?.reason)
    if (!result) {
      return sendJson(reply, 404, { error: { code: 'SESSION_NOT_FOUND', message: `Session ${request.params.id} was not found` } })
    }
    return sendJson(reply, 202, { data: result })
  })

  // --- Chat routes ---

  app.get('/api/v1/chat/agents', async (_request, reply) => {
    try {
      const agents = await listAvailableAgents()
      return sendJson(reply, 200, { data: { agents } })
    } catch (error) {
      return sendJson(reply, 502, { error: { code: 'OPENCLAW_ERROR', message: error.message || 'Failed to list agents' } })
    }
  })

  app.get('/api/v1/chat/:agentId/history', { schema: { params: agentIdParamSchema } }, async (request, reply) => {
    const messages = getChatHistory(request.params.agentId)
    return sendJson(reply, 200, { data: { messages } })
  })

  app.post('/api/v1/chat/:agentId/message', { schema: { params: agentIdParamSchema, body: chatMessageBodySchema } }, async (request, reply) => {
    try {
      const result = await sendAgentMessage(request.params.agentId, request.body.message, request.body.sessionId)
      return sendJson(reply, 200, { data: result })
    } catch (error) {
      return sendJson(reply, 502, { error: { code: 'AGENT_ERROR', message: error.message || 'Agent failed to respond' } })
    }
  })

  app.delete('/api/v1/chat/:agentId/history', { schema: { params: agentIdParamSchema } }, async (request, reply) => {
    clearChatHistory(request.params.agentId)
    return sendJson(reply, 200, { data: { cleared: true } })
  })
}
