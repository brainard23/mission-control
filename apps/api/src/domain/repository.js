import { query } from '../db.js'
import { getRuntimeSnapshot } from '../integrations.openclaw-runtime.js'

// --- Row-to-domain mappers (snake_case → camelCase) ---

function rowToAgent(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    role: row.role,
    capabilities: row.capabilities || [],
    status: row.status,
    roomId: row.room_id,
    currentSessionId: row.current_session_id,
    currentTaskId: row.current_task_id,
    lastActivityAt: row.last_activity_at?.toISOString?.() ?? row.last_activity_at,
    runtimeSource: row.runtime_source,
    metadata: row.metadata || {},
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
  }
}

function rowToSession(row) {
  return {
    id: row.id,
    label: row.label,
    agentId: row.agent_id,
    runtime: row.runtime,
    model: row.model,
    state: row.state,
    startedAt: row.started_at?.toISOString?.() ?? row.started_at,
    lastActivityAt: row.last_activity_at?.toISOString?.() ?? row.last_activity_at,
    currentTaskId: row.current_task_id,
    summary: row.summary,
    metadata: row.metadata || {},
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
  }
}

function rowToTask(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assignedAgentId: row.assigned_agent_id,
    sessionId: row.session_id,
    blockerReason: row.blocker_reason,
    tags: row.tags || [],
    source: row.source,
    createdBy: row.created_by,
    completedAt: row.completed_at?.toISOString?.() ?? row.completed_at ?? null,
    metadata: row.metadata || {},
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
  }
}

function rowToEvent(row) {
  return {
    id: row.id,
    ts: row.ts?.toISOString?.() ?? row.ts,
    kind: row.kind,
    severity: row.severity,
    message: row.message,
    agentId: row.agent_id,
    sessionId: row.session_id,
    taskId: row.task_id,
    metadata: row.metadata || {},
  }
}

function rowToRoom(row) {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    sortOrder: row.sort_order,
    metadata: row.metadata || {},
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
  }
}

function rowToPlacement(row) {
  return {
    id: row.id,
    roomId: row.room_id,
    agentId: row.agent_id,
    x: row.x,
    y: row.y,
    w: row.w,
    h: row.h,
    zIndex: row.z_index,
    metadata: row.metadata || {},
  }
}

function rowToTaskHistory(row) {
  return {
    id: row.id,
    taskId: row.task_id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    message: row.message,
    actor: row.actor,
    eventKind: row.event_kind,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    metadata: row.metadata || {},
  }
}

// --- Agents ---

export async function listAgents() {
  const runtimeAgents = getRuntimeSnapshot().agents
  const { rows } = await query('SELECT * FROM agents ORDER BY name')
  const dbAgents = rows.map(rowToAgent)
  return runtimeAgents.length ? [...runtimeAgents, ...dbAgents] : dbAgents
}

export async function getAgent(id) {
  // Check runtime agents first
  const runtimeAgent = getRuntimeSnapshot().agents.find((a) => a.id === id)
  if (runtimeAgent) return runtimeAgent

  const { rows } = await query('SELECT * FROM agents WHERE id = $1', [id])
  return rows[0] ? rowToAgent(rows[0]) : null
}

export async function updateAgent(id, patch) {
  const setClauses = []
  const values = []
  let paramIndex = 1

  const fields = {
    name: 'name',
    type: 'type',
    role: 'role',
    capabilities: 'capabilities',
    status: 'status',
    roomId: 'room_id',
    currentSessionId: 'current_session_id',
    currentTaskId: 'current_task_id',
    lastActivityAt: 'last_activity_at',
    runtimeSource: 'runtime_source',
    metadata: 'metadata',
  }

  for (const [jsKey, dbCol] of Object.entries(fields)) {
    if (patch[jsKey] !== undefined) {
      setClauses.push(`${dbCol} = $${paramIndex}`)
      values.push(jsKey === 'capabilities' || jsKey === 'metadata' ? JSON.stringify(patch[jsKey]) : patch[jsKey])
      paramIndex++
    }
  }

  if (setClauses.length === 0) return getAgent(id)

  setClauses.push(`updated_at = now()`)
  values.push(id)

  const sql = `UPDATE agents SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`
  const { rows } = await query(sql, values)
  return rows[0] ? rowToAgent(rows[0]) : null
}

// --- Sessions ---

export async function listSessions() {
  const runtimeSessions = getRuntimeSnapshot().sessions
  const { rows } = await query('SELECT * FROM sessions ORDER BY started_at DESC')
  const dbSessions = rows.map(rowToSession)
  return runtimeSessions.length ? [...runtimeSessions, ...dbSessions] : dbSessions
}

export async function getSession(id) {
  const runtimeSession = getRuntimeSnapshot().sessions.find((s) => s.id === id)
  if (runtimeSession) return runtimeSession

  const { rows } = await query('SELECT * FROM sessions WHERE id = $1', [id])
  return rows[0] ? rowToSession(rows[0]) : null
}

