'use client'

import { useEffect, useMemo, useState } from 'react'
import type {
  AgentCard,
  Event,
  HealthUpdatedPayload,
  MissionControlWsEvent,
  OverviewResponse,
  Room,
  Session,
  Task,
} from '@mission-control/contracts'
import { RealtimeStatus } from './realtime-status'

type DashboardProps = {
  overview: OverviewResponse
  agentCards: AgentCard[]
  tasks: Task[]
  events: Event[]
  rooms: Room[]
  websocketUrl: string
}

type DashboardState = Omit<DashboardProps, 'websocketUrl'> & {
  sessions: Session[]
}

const statusTone: Record<string, string> = {
  idle: 'var(--status-idle)',
  working: 'var(--status-working)',
  waiting: 'var(--status-waiting)',
  blocked: 'var(--status-blocked)',
  failed: 'var(--status-failed)',
  offline: 'var(--status-offline)',
}

const priorityTone: Record<string, string> = {
  low: 'var(--priority-low)',
  normal: 'var(--priority-normal)',
  high: 'var(--priority-high)',
  urgent: 'var(--priority-urgent)',
}

function formatUtc(value?: string | null) {
  if (!value) return 'No timestamp'
  return value.replace('T', ' ').replace('Z', ' UTC')
}

function upsertById<T extends { id: string }>(items: T[], nextItem: T) {
  const existingIndex = items.findIndex((item) => item.id === nextItem.id)
  if (existingIndex === -1) return [nextItem, ...items]
  const clone = [...items]
  clone[existingIndex] = nextItem
  return clone
}

function upsertAgentCard(items: AgentCard[], nextItem: AgentCard) {
  const existingIndex = items.findIndex((item) => item.agent.id === nextItem.agent.id)
  if (existingIndex === -1) return [nextItem, ...items]
  const clone = [...items]
  clone[existingIndex] = nextItem
  return clone
}

function StatCard({ label, value, detail }: { label: string; value: number | string; detail?: string }) {
  return (
    <article className="panel stat-card">
      <span className="eyebrow">{label}</span>
      <strong>{value}</strong>
      {detail ? <p>{detail}</p> : null}
    </article>
  )
}

function AgentDesk({ card }: { card: AgentCard }) {
  const accent = statusTone[card.agent.status] ?? 'var(--status-offline)'

  return (
    <article className="agent-card panel" style={{ ['--accent' as string]: accent }}>
      <div className="agent-card__header">
        <div>
          <h3>{card.agent.name}</h3>
          <p>{card.agent.role ?? card.agent.type}</p>
        </div>
        <span className="badge">{card.agent.status}</span>
      </div>

      <div className="agent-card__task">
        <span className="eyebrow">Current task</span>
        <strong>{card.currentTask?.title ?? 'No active task'}</strong>
        <p>{card.currentSession?.summary ?? 'Standing by for the next instruction.'}</p>
      </div>

      <dl className="agent-card__meta">
        <div>
          <dt>Runtime</dt>
          <dd>{card.currentSession?.runtime ?? 'system'}</dd>
        </div>
        <div>
          <dt>Model</dt>
          <dd>{card.currentSession?.model ?? 'default'}</dd>
        </div>
        <div>
          <dt>Last activity</dt>
          <dd>{formatUtc(card.agent.lastActivityAt)}</dd>
        </div>
      </dl>
    </article>
  )
}

function RoomSection({ room, cards }: { room: Room; cards: AgentCard[] }) {
  return (
    <section className="room-section panel">
      <div className="section-head">
        <div>
          <span className="eyebrow">Office zone</span>
          <h2>{room.name}</h2>
        </div>
        <span className="badge badge--ghost">{room.kind}</span>
      </div>
      <div className="agent-grid">
        {cards.length ? cards.map((card) => <AgentDesk key={card.agent.id} card={card} />) : <p className="muted">No agents placed in this room yet.</p>}
      </div>
    </section>
  )
}

function TaskColumn({ title, items }: { title: string; items: Task[] }) {
  return (
    <section className="task-column panel panel--soft">
      <div className="section-head compact">
        <h3>{title}</h3>
        <span className="badge badge--ghost">{items.length}</span>
      </div>
      <div className="stack">
        {items.length ? (
          items.map((task) => (
            <article key={task.id} className="task-item">
              <div>
                <strong>{task.title}</strong>
                <p>{task.description ?? 'No description yet.'}</p>
              </div>
              <div className="task-item__meta">
                <span className="priority-dot" style={{ ['--priority' as string]: priorityTone[task.priority] ?? 'var(--priority-normal)' }} />
                <span>{task.priority}</span>
                <span>{task.status}</span>
              </div>
            </article>
          ))
        ) : (
          <p className="muted">Nothing here.</p>
        )}
      </div>
    </section>
  )
}

