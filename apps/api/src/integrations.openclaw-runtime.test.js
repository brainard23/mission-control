import test from 'node:test'
import assert from 'node:assert/strict'
import { diffRuntimeSnapshots } from './integrations.openclaw-runtime.js'

test('diffRuntimeSnapshots detects added, changed, and removed runtime presence', () => {
  const previousSnapshot = {
    agents: [
      { id: 'agent_main', name: 'Main', roomId: 'room_runtime_live', currentSessionId: 'sess_main', lastActivityAt: '2026-03-19T10:00:00Z' },
      { id: 'agent_old', name: 'Old Worker', roomId: 'room_runtime_live', currentSessionId: 'sess_old', lastActivityAt: '2026-03-19T09:59:00Z' },
    ],
    sessions: [
      { id: 'sess_main', agentId: 'agent_main', label: 'main', lastActivityAt: '2026-03-19T10:00:00Z', state: 'active' },
      { id: 'sess_old', agentId: 'agent_old', label: 'old', lastActivityAt: '2026-03-19T09:59:00Z', state: 'active' },
    ],
    rooms: [{ id: 'room_runtime_live', name: 'Live Runtime' }],
    placements: [{ id: 'placement_agent_main', agentId: 'agent_main', roomId: 'room_runtime_live', x: 0, y: 0 }],
    health: { backendStatus: 'healthy', gatewayStatus: 'healthy', nodesOnline: 1 },
  }

  const nextSnapshot = {
    agents: [
      { id: 'agent_main', name: 'Main', roomId: 'room_runtime_live', currentSessionId: 'sess_main', lastActivityAt: '2026-03-19T10:05:00Z' },
      { id: 'agent_new', name: 'New Worker', roomId: 'room_runtime_live', currentSessionId: 'sess_new', lastActivityAt: '2026-03-19T10:05:00Z' },
    ],
    sessions: [
      { id: 'sess_main', agentId: 'agent_main', label: 'main', lastActivityAt: '2026-03-19T10:05:00Z', state: 'active' },
      { id: 'sess_new', agentId: 'agent_new', label: 'new', lastActivityAt: '2026-03-19T10:05:00Z', state: 'active' },
    ],
    rooms: [{ id: 'room_runtime_live', name: 'Live Runtime' }],
    placements: [
      { id: 'placement_agent_main', agentId: 'agent_main', roomId: 'room_runtime_live', x: 0, y: 0 },
      { id: 'placement_agent_new', agentId: 'agent_new', roomId: 'room_runtime_live', x: 1, y: 0 },
    ],
    health: { backendStatus: 'healthy', gatewayStatus: 'healthy', nodesOnline: 2 },
  }

  const diff = diffRuntimeSnapshots(previousSnapshot, nextSnapshot)

  assert.deepEqual(diff.addedAgentIds, ['agent_new'])
  assert.deepEqual(diff.removedAgentIds, ['agent_old'])
  assert.deepEqual(diff.changedAgentIds, ['agent_main'])
  assert.deepEqual(diff.addedSessionIds, ['sess_new'])
  assert.deepEqual(diff.removedSessionIds, ['sess_old'])
  assert.deepEqual(diff.changedSessionIds, ['sess_main'])
  assert.equal(diff.roomsChanged, false)
  assert.equal(diff.placementsChanged, true)
  assert.equal(diff.healthChanged, true)
  assert.equal(diff.hasPresenceChanges, true)
})

test('diffRuntimeSnapshots stays quiet when nothing material changes', () => {
  const snapshot = {
    agents: [{ id: 'agent_main', name: 'Main', currentSessionId: 'sess_main' }],
    sessions: [{ id: 'sess_main', agentId: 'agent_main', state: 'active' }],
    rooms: [{ id: 'room_runtime_live', name: 'Live Runtime' }],
    placements: [{ id: 'placement_agent_main', agentId: 'agent_main', roomId: 'room_runtime_live', x: 0, y: 0 }],
    health: { backendStatus: 'healthy', gatewayStatus: 'healthy', nodesOnline: 1 },
  }

  const diff = diffRuntimeSnapshots(snapshot, snapshot)

  assert.deepEqual(diff.addedAgentIds, [])
  assert.deepEqual(diff.removedAgentIds, [])
  assert.deepEqual(diff.changedAgentIds, [])
  assert.deepEqual(diff.addedSessionIds, [])
  assert.deepEqual(diff.removedSessionIds, [])
  assert.deepEqual(diff.changedSessionIds, [])
  assert.equal(diff.roomsChanged, false)
  assert.equal(diff.placementsChanged, false)
  assert.equal(diff.healthChanged, false)
  assert.equal(diff.hasPresenceChanges, false)
})
