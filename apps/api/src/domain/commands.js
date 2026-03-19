import { getSession, getTask, createTask, listTasks } from './repository.js'

export function updateTask(id, patch) {
  const task = getTask(id)
  if (!task) return null

  if (typeof patch.title === 'string') task.title = patch.title
  if (patch.description !== undefined) task.description = patch.description
  if (patch.status) task.status = patch.status
  if (patch.priority) task.priority = patch.priority
  if (patch.blockerReason !== undefined) task.blockerReason = patch.blockerReason
  if (Array.isArray(patch.tags)) task.tags = patch.tags
  if (patch.metadata) task.metadata = { ...(task.metadata || {}), ...patch.metadata }
  task.updatedAt = new Date().toISOString()
  if (task.status === 'done') task.completedAt = task.updatedAt
  return task
}

export function assignTask(taskId, agentId) {
  const task = getTask(taskId)
  if (!task) return null
  task.assignedAgentId = agentId
  task.updatedAt = new Date().toISOString()
  return task
}

export function retryTask(taskId, reason) {
  const task = getTask(taskId)
  if (!task) return null
  task.status = 'queued'
  task.blockerReason = null
  task.updatedAt = new Date().toISOString()
  task.metadata = { ...(task.metadata || {}), retryReason: reason || null }
  return task
}

export function sendSessionMessage(sessionId, message) {
  const session = getSession(sessionId)
  if (!session) return null
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
  session.state = 'paused'
  session.lastActivityAt = new Date().toISOString()
  session.metadata = { ...(session.metadata || {}), stopReason: reason || null }
  return {
    accepted: true,
    sessionId,
    auditId: `cmd_stop_${Date.now()}`,
  }
}
