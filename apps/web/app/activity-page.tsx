'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Event } from '@mission-control/contracts'

function formatTimeAgo(value?: string | null) {
  if (!value) return ''
  const diff = Date.now() - new Date(value).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  return hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs / 24)}d ago`
}

const SEVERITY_CLASS: Record<string, string> = { info: 'act-item--info', warning: 'act-item--warn', error: 'act-item--error' }
const SEVERITY_DOT: Record<string, string> = { info: '#5c6cfc', warning: '#f0c040', error: '#e05050' }

export function ActivityPage({ apiBaseUrl, events: initialEvents }: { apiBaseUrl: string; events: Event[] }) {
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [kindFilter, setKindFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [searchText, setSearchText] = useState('')

  // Refresh from props (WebSocket updates)
  useEffect(() => { setEvents(initialEvents) }, [initialEvents])

  const kinds = [...new Set(events.map((e) => e.kind))].sort()
  const filtered = events.filter((e) => {
    if (kindFilter && e.kind !== kindFilter) return false
    if (severityFilter && e.severity !== severityFilter) return false
    if (searchText && !e.message.toLowerCase().includes(searchText.toLowerCase())) return false
    return true
  })

  return (
    <div className="activity-page">
      <h2>Activity Timeline</h2>

      <div className="act-filters">
        <input className="act-search" value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search events..." />
        <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)}>
          <option value="">All kinds</option>
          {kinds.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
          <option value="">All severity</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
        </select>
        <span className="act-count">{filtered.length} events</span>
      </div>

      <div className="act-timeline">
        {filtered.length === 0 && <p className="muted-sm">No events match your filters.</p>}
        {filtered.map((event) => (
          <div key={event.id} className={`act-item ${SEVERITY_CLASS[event.severity] || ''}`}>
            <div className="act-item__line">
              <span className="act-item__dot" style={{ background: SEVERITY_DOT[event.severity] || '#888' }} />
              <span className="act-item__connector" />
            </div>
            <div className="act-item__content">
              <div className="act-item__header">
                <span className="act-item__kind">{event.kind}</span>
                <time>{formatTimeAgo(event.ts)}</time>
              </div>
              <p>{event.message}</p>
              {(event.agentId || event.taskId) && (
                <div className="act-item__refs">
                  {event.agentId && <span>Agent: {event.agentId}</span>}
                  {event.taskId && <span>Task: {event.taskId}</span>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
