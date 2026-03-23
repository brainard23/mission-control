'use client'

import { useCallback, useEffect, useState } from 'react'

type ChannelData = {
  channels: {
    chat: Record<string, string[]>
    auth: { id: string; provider: string; type: string }[]
    usage?: { providers: { provider: string; displayName: string; plan: string; windows: { label: string; usedPercent: number; resetAt: number }[] }[] }
  }
  status: Record<string, unknown> | null
}

type LoginResult = { output: string; status: string; message: string }

const CHANNEL_INFO: Record<string, { icon: string; label: string; loginSupported: boolean }> = {
  whatsapp: { icon: '📱', label: 'WhatsApp', loginSupported: true },
  telegram: { icon: '✈️', label: 'Telegram', loginSupported: false },
  discord: { icon: '🎮', label: 'Discord', loginSupported: false },
  slack: { icon: '💬', label: 'Slack', loginSupported: false },
  signal: { icon: '🔒', label: 'Signal', loginSupported: true },
  imessage: { icon: '💬', label: 'iMessage', loginSupported: false },
}

function UsageBar({ pct, label, resetAt }: { pct: number; label: string; resetAt: number }) {
  const color = pct > 80 ? '#e05050' : pct > 50 ? '#f0c040' : '#40d680'
  return (
    <div className="ch-usage-bar">
      <div className="ch-usage-bar__header">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="ch-usage-bar__track">
        <div className="ch-usage-bar__fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="ch-usage-bar__reset">Resets {new Date(resetAt).toLocaleDateString()}</span>
    </div>
  )
}

export function ChannelsPage({ apiBaseUrl }: { apiBaseUrl: string }) {
  const [data, setData] = useState<ChannelData | null>(null)
  const [logs, setLogs] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loginResult, setLoginResult] = useState<LoginResult | null>(null)
  const [loggingIn, setLoggingIn] = useState<string | null>(null)
  const [showLogs, setShowLogs] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    fetch(`${apiBaseUrl}/api/v1/channels`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((r) => { if (r.data) setData(r.data); else setError(r.error?.message || 'Failed') })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [apiBaseUrl])

  useEffect(() => { load() }, [load])

  const handleLogin = async (channel: string, account?: string) => {
    setLoggingIn(channel)
    setLoginResult(null)
    try {
      const r = await fetch(`${apiBaseUrl}/api/v1/channels/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, account }),
      })
      const d = await r.json()
      setLoginResult(d.data || { output: '', status: 'error', message: d.error?.message || 'Failed' })
    } catch (e: unknown) {
      setLoginResult({ output: '', status: 'error', message: e instanceof Error ? e.message : 'Failed' })
    }
    setLoggingIn(null)
    load() // refresh status
  }

  const handleLogout = async (channel: string, account?: string) => {
    try {
      await fetch(`${apiBaseUrl}/api/v1/channels/logout`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, account }),
      })
    } catch {}
    load()
  }

  const handleShowLogs = async () => {
    if (showLogs) { setShowLogs(false); return }
    const r = await fetch(`${apiBaseUrl}/api/v1/channels/logs`).then((r) => r.json())
    setLogs(r.data?.logs || 'No logs')
    setShowLogs(true)
  }

  if (loading) return <div className="page-loading">Loading channels...</div>
  if (error) return <div className="page-error">{error}</div>
  if (!data) return null

  const chatChannels = Object.entries(data.channels.chat || {})

  return (
    <div className="channels-page">
      <div className="ch-header">
        <h2>Channels</h2>
        <div className="ch-header__actions">
          <button className="action-btn" onClick={handleShowLogs}>{showLogs ? 'Hide Logs' : 'View Logs'}</button>
          <button className="action-btn" onClick={load}>Refresh</button>
        </div>
      </div>

      {/* Connected channels */}
      <section>
        <h3>Connected Channels</h3>
        {chatChannels.length === 0 && <p className="muted-sm">No channels configured</p>}
        <div className="ch-grid">
          {chatChannels.map(([channel, accounts]) => {
            const info = CHANNEL_INFO[channel] || { icon: '📡', label: channel, loginSupported: false }
            return accounts.map((account) => (
              <div key={`${channel}-${account}`} className="ch-card">
                <div className="ch-card__header">
                  <span className="ch-card__icon">{info.icon}</span>
                  <div>
                    <h4>{info.label}</h4>
                    <span className="ch-card__account">Account: {account}</span>
                  </div>
                  <span className="ch-card__status ch-card__status--linked">Linked</span>
                </div>
                <div className="ch-card__actions">
                  {info.loginSupported && (
                    <button className="action-btn action-btn--primary" onClick={() => handleLogin(channel, account)} disabled={loggingIn === channel}>
                      {loggingIn === channel ? 'Connecting...' : 'Reconnect'}
                    </button>
                  )}
                  <button className="action-btn action-btn--warn" onClick={() => handleLogout(channel, account)}>Logout</button>
                </div>
              </div>
            ))
          })}
        </div>
      </section>

      {/* Available channels to add */}
      <section>
        <h3>Available Channels</h3>
        <div className="ch-grid">
          {Object.entries(CHANNEL_INFO).filter(([ch]) => !data.channels.chat?.[ch]).map(([channel, info]) => (
            <div key={channel} className="ch-card ch-card--available">
              <div className="ch-card__header">
                <span className="ch-card__icon">{info.icon}</span>
                <div><h4>{info.label}</h4><span className="ch-card__account">Not configured</span></div>
              </div>
              {info.loginSupported && (
                <div className="ch-card__actions">
                  <button className="action-btn action-btn--primary" onClick={() => handleLogin(channel)} disabled={loggingIn === channel}>
                    {loggingIn === channel ? 'Connecting...' : 'Connect'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Login result */}
      {loginResult && (
        <section className="ch-login-result">
          <h3>Login Output</h3>
          <div className={`ch-login-output ch-login-output--${loginResult.status}`}>
            <p className="ch-login-output__msg">{loginResult.message}</p>
            {loginResult.output && <pre className="ch-login-output__raw">{loginResult.output}</pre>}
          </div>
          <button className="action-btn" onClick={() => setLoginResult(null)}>Dismiss</button>
        </section>
      )}

      {/* API usage */}
      {data.channels.usage?.providers && data.channels.usage.providers.length > 0 && (
        <section>
          <h3>API Usage</h3>
          {data.channels.usage.providers.map((p) => (
            <div key={p.provider} className="ch-provider">
              <div className="ch-provider__header">
                <strong>{p.displayName}</strong>
                <span className="ch-provider__plan">{p.plan}</span>
              </div>
              <div className="ch-provider__bars">
                {p.windows.map((w) => <UsageBar key={w.label} pct={w.usedPercent} label={w.label} resetAt={w.resetAt} />)}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Auth profiles */}
      {data.channels.auth && data.channels.auth.length > 0 && (
        <section>
          <h3>Auth Profiles</h3>
          <div className="ch-auth-list">
            {data.channels.auth.map((a) => (
              <div key={a.id} className="ch-auth">
                <strong>{a.id}</strong>
                <span>{a.provider} ({a.type})</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Logs */}
      {showLogs && (
        <section>
          <h3>Channel Logs</h3>
          <pre className="ch-logs">{logs}</pre>
        </section>
      )}
    </div>
  )
}
