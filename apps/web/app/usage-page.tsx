'use client'

import { useEffect, useState } from 'react'

type UsageData = {
  totalTokens: number; totalInput: number; totalOutput: number
  estimatedCostUsd: number; sessionCount: number
  byAgent: { agentId: string; totalTokens: number; inputTokens: number; outputTokens: number; sessions: number }[]
  byModel: { model: string; provider: string; totalTokens: number; sessions: number }[]
}

function fmt(n: number) { return n >= 1000000 ? `${(n / 1000000).toFixed(2)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n) }

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return <div className="usage-bar"><div className="usage-bar__fill" style={{ width: `${pct}%`, background: color }} /></div>
}

export function UsagePage({ apiBaseUrl }: { apiBaseUrl: string }) {
  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/v1/usage/summary`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((r) => { if (r.data) setData(r.data); else setError(r.error?.message || 'Failed') })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [apiBaseUrl])

  if (loading) return <div className="page-loading">Loading usage data...</div>
  if (error) return <div className="page-error">{error}</div>
  if (!data) return null

  const maxAgent = Math.max(...data.byAgent.map((a) => a.totalTokens), 1)
  const colors = ['#5c6cfc', '#40d680', '#f0a030', '#fc5c8c', '#3cb7e0', '#b060e0', '#e05050', '#888']

  return (
    <div className="usage-page">
      <h2>Usage & Cost</h2>

      <div className="usage-cards">
        <div className="usage-card"><span className="usage-card__label">Total Tokens</span><strong>{fmt(data.totalTokens)}</strong></div>
        <div className="usage-card"><span className="usage-card__label">Input Tokens</span><strong>{fmt(data.totalInput)}</strong></div>
        <div className="usage-card"><span className="usage-card__label">Output Tokens</span><strong>{fmt(data.totalOutput)}</strong></div>
        <div className="usage-card"><span className="usage-card__label">Est. Cost</span><strong>${data.estimatedCostUsd.toFixed(4)}</strong></div>
        <div className="usage-card"><span className="usage-card__label">Sessions</span><strong>{data.sessionCount}</strong></div>
      </div>

      <div className="usage-sections">
        <section>
          <h3>By Agent</h3>
          <div className="usage-table">
            {data.byAgent.sort((a, b) => b.totalTokens - a.totalTokens).map((a, i) => (
              <div key={a.agentId} className="usage-row">
                <span className="usage-row__name">{a.agentId}</span>
                <Bar value={a.totalTokens} max={maxAgent} color={colors[i % colors.length]} />
                <span className="usage-row__value">{fmt(a.totalTokens)}</span>
                <span className="usage-row__detail">{a.sessions} sessions</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3>By Model</h3>
          <div className="usage-table">
            {data.byModel.sort((a, b) => b.totalTokens - a.totalTokens).map((m, i) => (
              <div key={m.model} className="usage-row">
                <span className="usage-row__name">{m.model}</span>
                <Bar value={m.totalTokens} max={data.totalTokens} color={colors[(i + 2) % colors.length]} />
                <span className="usage-row__value">{fmt(m.totalTokens)}</span>
                <span className="usage-row__detail">{m.provider}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
