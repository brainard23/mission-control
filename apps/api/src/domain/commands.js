import {
  appendEvent,
  appendTaskHistory,
  createTask,
  getAgent,
  getSession,
  getTask,
  updateAgent,
  updateSession,
} from './repository.js'
import { buildAgentCard, getDashboardSnapshot, getHealth } from './services.js'
import { publishRealtime } from '../realtime/hub.js'

function emit(type, payload) {
  publishRealtime({
    type,
    ts: new Date().toISOString(),
    payload,
  })
}

function emitHealth() {
  const health = getHealth()
  emit('health.updated', {
    backendStatus: health.backendStatus,
    gatewayStatus: health.gatewayStatus,
    nodesOnline: health.nodesOnline,
    lastSyncAt: health.sync.lastSyncAt || new Date().toISOString(),
  })
}

function emitTaskAndRelated(task) {
  emit('task.updated', { task })

  if (task.assignedAgentId) {
    const agent = getAgent(task.assignedAgentId)
    if (agent) {
      emit('agent.updated', buildAgentCard(agent))
    }
  }

  if (task.sessionId) {
    const session = getSession(task.sessionId)
    if (session) {
      emit('session.updated', { session })
    }
  }

  emit('overview.snapshot', getDashboardSnapshot())
  emitHealth()
}

function recordTaskMutation(task, details) {
  const event = appendEvent({
    kind: details.kind,
    severity: details.severity,
    message: details.message,
    agentId: task.assignedAgentId || null,
    sessionId: task.sessionId || null,
    taskId: task.id,
    metadata: details.metadata,
  })

  appendTaskHistory(task.id, {
    fromStatus: details.fromStatus,
    toStatus: task.status,
    message: details.message,
    actor: details.actor || 'operator',
    eventKind: details.kind,
    metadata: details.metadata,
  })

  emit('event.created', { event })
}

export function createTaskView(input) {
  const task = createTask(input)
  recordTaskMutation(task, {
    kind: 'task.created',
    severity: 'info',
    message: `Created task ${task.title}`,
    toStatus: task.status,
  })
  emitTaskAndRelated(task)
  return task
}

export function updateTask(id, patch) {
  const task = getTask(id)
  if (!task) return null

  const previousStatus = task.status
  if (typeof patch.title === 'string') task.title = patch.title
  if (patch.description !== undefined) task.description = patch.description
  if (patch.status) task.status = patch.status
  if (patch.priority) task.priority = patch.priority
  if (patch.blockerReason !== undefined) task.blockerReason = patch.blockerReason
  if (Array.isArray(patch.tags)) task.tags = patch.tags
  if (patch.metadata) task.metadata = { ...(task.metadata || {}), ...patch.metadata }
  task.updatedAt = new Date().toISOString()
  if (task.status === 'done') task.completedAt = task.updatedAt

  recordTaskMutation(task, {
    kind: task.status === 'blocked' ? 'task.blocked' : 'task.updated',
    severity: task.status === 'blocked' ? 'warning' : 'info',
    message: task.status === 'blocked'
      ? `${task.title} blocked${task.blockerReason ? `: ${task.blockerReason}` : ''}`
      : `${task.title} updated`,
    fromStatus: previousStatus,
  })

  emitTaskAndRelated(task)
  return task
}

export function assignTask(taskId, agentId) {
  const task = getTask(taskId)
  if (!task) return null

  const previousStatus = task.status
  const agent = agentId ? getAgent(agentId) : null
  task.assignedAgentId = agentId
  task.updatedAt = new Date().toISOString()
  if (agent) {
    updateAgent(agent.id, {
      currentTaskId: task.id,
      status: task.status === 'blocked' ? 'blocked' : 'working',
      lastActivityAt: task.updatedAt,
    })
  }

  recordTaskMutation(task, {
    kind: 'task.assigned',
    severity: 'info',
    message: agent ? `${task.title} assigned to ${agent.name}` : `${task.title} assignment cleared`,
    fromStatus: previousStatus,
    actor: 'operator',
    metadata: { agentId: agentId || null },
  })

  emitTaskAndRelated(task)
  return task
}

export function retryTask(taskId, reason) {
  const task = getTask(taskId)
  if (!task) return null
  const previousStatus = task.status
  task.status = 'queued'
  task.blockerReason = null
  task.updatedAt = new Date().toISOString()
  task.metadata = { ...(task.metadata || {}), retryReason: reason || null }

  recordTaskMutation(task, {
    kind: 'task.retried',
    severity: 'info',
    message: reason ? `${task.title} queued again: ${reason}` : `${task.title} queued again`,
    fromStatus: previousStatus,
    metadata: { retryReason: reason || null },
  })

  emitTaskAndRelated(task)
  return task
}

export function sendSessionMessage(sessionId, message) {
  const session = getSession(sessionId)
  if (!session) return null

  const event = appendEvent({
    kind: 'session.message_requested',
    severity: 'info',
    message: `Queued operator message for ${session.label || session.id}`,
    agentId: session.agentId,
    sessionId,
    metadata: { message },
  })

  emit('event.created', { event })
  emit('session.updated', { session })
  emit('overview.snapshot', getDashboardSnapshot())
  emitHealth()

  return {
    accepted: true,
    sessionId,
    auditId: `cmd_msg_${Date.now()}`,
    message,
  }
}

export function stopSession(sessionId, reason) {
  const session = getSession(sessionId)
  if (!session) return null
  const now = new Date().toISOString()
  updateSession(sessionId, {
    state: 'paused',
    lastActivityAt: now,
    metadata: { ...(session.metadata || {}), stopReason: reason || null },
  })

  const task = session.currentTaskId ? getTask(session.currentTaskId) : null
  if (task) {
    task.status = 'waiting'
    task.updatedAt = now
  }

  const event = appendEvent({
    kind: 'session.stop_requested',
    severity: 'warning',
    message: reason ? `${session.label || session.id} pause requested: ${reason}` : `${session.label || session.id} pause requested`,
    agentId: session.agentId,
    sessionId,
    taskId: task?.id || null,
    metadata: { reason: reason || null },
  })

  emit('event.created', { event })
  emit('session.updated', { session })
  if (task) emit('task.updated', { task })
  const agent = getAgent(session.agentId)
  if (agent) {
    updateAgent(agent.id, { status: 'waiting', lastActivityAt: now })
    emit('agent.updated', buildAgentCard(agent))
  }
  emit('overview.snapshot', getDashboardSnapshot())
  emitHealth()

  return {
    accepted: true,
    sessionId,
    auditId: `cmd_stop_${Date.now()}`,
  }
}
