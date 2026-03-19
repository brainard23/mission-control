import {
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

export async function buildAgentCard(agent) {
  const [currentSession, currentTask, rooms, placements] = await Promise.all([
    agent.currentSessionId ? getSession(agent.currentSessionId) : null,
    agent.currentTaskId ? getTask(agent.currentTaskId) : null,
    listRooms(),
    listPlacements(),
  ])

  return {
    agent,
    currentSession,
    currentTask,
    room: agent.roomId ? rooms.find((room) => room.id === agent.roomId) || null : null,
    placement: placements.find((placement) => placement.agentId === agent.id) || null,
  }
}

export async function getOverview() {
  const [agents, sessions, tasks, events] = await Promise.all([
    listAgents(),
    listSessions(),
    listTasks(),
    listEvents(),
  ])
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

export async function getAgentsView() {
  const agents = await listAgents()
  return Promise.all(agents.map(buildAgentCard))
}

export async function getAgentView(id) {
  const agent = await getAgent(id)
  if (!agent) return null

  const [currentSession, currentTask, rooms, placements, recentEvents] = await Promise.all([
    agent.currentSessionId ? getSession(agent.currentSessionId) : null,
    agent.currentTaskId ? getTask(agent.currentTaskId) : null,
    listRooms(),
    listPlacements(),
    getEventsFor({ agentId: agent.id }),
  ])

  return {
    agent,
    currentSession,
    currentTask,
    room: agent.roomId ? rooms.find((room) => room.id === agent.roomId) || null : null,
    placement: placements.find((placement) => placement.agentId === agent.id) || null,
    recentEvents,
  }
}

export async function getSessionsView() {
  return listSessions()
}

export async function getSessionView(id) {
  const session = await getSession(id)
  if (!session) return null

  const [agent, currentTask, recentEvents] = await Promise.all([
    getAgent(session.agentId),
    session.currentTaskId ? getTask(session.currentTaskId) : null,
    getEventsFor({ sessionId: session.id }),
  ])

  return {
    session,
    agent,
    currentTask,
    recentEvents,
    availableActions: { canMessage: true, canStop: true },
  }
}

export async function getTasksView() {
  return listTasks()
}

export async function getTaskView(id) {
  const task = await getTask(id)
  if (!task) return null

  const [assignedAgent, session, history, recentEvents] = await Promise.all([
    task.assignedAgentId ? getAgent(task.assignedAgentId) : null,
    task.sessionId ? getSession(task.sessionId) : null,
    getTaskHistory(task.id),
    getEventsFor({ taskId: task.id }),
  ])

  return {
    task,
    assignedAgent,
    session,
    history,
    recentEvents,
    availableActions: { canAssign: true, canRetry: true, canMarkDone: true },
  }
}

export async function getEventsView() {
  return listEvents()
}

export async function getRoomsView() {
  const [rooms, placements] = await Promise.all([listRooms(), listPlacements()])
  return { rooms, placements }
}

export async function getDashboardSnapshot() {
  const [overview, agents, tasks, sessions, events, rooms] = await Promise.all([
    getOverview(),
    getAgentsView(),
    getTasksView(),
    getSessionsView(),
    getEventsView(),
    getRoomsView(),
  ])

  return { overview, agents, tasks, sessions, events, rooms }
}
