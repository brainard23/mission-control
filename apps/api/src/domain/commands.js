import {
  appendEvent,
  appendTaskHistory,
  createTask,
  deleteTask as repoDeleteTask,
  getAgent,
  getSession,
  getTask,
  updateAgent,
  updateSession,
  updateTask as repoUpdateTask,
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

async function emitTaskAndRelated(task) {
  emit('task.updated', { task })

  if (task.assignedAgentId) {
    const agent = await getAgent(task.assignedAgentId)
    if (agent) {
      emit('agent.updated', await buildAgentCard(agent))
    }
  }

  if (task.sessionId) {
    const session = await getSession(task.sessionId)
    if (session) {
      emit('session.updated', { session })
    }
  }

  emit('overview.snapshot', await getDashboardSnapshot())
  emitHealth()
}

async function recordTaskMutation(task, details) {
  const event = await appendEvent({
    kind: details.kind,
    severity: details.severity,
    message: details.message,
    agentId: task.assignedAgentId || null,
    sessionId: task.sessionId || null,
    taskId: task.id,
    metadata: details.metadata,
  })

  await appendTaskHistory(task.id, {
    fromStatus: details.fromStatus,
    toStatus: task.status,
    message: details.message,
    actor: details.actor || 'operator',
    eventKind: details.kind,
    metadata: details.metadata,
  })

  emit('event.created', { event })
}

export async function createTaskView(input) {
  const task = await createTask(input)
  await recordTaskMutation(task, {
    kind: 'task.created',
    severity: 'info',
    message: `Created task ${task.title}`,
    toStatus: task.status,
  })
  await emitTaskAndRelated(task)
  return task
}

export async function updateTask(id, patch) {
  const existing = await getTask(id)
  if (!existing) return null

  const previousStatus = existing.status

  const updatePatch = {}
  if (typeof patch.title === 'string') updatePatch.title = patch.title
  if (patch.description !== undefined) updatePatch.description = patch.description
  if (patch.status) updatePatch.status = patch.status
  if (patch.priority) updatePatch.priority = patch.priority
  if (patch.assignedAgentId !== undefined) updatePatch.assignedAgentId = patch.assignedAgentId
  if (patch.blockerReason !== undefined) updatePatch.blockerReason = patch.blockerReason
  if (Array.isArray(patch.tags)) updatePatch.tags = patch.tags
  if (patch.metadata) updatePatch.metadata = { ...(existing.metadata || {}), ...patch.metadata }
  if (updatePatch.status === 'done') updatePatch.completedAt = new Date().toISOString()

  const task = await repoUpdateTask(id, updatePatch)
  if (!task) return null

  await recordTaskMutation(task, {
    kind: task.status === 'blocked' ? 'task.blocked' : 'task.updated',
    severity: task.status === 'blocked' ? 'warning' : 'info',
    message: task.status === 'blocked'
      ? `${task.title} blocked${task.blockerReason ? `: ${task.blockerReason}` : ''}`
      : `${task.title} updated`,
    fromStatus: previousStatus,
  })

  await emitTaskAndRelated(task)
  return task
}

export async function assignTask(taskId, agentId) {
  const existing = await getTask(taskId)
  if (!existing) return null

  const previousStatus = existing.status
  const agent = agentId ? await getAgent(agentId) : null

  const task = await repoUpdateTask(taskId, { assignedAgentId: agentId })
  if (!task) return null

  if (agent) {
    await updateAgent(agent.id, {
      currentTaskId: task.id,
      status: task.status === 'blocked' ? 'blocked' : 'working',
      lastActivityAt: new Date().toISOString(),
    })
  }

  await recordTaskMutation(task, {
    kind: 'task.assigned',
    severity: 'info',
    message: agent ? `${task.title} assigned to ${agent.name}` : `${task.title} assignment cleared`,
    fromStatus: previousStatus,
    actor: 'operator',
    metadata: { agentId: agentId || null },
  })

  await emitTaskAndRelated(task)
  return task
}

export async function deleteTask(taskId) {
  const existing = await getTask(taskId)
  if (!existing) return null

  const deleted = await repoDeleteTask(taskId)
  if (!deleted) return null

  emit('task.deleted', { taskId })
  emit('overview.snapshot', await getDashboardSnapshot())
  emitHealth()
  return existing
}

export async function retryTask(taskId, reason) {
  const existing = await getTask(taskId)
  if (!existing) return null
  const previousStatus = existing.status

  const task = await repoUpdateTask(taskId, {
    status: 'queued',
    blockerReason: null,
    metadata: { ...(existing.metadata || {}), retryReason: reason || null },
  })
  if (!task) return null

  await recordTaskMutation(task, {
    kind: 'task.retried',
    severity: 'info',
    message: reason ? `${task.title} queued again: ${reason}` : `${task.title} queued again`,
    fromStatus: previousStatus,
    metadata: { retryReason: reason || null },
  })

  await emitTaskAndRelated(task)
  return task
}

export async function sendSessionMessage(sessionId, message) {
  const session = await getSession(sessionId)
  if (!session) return null

  const event = await appendEvent({
    kind: 'session.message_requested',
    severity: 'info',
    message: `Queued operator message for ${session.label || session.id}`,
    agentId: session.agentId,
    sessionId,
    metadata: { message },
  })

  emit('event.created', { event })
  emit('session.updated', { session })
  emit('overview.snapshot', await getDashboardSnapshot())
  emitHealth()

  return {
    accepted: true,
    sessionId,
    auditId: `cmd_msg_${Date.now()}`,
    message,
  }
}

export async function stopSession(sessionId, reason) {
  const session = await getSession(sessionId)
  if (!session) return null
  const now = new Date().toISOString()

  await updateSession(sessionId, {
    state: 'paused',
    lastActivityAt: now,
    metadata: { ...(session.metadata || {}), stopReason: reason || null },
  })

  const task = session.currentTaskId ? await getTask(session.currentTaskId) : null
  if (task) {
    await repoUpdateTask(task.id, { status: 'waiting' })
  }

  const event = await appendEvent({
    kind: 'session.stop_requested',
    severity: 'warning',
    message: reason ? `${session.label || session.id} pause requested: ${reason}` : `${session.label || session.id} pause requested`,
    agentId: session.agentId,
    sessionId,
    taskId: task?.id || null,
    metadata: { reason: reason || null },
  })

  const updatedSession = await getSession(sessionId)
  const updatedTask = task ? await getTask(task.id) : null

  emit('event.created', { event })
  emit('session.updated', { session: updatedSession || session })
  if (updatedTask) emit('task.updated', { task: updatedTask })

  const agent = await getAgent(session.agentId)
  if (agent) {
    await updateAgent(agent.id, { status: 'waiting', lastActivityAt: now })
    emit('agent.updated', await buildAgentCard(agent))
  }

  emit('overview.snapshot', await getDashboardSnapshot())
  emitHealth()

  return {
    accepted: true,
    sessionId,
    auditId: `cmd_stop_${Date.now()}`,
  }
}
