import { json } from '../lib/http.js'
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
  app.get('/health', (_req, res) => {
    json(res, 200, { ok: true, service: 'mission-control-api' })
  })

  app.get('/api/v1/health', (_req, res) => {
    json(res, 200, { data: getHealth() })
  })

  app.get('/api/v1/overview', (_req, res) => {
    json(res, 200, { data: getOverview() })
  })

  app.get('/api/v1/agents', (_req, res) => {
    json(res, 200, { data: { items: getAgentsView() } })
  })

  app.get('/api/v1/agents/:id', (req, res) => {
    const view = getAgentView(req.params.id)
    if (!view) return json(res, 404, { error: { code: 'AGENT_NOT_FOUND', message: `Agent ${req.params.id} was not found` } })
    json(res, 200, { data: view })
  })

  app.get('/api/v1/sessions', (_req, res) => {
    json(res, 200, { data: { items: getSessionsView() } })
  })

  app.get('/api/v1/sessions/:id', (req, res) => {
    const view = getSessionView(req.params.id)
    if (!view) return json(res, 404, { error: { code: 'SESSION_NOT_FOUND', message: `Session ${req.params.id} was not found` } })
    json(res, 200, { data: view })
  })

  app.get('/api/v1/tasks', (_req, res) => {
    json(res, 200, { data: { items: getTasksView() } })
  })

  app.get('/api/v1/tasks/:id', (req, res) => {
    const view = getTaskView(req.params.id)
    if (!view) return json(res, 404, { error: { code: 'TASK_NOT_FOUND', message: `Task ${req.params.id} was not found` } })
    json(res, 200, { data: view })
  })

  app.get('/api/v1/events', (_req, res) => {
    json(res, 200, { data: { items: getEventsView() } })
  })

  app.get('/api/v1/rooms', (_req, res) => {
    json(res, 200, { data: getRoomsView() })
  })

  app.post('/api/v1/tasks', (req, res) => {
    const task = createTaskView(req.body || {})
    json(res, 201, { data: { task } })
  })

  app.patch('/api/v1/tasks/:id', (req, res) => {
    const task = updateTask(req.params.id, req.body || {})
    if (!task) return json(res, 404, { error: { code: 'TASK_NOT_FOUND', message: `Task ${req.params.id} was not found` } })
    json(res, 200, { data: { task } })
  })

  app.post('/api/v1/tasks/:id/assign', (req, res) => {
    const task = assignTask(req.params.id, req.body?.agentId)
    if (!task) return json(res, 404, { error: { code: 'TASK_NOT_FOUND', message: `Task ${req.params.id} was not found` } })
    json(res, 200, { data: { task } })
  })

  app.post('/api/v1/tasks/:id/retry', (req, res) => {
    const task = retryTask(req.params.id, req.body?.reason)
    if (!task) return json(res, 404, { error: { code: 'TASK_NOT_FOUND', message: `Task ${req.params.id} was not found` } })
    json(res, 200, { data: { task } })
  })

  app.post('/api/v1/sessions/:id/message', (req, res) => {
    const result = sendSessionMessage(req.params.id, req.body?.message)
    if (!result) return json(res, 404, { error: { code: 'SESSION_NOT_FOUND', message: `Session ${req.params.id} was not found` } })
    json(res, 202, { data: result })
  })

  app.post('/api/v1/sessions/:id/stop', (req, res) => {
    const result = stopSession(req.params.id, req.body?.reason)
    if (!result) return json(res, 404, { error: { code: 'SESSION_NOT_FOUND', message: `Session ${req.params.id} was not found` } })
    json(res, 202, { data: result })
  })
}
