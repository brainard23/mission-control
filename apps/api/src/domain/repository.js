import { agents, sessions, tasks, events, rooms, placements, taskHistory } from '../mock-data.js'

export function listAgents() {
  return agents
}

export function getAgent(id) {
  return agents.find((agent) => agent.id === id) || null
}

export function listSessions() {
  return sessions
}

export function getSession(id) {
  return sessions.find((session) => session.id === id) || null
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
