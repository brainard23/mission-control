import {
  createTask,
  getAgent,
  getEventsFor,
  getSession,
  getTask,
  getTaskHistory,
  listAgents,
  listEvents,
  listPlacements,
  listRooms,
  listSessions,
  listTasks,
} from './repository.js'
import { getRuntimeSnapshot } from '../integrations.openclaw-runtime.js'

export function buildAgentCard(agent) {
  return {
    agent,
    currentSession: agent.currentSessionId ? getSession(agent.currentSessionId) : null,
    currentTask: agent.currentTaskId ? getTask(agent.currentTaskId) : null,
    room: agent.roomId ? listRooms().find((room) => room.id === agent.roomId) || null : null,
    placement: listPlacements().find((placement) => placement.agentId === agent.id) || null,
  }
}

export function getOverview() {
  const agents = listAgents()
  const sessions = listSessions()
  const tasks = listTasks()
  const events = listEvents()
  const runtime = getRuntimeSnapshot()

  return {
    stats: {
      activeAgents: agents.length,
      activeSessions: sessions.filter((session) => session.state === 'active').length,
      queuedTasks: tasks.filter((task) => task.status === 'queued').length,
      tasksInProgress: tasks.filter((task) => task.status === 'in_progress').length,
      blockedTasks: tasks.filter((task) => task.status === 'blocked').length,
      failedTasks: tasks.filter((task) => task.status === 'failed').length,
      staleAgents: runtime.sync.isStale ? agents.length : 0,
      staleSessions: runtime.sync.isStale ? sessions.length : 0,
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
      backendStatus: runtime.health.backendStatus,
      gatewayStatus: runtime.health.gatewayStatus,
      nodesOnline: runtime.health.nodesOnline,
      websocketReady: runtime.health.websocketReady,
      lastSyncAt: runtime.health.lastSyncAt,
    },
    recentEvents: events,
  }
}

export function getHealth() {
  const runtime = getRuntimeSnapshot()

  return {
    backendStatus: runtime.health.backendStatus,
    gatewayStatus: runtime.health.gatewayStatus,
    nodesOnline: runtime.health.nodesOnline,
    sync: {
      lastSyncAt: runtime.sync.lastSyncAt,
      adapterFailures: runtime.sync.failureCount,
      lastError: runtime.sync.lastError,
      stale: runtime.sync.isStale,
    },
    websocketReady: runtime.health.websocketReady,
  }
}

export function getAgentsView() {
  return listAgents().map(buildAgentCard)
}

export function getAgentView(id) {
  const agent = getAgent(id)
  if (!agent) return null

  return {
    agent,
    currentSession: agent.currentSessionId ? getSession(agent.currentSessionId) : null,
    currentTask: agent.currentTaskId ? getTask(agent.currentTaskId) : null,
    room: agent.roomId ? listRooms().find((room) => room.id === agent.roomId) || null : null,
    placement: listPlacements().find((placement) => placement.agentId === agent.id) || null,
    recentEvents: getEventsFor({ agentId: agent.id }),
  }
}

export function getSessionsView() {
  return listSessions()
}

export function getSessionView(id) {
  const session = getSession(id)
  if (!session) return null

  return {
    session,
    agent: getAgent(session.agentId),
    currentTask: session.currentTaskId ? getTask(session.currentTaskId) : null,
    recentEvents: getEventsFor({ sessionId: session.id }),
    availableActions: { canMessage: true, canStop: true },
  }
}

export function getTasksView() {
  return listTasks()
}

export function getTaskView(id) {
  const task = getTask(id)
  if (!task) return null

  return {
    task,
    assignedAgent: task.assignedAgentId ? getAgent(task.assignedAgentId) : null,
    session: task.sessionId ? getSession(task.sessionId) : null,
    history: getTaskHistory(task.id),
    recentEvents: getEventsFor({ taskId: task.id }),
    availableActions: { canAssign: true, canRetry: true, canMarkDone: true },
  }
}

export function getEventsView() {
  return listEvents()
}

export function getRoomsView() {
  return {
    rooms: listRooms(),
    placements: listPlacements(),
  }
}

export function getDashboardSnapshot() {
  return {
    overview: getOverview(),
    agents: getAgentsView(),
    tasks: getTasksView(),
    sessions: getSessionsView(),
    events: getEventsView(),
    rooms: getRoomsView(),
  }
}

export function createTaskView(input) {
  return createTask(input)
}