function EventFeed({ items }: { items: Event[] }) {
  return (
    <div className="stack">
      {items.map((event) => (
        <article key={event.id} className="event-row" data-severity={event.severity}>
          <span className="eyebrow event-kind">{event.kind}</span>
          <p>{event.message}</p>
          <time>{formatUtc(event.ts)}</time>
        </article>
      ))}
    </div>
  )
}

function SessionList({ cards }: { cards: AgentCard[] }) {
  const activeCards = cards.filter((card) => card.currentSession)

  return (
    <div className="stack">
      {activeCards.length ? (
        activeCards.map((card) => (
          <article key={card.currentSession?.id} className="session-item">
            <div>
              <strong>{card.currentSession?.label}</strong>
              <p>{card.currentSession?.summary}</p>
            </div>
            <div className="session-item__meta">
              <span>{card.currentSession?.runtime}</span>
              <span>{card.currentSession?.model ?? 'default'}</span>
              <span>{card.currentSession?.state}</span>
            </div>
          </article>
        ))
      ) : (
        <p className="muted">No active sessions.</p>
      )}
    </div>
  )
}

export function DashboardLive(props: DashboardProps) {
  const [state, setState] = useState<DashboardState>({
    overview: props.overview,
    agentCards: props.agentCards,
    tasks: props.tasks,
    events: props.events,
    rooms: props.rooms,
    sessions: props.agentCards.map((card) => card.currentSession).filter(Boolean) as Session[],
  })
  const [lastMessageAt, setLastMessageAt] = useState<string | null>(props.overview.health.lastSyncAt ?? null)

  useEffect(() => {
    let closedByEffect = false
    const socket = new WebSocket(props.websocketUrl)

    socket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data) as MissionControlWsEvent
        setLastMessageAt(message.ts)

        if (message.type === 'overview.snapshot') {
          const payload = message.payload as {
            overview: OverviewResponse
            agents: AgentCard[]
            tasks: Task[]
            sessions: Session[]
            events: Event[]
            rooms: { rooms: Room[] }
          }

          setState({
            overview: payload.overview,
            agentCards: payload.agents,
            tasks: payload.tasks,
            events: payload.events,
            rooms: payload.rooms.rooms,
            sessions: payload.sessions,
          })
          return
        }

        if (message.type === 'agent.updated') {
          const payload = message.payload as AgentCard
          setState((current) => ({ ...current, agentCards: upsertAgentCard(current.agentCards, payload) }))
          return
        }

        if (message.type === 'task.updated') {
          const payload = message.payload as { task: Task }
          setState((current) => ({ ...current, tasks: upsertById(current.tasks, payload.task) }))
          return
        }

        if (message.type === 'session.updated') {
          const payload = message.payload as { session: Session }
          setState((current) => ({ ...current, sessions: upsertById(current.sessions, payload.session) }))
          return
        }

        if (message.type === 'event.created') {
          const payload = message.payload as { event: Event }
          setState((current) => ({ ...current, events: upsertById(current.events, payload.event).slice(0, 12) }))
          return
        }

        if (message.type === 'health.updated') {
          const payload = message.payload as HealthUpdatedPayload
          setState((current) => ({
            ...current,
            overview: {
              ...current.overview,
              health: {
                ...current.overview.health,
                backendStatus: payload.backendStatus,
                gatewayStatus: payload.gatewayStatus,
                nodesOnline: payload.nodesOnline,
                websocketReady: true,
                lastSyncAt: payload.lastSyncAt ?? message.ts,
              },
            },
          }))
        }
      } catch {
        // ignore malformed frames for now
      }
    })

    socket.addEventListener('close', () => {
      if (!closedByEffect) {
        setState((current) => ({
          ...current,
          overview: {
            ...current.overview,
            health: { ...current.overview.health, websocketReady: false },
          },
        }))
      }
    })

    return () => {
      closedByEffect = true
      socket.close()
    }
  }, [props.websocketUrl])

  const queued = useMemo(() => state.tasks.filter((task) => task.status === 'queued'), [state.tasks])
  const inProgress = useMemo(() => state.tasks.filter((task) => task.status === 'in_progress'), [state.tasks])
  const blocked = useMemo(() => state.tasks.filter((task) => task.status === 'blocked' || task.status === 'waiting'), [state.tasks])

  return (
    <main className="page-shell">
      <header className="topbar panel">
        <div>
          <span className="eyebrow">Operational cockpit</span>
          <h1>OpenClaw Mission Control</h1>
          <p>Overview, Office, Sessions, Tasks, Events, and infra health in one live room.</p>
        </div>
        <nav className="topbar__nav" aria-label="Primary navigation">
          {['Overview', 'Office', 'Sessions', 'Tasks', 'Events', 'Infra'].map((item) => (
            <span key={item} className="pill">
              {item}
            </span>
          ))}
        </nav>
      </header>

      <section className="stats-grid">
        <StatCard label="Active agents" value={state.overview.stats.activeAgents} detail="Agents currently visible in the office." />
        <StatCard label="Active sessions" value={state.overview.stats.activeSessions} detail="Running contexts across main, subagent, and ACP flows." />
        <StatCard label="Queued tasks" value={state.overview.stats.queuedTasks} detail="Work ready for assignment." />
        <StatCard label="In progress" value={state.overview.stats.tasksInProgress} detail="Tasks being actively executed." />
        <StatCard label="Blocked" value={state.overview.stats.blockedTasks} detail="Needs intervention or missing context." />
        <StatCard label="Websocket" value={state.overview.health.websocketReady ? 'Ready' : 'Retrying'} detail={`Last sync ${formatUtc(state.overview.health.lastSyncAt || lastMessageAt)}`} />
      </section>

      <section className="hero-grid">
        <section className="panel overview-panel">
          <div className="section-head">
            <div>
              <span className="eyebrow">Mission status</span>
              <h2>Office View</h2>
            </div>
            <span className="badge badge--ghost">live layout</span>
          </div>
          <div className="room-stack">
            {state.rooms.map((room) => (
              <RoomSection key={room.id} room={room} cards={state.agentCards.filter((card) => card.room?.id === room.id || card.agent.roomId === room.id)} />
            ))}
          </div>
        </section>

        <aside className="sidebar-stack">
          <RealtimeStatus
            websocketUrl={props.websocketUrl}
            initialReady={state.overview.health.websocketReady}
            initialLastSyncAt={state.overview.health.lastSyncAt}
          />

          <section className="panel attention-panel">
            <div className="section-head compact">
              <h2>Attention needed</h2>
              <span className="badge">alerts</span>
            </div>
            <div className="stack">
              {state.overview.alerts.length ? (
                state.overview.alerts.map((alert) => (
                  <article key={alert.id} className="alert-item">
                    <strong>{alert.kind}</strong>
                    <p>{alert.message}</p>
                  </article>
                ))
              ) : (
                <p className="muted">No active alerts.</p>
              )}
            </div>
          </section>

          <section className="panel health-panel">
            <div className="section-head compact">
              <h2>Infra health</h2>
              <span className="badge badge--ghost">ops</span>
            </div>
            <dl className="health-grid">
              <div>
                <dt>Backend</dt>
                <dd>{state.overview.health.backendStatus}</dd>
              </div>
              <div>
                <dt>Gateway</dt>
                <dd>{state.overview.health.gatewayStatus}</dd>
              </div>
              <div>
                <dt>Nodes online</dt>
                <dd>{state.overview.health.nodesOnline}</dd>
              </div>
              <div>
                <dt>Realtime</dt>
                <dd>{state.overview.health.websocketReady ? 'ready' : 'reconnecting'}</dd>
              </div>
            </dl>
          </section>

          <section className="panel events-panel">
            <div className="section-head compact">
              <h2>Recent events</h2>
              <span className="badge badge--ghost">timeline</span>
            </div>
            <EventFeed items={state.events} />
          </section>
        </aside>
      </section>

      <section className="bottom-grid">
        <section className="panel">
          <div className="section-head compact">
            <div>
              <span className="eyebrow">Active contexts</span>
              <h2>Sessions</h2>
            </div>
            <span className="badge badge--ghost">runtime view</span>
          </div>
          <SessionList cards={state.agentCards} />
        </section>

        <section className="panel">
          <div className="section-head compact">
            <div>
              <span className="eyebrow">Work in motion</span>
              <h2>Task board</h2>
            </div>
            <span className="badge badge--ghost">kanban</span>
          </div>
          <div className="task-board">
            <TaskColumn title="Queued" items={queued} />
            <TaskColumn title="In progress" items={inProgress} />
            <TaskColumn title="Blocked / Waiting" items={blocked} />
          </div>
        </section>
      </section>
    </main>
  )
}
