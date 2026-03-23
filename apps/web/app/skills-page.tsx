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

  // Load agent list
  useEffect(() => {
    fetchChatAgents(apiBaseUrl)
      .then((list) => { setAgents(list); if (list.length && !selected) setSelected(list[0].id) })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingAgents(false))
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

  const selectedAgent = agents.find((a) => a.id === selected)

  return (
    <div className="skills-page">
      <h2>Agents & Sub-Agents</h2>

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
            {agent.isDefault && <span className="agent-selector__default">Default</span>}
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