export async function updateSession(id, patch) {
  const setClauses = []
  const values = []
  let paramIndex = 1

  const fields = {
    label: 'label',
    agentId: 'agent_id',
    runtime: 'runtime',
    model: 'model',
    state: 'state',
    lastActivityAt: 'last_activity_at',
    currentTaskId: 'current_task_id',
    summary: 'summary',
    metadata: 'metadata',
  }

  for (const [jsKey, dbCol] of Object.entries(fields)) {
    if (patch[jsKey] !== undefined) {
      setClauses.push(`${dbCol} = $${paramIndex}`)
      values.push(jsKey === 'metadata' ? JSON.stringify(patch[jsKey]) : patch[jsKey])
      paramIndex++
    }
  }

  if (setClauses.length === 0) return getSession(id)

  setClauses.push(`updated_at = now()`)
  values.push(id)

  const sql = `UPDATE sessions SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`
  const { rows } = await query(sql, values)
  return rows[0] ? rowToSession(rows[0]) : null
}

// --- Tasks ---

export async function listTasks() {
  const { rows } = await query('SELECT * FROM tasks ORDER BY created_at DESC')
  return rows.map(rowToTask)
}

export async function getTask(id) {
  const { rows } = await query('SELECT * FROM tasks WHERE id = $1', [id])
  return rows[0] ? rowToTask(rows[0]) : null
}

export async function createTask(input) {
  const now = new Date().toISOString()
  const id = `task_${Date.now()}`
  const { rows } = await query(
    `INSERT INTO tasks (id, title, description, status, priority, assigned_agent_id, session_id, blocker_reason, tags, source, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      id,
      input.title || 'Untitled Task',
      input.description || null,
      'queued',
      input.priority || 'normal',
      input.assignedAgentId || null,
      null,
      null,
      JSON.stringify(input.tags || []),
      'manual',
      now,
      now,
    ]
  )
  return rowToTask(rows[0])
}

export async function updateTask(id, patch) {
  const setClauses = []
  const values = []
  let paramIndex = 1

  const fields = {
    title: 'title',
    description: 'description',
    status: 'status',
    priority: 'priority',
    assignedAgentId: 'assigned_agent_id',
    sessionId: 'session_id',
    blockerReason: 'blocker_reason',
    tags: 'tags',
    completedAt: 'completed_at',
    metadata: 'metadata',
  }

  for (const [jsKey, dbCol] of Object.entries(fields)) {
    if (patch[jsKey] !== undefined) {
      setClauses.push(`${dbCol} = $${paramIndex}`)
      values.push(jsKey === 'tags' || jsKey === 'metadata' ? JSON.stringify(patch[jsKey]) : patch[jsKey])
      paramIndex++
    }
  }

  if (setClauses.length === 0) return getTask(id)

  setClauses.push(`updated_at = now()`)
  values.push(id)

  const sql = `UPDATE tasks SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`
  const { rows } = await query(sql, values)
  return rows[0] ? rowToTask(rows[0]) : null
}

// --- Events ---

export async function listEvents() {
  const { rows } = await query('SELECT * FROM events ORDER BY ts DESC LIMIT 50')
  return rows.map(rowToEvent)
}

export async function appendEvent(input) {
  const id = `evt_${Date.now()}_${Math.floor(Math.random() * 1000)}`
  const { rows } = await query(
    `INSERT INTO events (id, ts, kind, severity, message, agent_id, session_id, task_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      id,
      input.ts || new Date().toISOString(),
      input.kind,
      input.severity || 'info',
      input.message,
      input.agentId || null,
      input.sessionId || null,
      input.taskId || null,
      JSON.stringify(input.metadata || {}),
    ]
  )
  return rowToEvent(rows[0])
}

export async function getEventsFor(filter) {
  const conditions = []
  const values = []
  let paramIndex = 1

  const colMap = { agentId: 'agent_id', sessionId: 'session_id', taskId: 'task_id', kind: 'kind' }

  for (const [jsKey, value] of Object.entries(filter)) {
    const dbCol = colMap[jsKey] || jsKey
    conditions.push(`${dbCol} = $${paramIndex}`)
    values.push(value)
    paramIndex++
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const { rows } = await query(`SELECT * FROM events ${where} ORDER BY ts DESC LIMIT 50`, values)
  return rows.map(rowToEvent)
}

// --- Rooms & Placements ---

export async function listRooms() {
  const runtimeRooms = getRuntimeSnapshot().rooms
  const { rows } = await query('SELECT * FROM rooms ORDER BY sort_order')
  const dbRooms = rows.map(rowToRoom)
  return runtimeRooms.length ? [...runtimeRooms, ...dbRooms] : dbRooms
}

export async function listPlacements() {
  const runtimePlacements = getRuntimeSnapshot().placements
  const { rows } = await query('SELECT * FROM placements')
  const dbPlacements = rows.map(rowToPlacement)
  return runtimePlacements.length ? [...runtimePlacements, ...dbPlacements] : dbPlacements
}

// --- Task History ---

export async function getTaskHistory(taskId) {
  const { rows } = await query(
    'SELECT * FROM task_history WHERE task_id = $1 ORDER BY created_at DESC',
    [taskId]
  )
  return rows.map(rowToTaskHistory)
}

export async function appendTaskHistory(taskId, entry) {
  const id = `hist_${Date.now()}_${Math.floor(Math.random() * 1000)}`
  const { rows } = await query(
    `INSERT INTO task_history (id, task_id, from_status, to_status, message, actor, event_kind, created_at, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      id,
      taskId,
      entry.fromStatus || null,
      entry.toStatus || null,
      entry.message || null,
      entry.actor || 'operator',
      entry.eventKind,
      new Date().toISOString(),
      JSON.stringify(entry.metadata || {}),
    ]
  )
  return rowToTaskHistory(rows[0])
}
