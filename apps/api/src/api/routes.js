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
}
