import { createServer } from 'node:http'
import { parse } from 'node:url'
import { agents, sessions, tasks, events, rooms, placements, taskHistory } from './mock-data.js'

const port = Number(process.env.PORT || 4000)

function json(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(payload))
}

function notFound(res, message = 'Route not found') {
  json(res, 404, { error: { code: 'NOT_FOUND', message } })
}

function getTask(id) {
  return tasks.find((task) => task.id === id) || null
}

function getSession(id) {
  return sessions.find((session) => session.id === id) || null
}

function getAgent(id) {
  return agents.find((agent) => agent.id === id) || null
}

function getEventsFor(link) {
  return events.filter((event) => Object.entries(link).every(([key, value]) => event[key] === value))
}

function buildAgentCard(agent) {
  return {
    agent,
    currentSession: agent.currentSessionId ? getSession(agent.currentSessionId) : null,
    currentTask: agent.currentTaskId ? getTask(agent.currentTaskId) : null,
    room: agent.roomId ? rooms.find((room) => room.id === agent.roomId) || null : null,
    placement: placements.find((placement) => placement.agentId === agent.id) || null,
  }
}

function buildOverview() {
  return {
    data: {
      stats: {
        activeAgents: agents.length,
        activeSessions: sessions.filter((session) => session.state === 'active').length,
        queuedTasks: tasks.filter((task) => task.status === 'queued').length,
        tasksInProgress: tasks.filter((task) => task.status === 'in_progress').length,
        blockedTasks: tasks.filter((task) => task.status === 'blocked').length,
        failedTasks: tasks.filter((task) => task.status === 'failed').length,
        staleAgents: 0,
        staleSessions: 0,
      },
      alerts: tasks.filter((task) => task.status === 'blocked').map((task) => ({
        id: `alert_${task.id}`,
        kind: 'blocked_task',
        severity: 'warning',
        message: task.blockerReason || `${task.title} is blocked`,
        taskId: task.id,
        agentId: task.assignedAgentId || null,
        sessionId: task.sessionId || null,
      })),
      health: {
        backendStatus: 'healthy',
        gatewayStatus: 'unknown',
        nodesOnline: 0,
        websocketReady: false,
        lastSyncAt: new Date().toISOString(),
      },
      recentEvents: events,
    },
  }
}

const server = createServer(async (req, res) => {
  const { pathname } = parse(req.url || '/', true)
  const method = req.method || 'GET'

  if (method === 'GET' && pathname === '/health') {
    return json(res, 200, { ok: true, service: 'mission-control-api' })
  }

  if (method === 'GET' && pathname === '/api/v1/health') {
    return json(res, 200, {
      data: {
        backendStatus: 'healthy',
        gatewayStatus: 'unknown',
        nodesOnline: 0,
        sync: { lastSyncAt: new Date().toISOString(), adapterFailures: 0 },
        websocketReady: false,
      },
    })
  }

  if (method === 'GET' && pathname === '/api/v1/overview') {
    return json(res, 200, buildOverview())
  }

  if (method === 'GET' && pathname === '/api/v1/agents') {
    return json(res, 200, { data: { items: agents.map(buildAgentCard) } })
  }

  if (method === 'GET' && pathname?.startsWith('/api/v1/agents/')) {
    const id = pathname.split('/').pop()
    const agent = getAgent(id)
    if (!agent) return notFound(res, `Agent ${id} was not found`)
    return json(res, 200, {
      data: {
        agent,
        currentSession: agent.currentSessionId ? getSession(agent.currentSessionId) : null,
        currentTask: agent.currentTaskId ? getTask(agent.currentTaskId) : null,
        room: agent.roomId ? rooms.find((room) => room.id === agent.roomId) || null : null,
        placement: placements.find((placement) => placement.agentId === agent.id) || null,
        recentEvents: getEventsFor({ agentId: agent.id }),
      },
    })
  }

  if (method === 'GET' && pathname === '/api/v1/sessions') {
    return json(res, 200, { data: { items: sessions } })
  }

  if (method === 'GET' && pathname?.startsWith('/api/v1/sessions/')) {
    const id = pathname.split('/').pop()
    const session = getSession(id)
    if (!session) return notFound(res, `Session ${id} was not found`)
    const agent = getAgent(session.agentId)
    return json(res, 200, {
      data: {
        session,
        agent,
        currentTask: session.currentTaskId ? getTask(session.currentTaskId) : null,
        recentEvents: getEventsFor({ sessionId: session.id }),
        availableActions: { canMessage: true, canStop: true },
      },
    })
  }

  if (method === 'GET' && pathname === '/api/v1/tasks') {
    return json(res, 200, { data: { items: tasks } })
  }

  if (method === 'GET' && pathname?.startsWith('/api/v1/tasks/')) {
    const id = pathname.split('/').pop()
    const task = getTask(id)
    if (!task) return notFound(res, `Task ${id} was not found`)
    return json(res, 200, {
      data: {
        task,
        assignedAgent: task.assignedAgentId ? getAgent(task.assignedAgentId) : null,
        session: task.sessionId ? getSession(task.sessionId) : null,
        history: taskHistory[task.id] || [],
        recentEvents: getEventsFor({ taskId: task.id }),
        availableActions: { canAssign: true, canRetry: true, canMarkDone: true },
      },
    })
  }

  if (method === 'GET' && pathname === '/api/v1/events') {
    return json(res, 200, { data: { items: events } })
  }

  if (method === 'GET' && pathname === '/api/v1/rooms') {
    return json(res, 200, { data: { rooms, placements } })
  }

  if (method === 'POST' && pathname === '/api/v1/tasks') {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      const payload = body ? JSON.parse(body) : {}
      const task = {
        id: `task_${Date.now()}`,
        title: payload.title || 'Untitled Task',
        description: payload.description || null,
        status: 'queued',
        priority: payload.priority || 'normal',
        assignedAgentId: payload.assignedAgentId || null,
        sessionId: null,
        blockerReason: null,
        tags: payload.tags || [],
        source: 'manual',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      tasks.unshift(task)
      json(res, 201, { data: { task } })
    })
    return
  }

  return notFound(res)
})

server.listen(port, () => {
  console.log(`Mission Control API listening on http://localhost:${port}`)
})
