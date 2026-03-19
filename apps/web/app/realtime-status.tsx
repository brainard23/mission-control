'use client'

import { useEffect, useMemo, useState } from 'react'
import type { HealthUpdatedPayload, MissionControlWsEvent } from '@mission-control/contracts'

type RealtimeState = {
  connected: boolean
  statusLabel: string
  lastSyncAt?: string | null
}

function formatUtc(value?: string | null) {
  if (!value) return 'Waiting for sync'
  return value.replace('T', ' ').replace('Z', ' UTC')
}

export function RealtimeStatus({ websocketUrl, initialReady, initialLastSyncAt }: { websocketUrl: string; initialReady: boolean; initialLastSyncAt?: string | null }) {
  const [state, setState] = useState<RealtimeState>({
    connected: false,
    statusLabel: initialReady ? 'Connecting' : 'Shell',
    lastSyncAt: initialLastSyncAt,
  })

  const toneClass = useMemo(() => {
    if (state.connected) return 'realtime-pill realtime-pill--live'
    if (state.statusLabel === 'Connecting') return 'realtime-pill realtime-pill--pending'
    return 'realtime-pill realtime-pill--idle'
  }, [state.connected, state.statusLabel])

  useEffect(() => {
    let closedByEffect = false
    const socket = new WebSocket(websocketUrl)

    socket.addEventListener('open', () => {
      setState((current) => ({
        ...current,
        connected: true,
        statusLabel: 'Live',
      }))
    })

    socket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data) as MissionControlWsEvent

        if (message.type === 'connection.hello') {
          const payload = message.payload as { serverTime?: string }
          setState((current) => ({
            ...current,
            lastSyncAt: payload.serverTime ?? message.ts,
          }))
        }

        if (message.type === 'health.updated') {
          const payload = message.payload as HealthUpdatedPayload
          setState({
            connected: true,
            statusLabel: 'Live',
            lastSyncAt: payload.lastSyncAt ?? message.ts,
          })
        }
      } catch {
        // ignore malformed payloads for now
      }
    })

    socket.addEventListener('close', () => {
      if (!closedByEffect) {
        setState((current) => ({
          ...current,
          connected: false,
          statusLabel: 'Reconnect needed',
        }))
      }
    })

    socket.addEventListener('error', () => {
      setState((current) => ({
        ...current,
        connected: false,
        statusLabel: 'Unavailable',
      }))
    })

    return () => {
      closedByEffect = true
      socket.close()
    }
  }, [websocketUrl])

  return (
    <div className="realtime-status panel panel--soft">
      <div className="section-head compact">
        <div>
          <span className="eyebrow">Realtime channel</span>
          <h2>Websocket</h2>
        </div>
        <span className={toneClass}>{state.statusLabel}</span>
      </div>
      <p className="muted">{formatUtc(state.lastSyncAt)}</p>
    </div>
  )
}
