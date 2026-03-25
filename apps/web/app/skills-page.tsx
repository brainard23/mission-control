'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ChatAgent } from '../lib/api'
import { fetchChatAgents } from '../lib/api'

type AgentDetail = {
  agentId: string
  sessions: { key: string; model: string; totalTokens: number; kind: string }[]
  mainSession: { key: string; model: string; totalTokens: number } | null
  subAgents: { key: string; kind: string; model: string; totalTokens: number }[]
  totalTokens: number
}

export function SkillsPage({ apiBaseUrl }: { apiBaseUrl: string }) {
  const [agents, setAgents] = useState<ChatAgent[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [detail, setDetail] = useState<AgentDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingAgents, setLoadingAgents] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Spawn dialog state
  const [showSpawn, setShowSpawn] = useState(false)
  const [spawnId, setSpawnId] = useState('')
  const [spawnName, setSpawnName] = useState('')
  const [spawnEmoji, setSpawnEmoji] = useState('')
  const [spawning, setSpawning] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const refreshAgents = useCallback(() => {
    setLoadingAgents(true)
    fetchChatAgents(apiBaseUrl)
      .then((list) => { setAgents(list); if (list.length && !selected) setSelected(list[0].id) })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingAgents(false))
  }, [apiBaseUrl, selected])

  // Load agent list
  useEffect(() => {
    refreshAgents()
  }, [apiBaseUrl])

  // Load detail when agent selected
  const loadDetail = useCallback(async (agentId: string) => {
    setLoading(true)
    setError(null)
    setDetail(null)
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/openclaw/agent/${agentId}`, { cache: 'no-store' })
      const payload = await res.json()
      if (!res.ok || !('data' in payload)) throw new Error(payload.error?.message || 'Failed')
      setDetail(payload.data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load agent details')
    } finally {
      setLoading(false)
    }
  }, [apiBaseUrl])

  useEffect(() => {
    if (selected) loadDetail(selected)
  }, [selected, loadDetail])

  const handleSpawn = useCallback(async () => {
    if (!spawnId.trim()) return
    setSpawning(true)
    setError(null)
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/openclaw/agents/spawn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: spawnId.trim().toLowerCase(), name: spawnName.trim() || undefined, emoji: spawnEmoji.trim() || undefined }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error?.message || 'Spawn failed')
      setShowSpawn(false)
      setSpawnId(''); setSpawnName(''); setSpawnEmoji('')
      refreshAgents()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Spawn failed')
    } finally {
      setSpawning(false)
    }
  }, [apiBaseUrl, spawnId, spawnName, spawnEmoji, refreshAgents])

  const handleDelete = useCallback(async (agentId: string) => {
    if (!confirm(`Delete agent "${agentId}"? This removes the agent and its workspace.`)) return
    setDeleting(agentId)
    setError(null)
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/openclaw/agents/${agentId}`, { method: 'DELETE' })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error?.message || 'Delete failed')
      if (selected === agentId) { setSelected(null); setDetail(null) }
      refreshAgents()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setDeleting(null)
    }
  }, [apiBaseUrl, selected, refreshAgents])

  const selectedAgent = agents.find((a) => a.id === selected)

  return (
    <div className="skills-page">
      <div className="skills-page__header">
        <h2>Agents & Sub-Agents</h2>
        <button className="action-btn action-btn--primary" onClick={() => setShowSpawn(true)}>+ Spawn Agent</button>
      </div>

      {/* Spawn dialog */}
      {showSpawn && (
        <div className="spawn-dialog">
          <div className="spawn-dialog__header"><h3>Spawn New Agent</h3><button className="agent-detail__close" onClick={() => setShowSpawn(false)}>✕</button></div>
          <div className="spawn-dialog__body">
            <label>
              <span>Agent ID <small>(required, lowercase)</small></span>
              <input value={spawnId} onChange={(e) => setSpawnId(e.target.value)} placeholder="e.g. atlas, scout, ops" />
            </label>
            <label>
              <span>Display Name</span>
              <input value={spawnName} onChange={(e) => setSpawnName(e.target.value)} placeholder="e.g. Atlas, Scout" />
            </label>
            <label>
              <span>Emoji</span>
              <input value={spawnEmoji} onChange={(e) => setSpawnEmoji(e.target.value)} placeholder="e.g. 🧭 🎨 🔧" maxLength={4} style={{ width: 80 }} />
            </label>
          </div>
          <div className="spawn-dialog__footer">
            <button className="action-btn" onClick={() => setShowSpawn(false)}>Cancel</button>
            <button className="action-btn action-btn--primary" onClick={handleSpawn} disabled={spawning || !spawnId.trim()}>
              {spawning ? 'Spawning...' : 'Spawn'}
            </button>
          </div>
        </div>
      )}

      {/* Agent selector */}
      {loadingAgents && <p className="muted-sm">Loading agents...</p>}
      <div className="agent-selector">
        {agents.map((agent) => (
          <button
            key={agent.id}
            className={`agent-selector__btn${selected === agent.id ? ' agent-selector__btn--active' : ''}`}
            onClick={() => setSelected(agent.id)}
          >
            <span className="agent-selector__emoji">{agent.emoji || '🤖'}</span>
            <div className="agent-selector__info">
              <strong>{agent.name}</strong>
              <span>{agent.model}</span>
            </div>
            <div className="agent-selector__actions">
              {agent.isDefault && <span className="agent-selector__default">Default</span>}
              {!agent.isDefault && (
                <button
                  className="agent-selector__delete"
                  title={`Delete ${agent.name}`}
                  onClick={(e) => { e.stopPropagation(); handleDelete(agent.id) }}
                  disabled={deleting === agent.id}
                >
                  {deleting === agent.id ? '...' : '✕'}
                </button>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Detail panel */}
      {error && <div className="skills-error">{error}</div>}

      {loading && <p className="muted-sm">Loading {selectedAgent?.name || selected}...</p>}

      {detail && !loading && (
        <div className="agent-detail-panel">
          <div className="agent-detail-panel__header">
            <span className="agent-detail-panel__emoji">{selectedAgent?.emoji || '🤖'}</span>
            <div>
              <h3>{selectedAgent?.name || detail.agentId}</h3>
              <span className="muted-sm">{selectedAgent?.model} — {detail.totalTokens > 0 ? `${(detail.totalTokens / 1000).toFixed(1)}k tokens used` : 'No token usage'}</span>
            </div>
          </div>

          {/* Main session */}
          {detail.mainSession && (
            <div className="agent-section">
              <h4>Main Session</h4>
              <div className="agent-session-card">
                <span className="agent-session-dot agent-session-dot--main" />
                <div>
                  <strong>{detail.mainSession.key}</strong>
                  <span className="muted-sm">Model: {detail.mainSession.model} — {((detail.mainSession.totalTokens || 0) / 1000).toFixed(1)}k tokens</span>
                </div>
              </div>
            </div>
          )}

          {/* Sub-agents */}
          {detail.subAgents.length > 0 && (
            <div className="agent-section">
              <h4>Sub-Agents & Channels ({detail.subAgents.length})</h4>
              {detail.subAgents.map((sub) => (
                <div key={sub.key} className="agent-session-card">
                  <span className="agent-session-dot agent-session-dot--sub" />
                  <div>
                    <strong>{sub.key.replace(`agent:${detail.agentId}:`, '')}</strong>
                    <span className="muted-sm">
                      {sub.kind || 'channel'} — {sub.model} — {((sub.totalTokens || 0) / 1000).toFixed(1)}k tokens
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* All sessions */}
          {detail.sessions.length > 0 && (
            <div className="agent-section">
              <h4>All Sessions ({detail.sessions.length})</h4>
              <div className="agent-sessions-table">
                {detail.sessions.map((s) => (
                  <div key={s.key} className="agent-sessions-row">
                    <span className="agent-sessions-key">{s.key}</span>
                    <span className="muted-sm">{s.model}</span>
                    <span className="muted-sm">{((s.totalTokens || 0) / 1000).toFixed(1)}k</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {detail.sessions.length === 0 && (
            <p className="muted-sm" style={{ padding: '20px 0' }}>No sessions found for this agent.</p>
          )}
        </div>
      )}
    </div>
  )
}
