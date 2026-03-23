'use client'

import { useCallback, useEffect, useState } from 'react'

type Finding = { title: string; severity: string; detail: string; remediation?: string }
type CheckDetail = Record<string, unknown> & { findings?: Finding[]; lastError?: string | null }
type Check = { name: string; status: 'pass' | 'warn' | 'fail'; message: string; detail?: CheckDetail }
type ContainerStats = { CPUPerc: string; MemPerc: string; MemUsage: string; NetIO: string; BlockIO: string; PIDs: string }

const STATUS_ICON: Record<string, string> = { pass: '✓', warn: '⚠', fail: '✗' }
const STATUS_CLASS: Record<string, string> = { pass: 'doc-check--pass', warn: 'doc-check--warn', fail: 'doc-check--fail' }

function Gauge({ label, value, unit }: { label: string; value: number; unit: string }) {
  const color = value > 90 ? '#e05050' : value > 70 ? '#f0c040' : '#40d680'
  return (
    <div className="doc-gauge">
      <svg viewBox="0 0 100 50" className="doc-gauge__svg">
        <path d="M10 45 A35 35 0 0 1 90 45" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" strokeLinecap="round" />
        <path d="M10 45 A35 35 0 0 1 90 45" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${value * 1.1} 110`} />
      </svg>
      <div className="doc-gauge__value">{value.toFixed(1)}{unit}</div>
      <div className="doc-gauge__label">{label}</div>
    </div>
  )
}

function CheckRow({ check, apiBaseUrl, onRefresh }: { check: Check; apiBaseUrl: string; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)

  const isChannel = check.name.includes('Channel')
  const isDisconnected = isChannel && check.status !== 'pass'
  const channelId = isChannel ? check.name.replace(' Channel', '').toLowerCase() : null

  const handleReconnect = async () => {
    if (!channelId) return
    setReconnecting(true)
    try {
      await fetch(`${apiBaseUrl}/api/v1/diagnostics/reconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: channelId }),
      })
      setTimeout(onRefresh, 3000) // refresh after 3s to let reconnect settle
    } catch { /* ignore */ }
    finally { setReconnecting(false) }
  }

  const detail = check.detail || {}
  const findings = detail.findings as Finding[] | undefined
  const hasExpandable = findings?.length || detail.lastError || detail.url || detail.latencyMs

  return (
    <div className={`doc-check ${STATUS_CLASS[check.status]}`}>
      <span className="doc-check__icon">{STATUS_ICON[check.status]}</span>
      <div className="doc-check__info" style={{ flex: 1 }}>
        <div className="doc-check__header">
          <strong>{check.name}</strong>
          <div className="doc-check__actions">
            {isDisconnected && (
              <button
                className="action-btn action-btn--small action-btn--warn"
                onClick={handleReconnect}
                disabled={reconnecting}
              >
                {reconnecting ? 'Reconnecting…' : '↻ Reconnect'}
              </button>
            )}
            {hasExpandable && (
              <button className="action-btn action-btn--small action-btn--ghost" onClick={() => setExpanded(!expanded)}>
                {expanded ? '▾ Less' : '▸ Details'}
              </button>
            )}
          </div>
        </div>
        <p>{check.message}</p>

        {expanded && (
          <div className="doc-check__detail">
            {detail.lastError && (
              <div className="doc-detail-row doc-detail-row--error">
                <strong>Last Error:</strong> {String(detail.lastError)}
              </div>
            )}
            {detail.url && (
              <div className="doc-detail-row">
                <strong>URL:</strong> {String(detail.url)}
                {detail.latencyMs && <span> · {String(detail.latencyMs)}ms</span>}
              </div>
            )}
            {detail.connected !== undefined && (
              <div className="doc-detail-row">
                <strong>Connected:</strong> {detail.connected ? '✓ Yes' : '✗ No'}
                {' · '}
                <strong>Linked:</strong> {detail.linked ? '✓ Yes' : '✗ No'}
                {' · '}
                <strong>Running:</strong> {detail.running ? '✓ Yes' : '✗ No'}
              </div>
            )}
            {detail.reconnectAttempts != null && Number(detail.reconnectAttempts) > 0 && (
              <div className="doc-detail-row">
                <strong>Reconnect Attempts:</strong> {String(detail.reconnectAttempts)}
              </div>
            )}
            {detail.self && typeof detail.self === 'object' && (detail.self as Record<string,unknown>).e164 && (
              <div className="doc-detail-row">
                <strong>Phone:</strong> {String((detail.self as Record<string,unknown>).e164)}
              </div>
            )}
            {findings && findings.length > 0 && (
              <div className="doc-findings">
                {findings.map((f, i) => (
                  <div key={i} className={`doc-finding doc-finding--${f.severity}`}>
                    <div className="doc-finding__header">
                      <span className={`doc-finding__sev doc-finding__sev--${f.severity}`}>
                        {f.severity.toUpperCase()}
                      </span>
                      <strong>{f.title}</strong>
                    </div>
                    <p className="doc-finding__detail">{f.detail}</p>
                    {f.remediation && (
                      <p className="doc-finding__fix">💡 {f.remediation}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function DoctorPage({ apiBaseUrl }: { apiBaseUrl: string }) {
  const [checks, setChecks] = useState<Check[]>([])
  const [container, setContainer] = useState<ContainerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch(`${apiBaseUrl}/api/v1/diagnostics`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((r) => {
        if (r.data) {
          setChecks(r.data.checks || [])
          setContainer(r.data.container || null)
          setLastRefresh(new Date())
        } else {
          setError(r.error?.message || 'Failed')
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [apiBaseUrl])

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t) }, [load])

  const cpuPct = container ? parseFloat(container.CPUPerc) || 0 : 0
  const memPct = container ? parseFloat(container.MemPerc) || 0 : 0
  const passCount = checks.filter((c) => c.status === 'pass').length
  const warnCount = checks.filter((c) => c.status === 'warn').length
  const failCount = checks.filter((c) => c.status === 'fail').length

  if (loading && checks.length === 0) return <div className="page-loading">Running diagnostics...</div>
  if (error && checks.length === 0) return <div className="page-error">{error}</div>

  return (
    <div className="doctor-page">
      <div className="doc-header">
        <div>
          <h2>Health Diagnostics</h2>
          {lastRefresh && (
            <span className="doc-header__time">Last check: {lastRefresh.toLocaleTimeString()}</span>
          )}
        </div>
        <button className="action-btn" onClick={load} disabled={loading}>
          {loading ? 'Checking…' : 'Refresh'}
        </button>
      </div>

      {/* Overall status banner */}
      <div className={`doc-banner ${failCount > 0 ? 'doc-banner--fail' : warnCount > 0 ? 'doc-banner--warn' : 'doc-banner--pass'}`}>
        <span className="doc-banner__icon">
          {failCount > 0 ? '✗' : warnCount > 0 ? '⚠' : '✓'}
        </span>
        <span>
          {failCount > 0
            ? `${failCount} critical issue${failCount > 1 ? 's' : ''} detected`
            : warnCount > 0
              ? `System operational with ${warnCount} warning${warnCount > 1 ? 's' : ''}`
              : 'All systems healthy'}
        </span>
      </div>

      <div className="doc-summary">
        <span className="doc-summary__item doc-summary__item--pass">{passCount} passed</span>
        {warnCount > 0 && <span className="doc-summary__item doc-summary__item--warn">{warnCount} warnings</span>}
        {failCount > 0 && <span className="doc-summary__item doc-summary__item--fail">{failCount} failed</span>}
      </div>

      {/* Gauges */}
      {container && (
        <div className="doc-gauges">
          <Gauge label="CPU" value={cpuPct} unit="%" />
          <Gauge label="Memory" value={memPct} unit="%" />
        </div>
      )}

      {/* Container stats */}
      {container && (
        <div className="doc-stats">
          <div className="doc-stat"><span>Memory</span><strong>{container.MemUsage}</strong></div>
          <div className="doc-stat"><span>Network I/O</span><strong>{container.NetIO}</strong></div>
          <div className="doc-stat"><span>Block I/O</span><strong>{container.BlockIO}</strong></div>
          <div className="doc-stat"><span>Processes</span><strong>{container.PIDs}</strong></div>
        </div>
      )}

      {/* Checks */}
      <div className="doc-checks">
        <h3>System Checks</h3>
        {checks.map((check, i) => (
          <CheckRow key={i} check={check} apiBaseUrl={apiBaseUrl} onRefresh={load} />
        ))}
      </div>
    </div>
  )
}
