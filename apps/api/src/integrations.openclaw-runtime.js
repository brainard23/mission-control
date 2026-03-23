import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { buildAgentCard, getDashboardSnapshot, getHealth } from './domain/services.js'
import { publishRealtime } from './realtime/hub.js'

const execFileAsync = promisify(execFile)
const LIVE_ROOM_ID = 'room_runtime_live'
const ACTIVE_WINDOW_MINUTES = Number(process.env.MISSION_CONTROL_ACTIVE_WINDOW_MINUTES || 240)
const REFRESH_INTERVAL_MS = Number(process.env.MISSION_CONTROL_RUNTIME_REFRESH_MS || 15000)
const STALE_AFTER_MS = Number(process.env.MISSION_CONTROL_RUNTIME_STALE_MS || 60000)

const state = {
  snapshot: {
    agents: [],
    sessions: [],
    rooms: [],
    placements: [],
    health: {
      backendStatus: 'healthy',
      gatewayStatus: 'unknown',
      nodesOnline: 0,
      websocketReady: true,
      lastSyncAt: null,
    },
  },
  sync: {
    lastSyncAt: null,
    lastAttemptAt: null,
    failureCount: 0,
    lastError: null,
  },
  started: false,
  timer: null,
  refreshing: null,
}

function slug(input) {
  return String(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function parseRuntimeFromKey(key) {
  if (key.includes(':subagent:')) return 'subagent'
  if (key.includes(':acp:') || key.includes(':agent:')) return 'acp'
  return 'main'
}

function titleCase(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value
}

function buildAgentName(session) {
  const provider = session.agentId ? titleCase(session.agentId) : 'OpenClaw'
  const runtime = parseRuntimeFromKey(session.key)
  if (runtime === 'main') return `${provider} Main`
  if (runtime === 'subagent') return `${provider} Subagent`
  return `${provider} ACP`
}

function mapSession(session, agentId) {
  const runtime = parseRuntimeFromKey(session.key)
  const startedAt = new Date(session.updatedAt - (session.ageMs || 0)).toISOString()
  return {
    id: session.sessionId || `session_${slug(session.key)}`,
    label: session.key,
    agentId,
    runtime,
    model: session.model || null,
    state: 'active',
    startedAt,
    lastActivityAt: new Date(session.updatedAt).toISOString(),
    currentTaskId: null,
    summary: `${titleCase(runtime)} session active in OpenClaw`,
    metadata: {
      originalKey: session.key,
      providerAgentId: session.agentId || null,
      kind: session.kind || null,
      modelProvider: session.modelProvider || null,
      totalTokens: session.totalTokens ?? null,
    },
  }
}

function mapAgent(session, agentId, sessionId) {
  const runtime = parseRuntimeFromKey(session.key)
  return {
    id: agentId,
    name: buildAgentName(session),
    type: runtime,
    role: runtime === 'main' ? 'Primary assistant' : runtime === 'subagent' ? 'Delegated worker' : 'ACP runtime',
    capabilities: [runtime, session.model, session.modelProvider].filter(Boolean),
    status: 'working',
    roomId: LIVE_ROOM_ID,
    currentSessionId: sessionId,
    currentTaskId: null,
    lastActivityAt: new Date(session.updatedAt).toISOString(),
    runtimeSource: 'openclaw',
    metadata: {
      originalKey: session.key,
      providerAgentId: session.agentId || null,
      kind: session.kind || null,
      sessionId,
    },
  }
}

function mapPresenceHealth(presenceEntries, lastSyncAt) {
  const gatewayEntry = presenceEntries.find((entry) => entry.mode === 'gateway' || entry.reason === 'self')
  const nodeEntries = presenceEntries.filter((entry) => entry.roles?.includes('operator') || entry.mode === 'backend')

  return {
    backendStatus: 'healthy',
    gatewayStatus: gatewayEntry ? 'healthy' : 'unknown',
    nodesOnline: nodeEntries.length,
    websocketReady: true,
    lastSyncAt,
  }
}

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

function stableSerialize(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(',')}}`
  }

  return JSON.stringify(value)
}

function indexById(items) {
  return new Map(items.map((item) => [item.id, item]))
}

export function diffRuntimeSnapshots(previousSnapshot, nextSnapshot) {
  const previousAgents = indexById(previousSnapshot.agents || [])
  const nextAgents = indexById(nextSnapshot.agents || [])
  const previousSessions = indexById(previousSnapshot.sessions || [])
  const nextSessions = indexById(nextSnapshot.sessions || [])

  const addedAgentIds = []
  const removedAgentIds = []
  const changedAgentIds = []
  const addedSessionIds = []
  const removedSessionIds = []
  const changedSessionIds = []

  for (const [id, agent] of nextAgents) {
    if (!previousAgents.has(id)) {
      addedAgentIds.push(id)
      continue
    }

    if (stableSerialize(previousAgents.get(id)) !== stableSerialize(agent)) {
      changedAgentIds.push(id)
    }
  }

  for (const id of previousAgents.keys()) {
    if (!nextAgents.has(id)) removedAgentIds.push(id)
  }

  for (const [id, session] of nextSessions) {
    if (!previousSessions.has(id)) {
      addedSessionIds.push(id)
      continue
    }

    if (stableSerialize(previousSessions.get(id)) !== stableSerialize(session)) {
      changedSessionIds.push(id)
    }
  }

  for (const id of previousSessions.keys()) {
    if (!nextSessions.has(id)) removedSessionIds.push(id)
  }

  const roomsChanged = stableSerialize(previousSnapshot.rooms || []) !== stableSerialize(nextSnapshot.rooms || [])
  const placementsChanged = stableSerialize(previousSnapshot.placements || []) !== stableSerialize(nextSnapshot.placements || [])
  const healthChanged = stableSerialize(previousSnapshot.health || {}) !== stableSerialize(nextSnapshot.health || {})

  return {
    addedAgentIds,
    removedAgentIds,
    changedAgentIds,
    addedSessionIds,
    removedSessionIds,
    changedSessionIds,
    roomsChanged,
    placementsChanged,
    healthChanged,
    hasPresenceChanges: Boolean(
      addedAgentIds.length || removedAgentIds.length || changedAgentIds.length
      || addedSessionIds.length || removedSessionIds.length || changedSessionIds.length
      || roomsChanged || placementsChanged
    ),
  }
}

async function publishRuntimeRefresh(previousSnapshot, nextSnapshot) {
  const diff = diffRuntimeSnapshots(previousSnapshot, nextSnapshot)
  if (!diff.hasPresenceChanges && !diff.healthChanged) return

  const changedAgentIds = [...new Set([...diff.addedAgentIds, ...diff.changedAgentIds])]
  const changedSessionIds = [...new Set([...diff.addedSessionIds, ...diff.changedSessionIds])]
  const nextSessions = indexById(nextSnapshot.sessions || [])

  for (const agentId of changedAgentIds) {
    const agentCard = await buildAgentCard(nextSnapshot.agents.find((agent) => agent.id === agentId))
    emit('agent.updated', agentCard)
  }

  for (const sessionId of changedSessionIds) {
    const session = nextSessions.get(sessionId)
    if (!session) continue
    emit('session.updated', { session })
  }

  emit('overview.snapshot', await getDashboardSnapshot())
  emitHealth()
}

const OPENCLAW_CONTAINER = process.env.OPENCLAW_CONTAINER || 'openclaw-openclaw-gateway-1'

async function runOpenClawJson(args) {
  const { stdout } = await execFileAsync('docker', ['exec', OPENCLAW_CONTAINER, 'openclaw', ...args], {
    cwd: process.cwd(),
    timeout: 15000,
    maxBuffer: 1024 * 1024,
    env: process.env,
  })

  return JSON.parse(stdout)
}

async function fetchRuntimeSnapshot() {
  const [presence, sessionsPayload] = await Promise.all([
    runOpenClawJson(['system', 'presence', '--json']),
    runOpenClawJson(['sessions', '--all-agents', '--active', String(ACTIVE_WINDOW_MINUTES), '--json']),
  ])

  const activeSessions = Array.isArray(sessionsPayload.sessions) ? sessionsPayload.sessions : []
  const agents = []
  const sessions = []
  const placements = []

  // Group sessions by real agentId to avoid duplicates
  const agentSessionMap = new Map()
  activeSessions
    .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
    .forEach((session) => {
      const realAgentId = session.agentId || slug(session.key.split(':')[1] || session.key)
      const agentId = `agent_${slug(realAgentId)}`
      const mappedSession = mapSession(session, agentId)
      sessions.push(mappedSession)

      if (!agentSessionMap.has(agentId)) {
        agentSessionMap.set(agentId, { session, agentId, mappedSessionId: mappedSession.id })
      }
    })

  let placementIndex = 0
  for (const [agentId, { session, mappedSessionId }] of agentSessionMap) {
    const mappedAgent = mapAgent(session, agentId, mappedSessionId)
    agents.push(mappedAgent)
    placements.push({
      id: `placement_${agentId}`,
      roomId: LIVE_ROOM_ID,
      agentId,
      x: placementIndex % 3,
      y: Math.floor(placementIndex / 3),
      w: 1,
      h: 1,
      zIndex: 0,
      metadata: { generated: true },
    })
    placementIndex++
  }

  const lastSyncAt = new Date().toISOString()

  return {
    agents,
    sessions,
    rooms: [
      {
        id: LIVE_ROOM_ID,
        name: 'Live Runtime',
        kind: 'infra',
        sortOrder: 0,
        metadata: { generated: true, source: 'openclaw' },
      },
    ],
    placements,
    health: mapPresenceHealth(Array.isArray(presence) ? presence : [], lastSyncAt),
    lastSyncAt,
  }
}

export function getRuntimeSnapshot() {
  const lastSyncMs = state.sync.lastSyncAt ? Date.parse(state.sync.lastSyncAt) : 0
  const isStale = !lastSyncMs || Date.now() - lastSyncMs > STALE_AFTER_MS
  return {
    ...state.snapshot,
    health: {
      ...state.snapshot.health,
      gatewayStatus: isStale && state.sync.lastSyncAt ? 'degraded' : state.snapshot.health.gatewayStatus,
      lastSyncAt: state.sync.lastSyncAt,
    },
    sync: { ...state.sync, isStale },
  }
}

export async function refreshRuntimeSnapshot() {
  if (state.refreshing) return state.refreshing

  state.sync.lastAttemptAt = new Date().toISOString()
  state.refreshing = fetchRuntimeSnapshot()
    .then(async (snapshot) => {
      const previousSnapshot = state.snapshot
      state.snapshot = {
        agents: snapshot.agents,
        sessions: snapshot.sessions,
        rooms: snapshot.rooms,
        placements: snapshot.placements,
        health: snapshot.health,
      }
      state.sync.lastSyncAt = snapshot.lastSyncAt
      state.sync.failureCount = 0
      state.sync.lastError = null
      await publishRuntimeRefresh(previousSnapshot, state.snapshot)
      return getRuntimeSnapshot()
    })
    .catch((error) => {
      state.sync.failureCount += 1
      state.sync.lastError = error instanceof Error ? error.message : String(error)
      return getRuntimeSnapshot()
    })
    .finally(() => {
      state.refreshing = null
    })

  return state.refreshing
}

export function startRuntimeSync() {
  if (state.started) return
  state.started = true
  refreshRuntimeSnapshot().catch(() => {})
  state.timer = setInterval(() => {
    refreshRuntimeSnapshot().catch(() => {})
  }, REFRESH_INTERVAL_MS)
}
