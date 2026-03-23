'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchChatAgents, type ChatAgent } from '../lib/api'

type CronJob = {
  id: string
  name: string
  agentId?: string
  enabled: boolean
  schedule?: { kind?: string; everyMs?: number; cron?: string; anchorMs?: number }
  payload?: { kind?: string; message?: string; timeoutSeconds?: number }
  state?: { nextRunAtMs?: number; lastRunAtMs?: number; lastRunStatus?: string; lastError?: string; consecutiveErrors?: number }
  delivery?: { mode?: string; channel?: string; to?: string }
  sessionTarget?: string
  createdAtMs?: number
}

export function CronPage({ apiBaseUrl }: { apiBaseUrl: string }) {
  const [jobs, setJobs] = useState<CronJob[]>([])
  const [status, setStatus] = useState<{ enabled: boolean; jobs: number } | null>(null)
  const [agents, setAgents] = useState<ChatAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [expandedRuns, setExpandedRuns] = useState<Record<string, unknown[]>>({})
  const [running, setRunning] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetch(`${apiBaseUrl}/api/v1/cron`).then((r) => r.json()),
      fetch(`${apiBaseUrl}/api/v1/cron/status`).then((r) => r.json()),
      fetchChatAgents(apiBaseUrl),
    ]).then(([j, s, a]) => {
      setJobs(j.data?.jobs || [])
      setStatus(s.data || null)
      setAgents(a)
    }).catch((e) => setError(e.message))
    .finally(() => setLoading(false))
  }, [apiBaseUrl])

  useEffect(() => { load() }, [load])

  const handleToggle = async (id: string, enabled: boolean) => {
    await fetch(`${apiBaseUrl}/api/v1/cron/${id}/toggle`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }) })
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this cron job?')) return
    await fetch(`${apiBaseUrl}/api/v1/cron/${id}`, { method: 'DELETE' })
    load()
  }

  const handleRun = async (id: string) => {
    setRunning(id)
    try {
      await fetch(`${apiBaseUrl}/api/v1/cron/${id}/run`, { method: 'POST' })
    } catch {}
    setRunning(null)
    load()
  }

  const handleLoadRuns = async (id: string) => {
    if (expandedRuns[id]) { setExpandedRuns((p) => { const n = { ...p }; delete n[id]; return n }); return }
    const r = await fetch(`${apiBaseUrl}/api/v1/cron/${id}/runs`).then((r) => r.json())
    setExpandedRuns((p) => ({ ...p, [id]: r.data?.runs || [] }))
  }

  const handleCreate = async (data: Record<string, unknown>) => {
    await fetch(`${apiBaseUrl}/api/v1/cron`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    setShowCreate(false)
    load()
  }

  if (loading) return <div className="page-loading">Loading cron jobs...</div>
  if (error) return <div className="page-error">{error}</div>

  return (
    <div className="cron-page">
      <div className="cron-header">
        <div>
          <h2>Cron Jobs</h2>
          {status && <span className="cron-status">Scheduler {status.enabled ? 'active' : 'paused'} — {status.jobs} jobs</span>}
        </div>
        <button className="action-btn action-btn--primary" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? 'Cancel' : '+ New Job'}
        </button>
      </div>

      {showCreate && <CreateCronForm agents={agents} onSubmit={handleCreate} onCancel={() => setShowCreate(false)} />}

      {jobs.length === 0 && <p className="muted-sm">No cron jobs configured. Create one to schedule agent tasks.</p>}

      <div className="cron-list">
        {jobs.map((job) => (
          <div key={job.id} className={`cron-job${job.enabled ? '' : ' cron-job--disabled'}`}>
            <div className="cron-job__main">
              <div className="cron-job__info">
                <strong>{job.name || job.id}</strong>
                {job.payload?.message && <p className="cron-job__desc">{job.payload.message.length > 100 ? job.payload.message.slice(0, 97) + '...' : job.payload.message}</p>}
                <div className="cron-job__meta">
                  {job.schedule?.kind === 'cron' && job.schedule.cron && <span>Cron: <code>{job.schedule.cron}</code></span>}
                  {job.schedule?.kind === 'every' && job.schedule.everyMs && <span>Every: {Math.round(job.schedule.everyMs / 60000)}m</span>}
                  {job.agentId && <span>Agent: {job.agentId}</span>}
                  {job.delivery?.channel && <span>Deliver: {job.delivery.channel}{job.delivery.to ? ` → ${job.delivery.to}` : ''}</span>}
                  <span className={`cron-badge cron-badge--${job.enabled ? 'on' : 'off'}`}>{job.enabled ? 'Enabled' : 'Disabled'}</span>
                  {job.state?.lastRunStatus && <span className={`cron-badge cron-badge--${job.state.lastRunStatus === 'error' ? 'err' : 'ok'}`}>{job.state.lastRunStatus}</span>}
                  {job.state?.nextRunAtMs && <span>Next: {new Date(job.state.nextRunAtMs).toLocaleTimeString()}</span>}
                </div>
                {job.state?.lastError && (
                  <div className="cron-job__error">{job.state.lastError}</div>
                )}
              </div>
              <div className="cron-job__actions">
                <button className="action-btn" onClick={() => handleToggle(job.id, !job.enabled)}>{job.enabled ? 'Disable' : 'Enable'}</button>
                <button className="action-btn" onClick={() => handleRun(job.id)} disabled={running === job.id}>{running === job.id ? 'Running...' : 'Run Now'}</button>
                <button className="action-btn" onClick={() => handleLoadRuns(job.id)}>{expandedRuns[job.id] ? 'Hide Runs' : 'History'}</button>
                <button className="action-btn action-btn--warn" onClick={() => handleDelete(job.id)}>Delete</button>
              </div>
            </div>
            {expandedRuns[job.id] && (
              <div className="cron-runs">
                {(expandedRuns[job.id] as unknown[]).length === 0 && <p className="muted-sm">No run history</p>}
                {(expandedRuns[job.id] as Record<string, unknown>[]).map((run, i) => (
                  <div key={i} className="cron-run">
                    <span className={`cron-run__status cron-run__status--${run.status || 'unknown'}`}>{String(run.status || 'unknown')}</span>
                    <span>{String(run.startedAt || run.ts || '')}</span>
                    {run.durationMs != null && <span>{Number(run.durationMs)}ms</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function CreateCronForm({ agents, onSubmit, onCancel }: {
  agents: ChatAgent[]
  onSubmit: (data: Record<string, unknown>) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [agent, setAgent] = useState(agents[0]?.id || '')
  const [message, setMessage] = useState('')
  const [scheduleType, setScheduleType] = useState<'cron' | 'every'>('every')
  const [cron, setCron] = useState('')
  const [every, setEvery] = useState('1h')
  const [description, setDescription] = useState('')
  const [deliver, setDeliver] = useState(false)
  const [channel, setChannel] = useState('whatsapp')
  const [to, setTo] = useState('')

  return (
    <div className="cron-create">
      <label className="kb-field"><span>Name</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Daily summary" /></label>
      <label className="kb-field"><span>Agent</span>
        <select value={agent} onChange={(e) => setAgent(e.target.value)}>
          {agents.map((a) => <option key={a.id} value={a.id}>{a.emoji || '🤖'} {a.name}</option>)}
        </select>
      </label>
      <label className="kb-field"><span>Message / Prompt</span><textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Summarize today's activity" rows={2} /></label>
      <div className="kb-field-row">
        <label className="kb-field"><span>Schedule Type</span>
          <select value={scheduleType} onChange={(e) => setScheduleType(e.target.value as 'cron' | 'every')}>
            <option value="every">Interval</option><option value="cron">Cron Expression</option>
          </select>
        </label>
        {scheduleType === 'every' ? (
          <label className="kb-field"><span>Every</span><input value={every} onChange={(e) => setEvery(e.target.value)} placeholder="1h, 30m, 1d" /></label>
        ) : (
          <label className="kb-field"><span>Cron Expression</span><input value={cron} onChange={(e) => setCron(e.target.value)} placeholder="0 9 * * *" /></label>
        )}
      </div>
      <label className="kb-field"><span>Description (optional)</span><input value={description} onChange={(e) => setDescription(e.target.value)} /></label>

      {/* Delivery options */}
      <div className="cron-delivery">
        <label className="cron-delivery__toggle">
          <input type="checkbox" checked={deliver} onChange={(e) => setDeliver(e.target.checked)} />
          <span>Deliver reply to channel</span>
        </label>
        {deliver && (
          <div className="kb-field-row">
            <label className="kb-field"><span>Channel</span>
              <select value={channel} onChange={(e) => setChannel(e.target.value)}>
                <option value="whatsapp">WhatsApp</option>
                <option value="telegram">Telegram</option>
                <option value="discord">Discord</option>
                <option value="slack">Slack</option>
              </select>
            </label>
            <label className="kb-field"><span>To (phone/chat ID)</span>
              <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="+639166543866 or chat ID" />
            </label>
          </div>
        )}
      </div>

      <div className="cron-create__actions">
        <button className="action-btn" onClick={onCancel}>Cancel</button>
        <button className="action-btn action-btn--primary" disabled={!name.trim() || !message.trim()} onClick={() => onSubmit({
          name: name.trim(), agent, message: message.trim(), description: description.trim() || undefined,
          ...(scheduleType === 'cron' ? { cron } : { every }),
          ...(deliver && channel ? { announce: true, channel, to: to.trim() || undefined } : {}),
        })}>Create Job</button>
      </div>
    </div>
  )
}
