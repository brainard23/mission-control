import { agents, sessions, tasks, events, rooms, placements, taskHistory } from '../mock-data.js'

export function listAgents() {
  return agents
}

export function getAgent(id) {
  return agents.find((agent) => agent.id === id) || null
}

export function updateAgent(id, patch) {
  const agent = getAgent(id)
  if (!agent) return null
  Object.assign(agent, patch)
  return agent
}

export function listSessions() {
  return sessions
}

export function getSession(id) {
  return sessions.find((session) => session.id === id) || null
}

export function updateSession(id, patch) {
  const session = getSession(id)
  if (!session) return null
  Object.assign(session, patch)
  return session
}

export function listTasks() {
  return tasks
}

export function getTask(id) {
  return tasks.find((task) => task.id === id) || null
}

export function createTask(input) {
  const now = new Date().toISOString()
  const task = {
    id: `task_${Date.now()}`,
    title: input.title || 'Untitled Task',
    description: input.description || null,
    status: 'queued',
    priority: input.priority || 'normal',
    assignedAgentId: input.assignedAgentId || null,
    sessionId: null,
    blockerReason: null,
    tags: input.tags || [],
    source: 'manual',
    createdAt: now,
    updatedAt: now,
  }
  tasks.unshift(task)
  taskHistory[task.id] = []
  return task
}

export function listEvents() {
  return events
}

export function appendEvent(input) {
  const event = {
    id: `evt_${Date.now()}_${events.length + 1}`,
    ts: input.ts || new Date().toISOString(),
    kind: input.kind,
    severity: input.severity || 'info',
    message: input.message,
    agentId: input.agentId || null,
    sessionId: input.sessionId || null,
    taskId: input.taskId || null,
    metadata: input.metadata || undefined,
  }

  events.unshift(event)
  if (events.length > 50) events.length = 50
  return event
}

export function getEventsFor(filter) {
  return events.filter((event) => Object.entries(filter).every(([key, value]) => event[key] === value))
}

export function listRooms() {
  return rooms
}

export function listPlacements() {
  return placements
}

export function getTaskHistory(taskId) {
  return taskHistory[taskId] || []
}

export function appendTaskHistory(taskId, entry) {
  if (!taskHistory[taskId]) taskHistory[taskId] = []
  taskHistory[taskId].unshift({
    id: `hist_${Date.now()}_${taskHistory[taskId].length + 1}`,
    createdAt: new Date().toISOString(),
    ...entry,
  })
  return taskHistory[taskId][0]
}
