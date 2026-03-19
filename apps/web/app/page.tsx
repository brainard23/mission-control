import type { AgentCard, Event, OverviewResponse, Room, Task } from '@mission-control/contracts'
import { RealtimeStatus } from './realtime-status'
import { getDashboardData, getWebsocketUrl } from '../lib/api'

type DashboardProps = {
  overview: OverviewResponse
  agentCards: AgentCard[]
  tasks: Task[]
  events: Event[]
  rooms: Room[]
  websocketUrl: string
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
            </div>
          </article>
        ))
      ) : (
        <p className="muted">No active sessions.</p>
      )}
    </div>
  )
}

function Dashboard(props: DashboardProps) {
  const queued = props.tasks.filter((task) => task.status === 'queued')
  const inProgress = props.tasks.filter((task) => task.status === 'in_progress')
  const blocked = props.tasks.filter((task) => task.status === 'blocked')

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
        <StatCard label="Active agents" value={props.overview.stats.activeAgents} detail="Agents currently visible in the office." />
        <StatCard label="Active sessions" value={props.overview.stats.activeSessions} detail="Running contexts across main, subagent, and ACP flows." />
        <StatCard label="Queued tasks" value={props.overview.stats.queuedTasks} detail="Work ready for assignment." />
        <StatCard label="In progress" value={props.overview.stats.tasksInProgress} detail="Tasks being actively executed." />
        <StatCard label="Blocked" value={props.overview.stats.blockedTasks} detail="Needs intervention or missing context." />
        <StatCard label="Websocket" value={props.overview.health.websocketReady ? 'Ready' : 'Shell'} detail={`Last sync ${formatUtc(props.overview.health.lastSyncAt)}`} />
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
            {props.rooms.map((room) => (
              <RoomSection key={room.id} room={room} cards={props.agentCards.filter((card) => card.room?.id === room.id || card.agent.roomId === room.id)} />
            ))}
          </div>
        </section>

        <aside className="sidebar-stack">
          <RealtimeStatus
            websocketUrl={props.websocketUrl}
            initialReady={props.overview.health.websocketReady}
            initialLastSyncAt={props.overview.health.lastSyncAt}
          />

          <section className="panel attention-panel">
            <div className="section-head compact">
              <h2>Attention needed</h2>
              <span className="badge">alerts</span>
            </div>
            <div className="stack">
              {props.overview.alerts.length ? (
                props.overview.alerts.map((alert) => (
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
                <dd>{props.overview.health.backendStatus}</dd>
              </div>
              <div>
                <dt>Gateway</dt>
                <dd>{props.overview.health.gatewayStatus}</dd>
              </div>
              <div>
                <dt>Nodes online</dt>
                <dd>{props.overview.health.nodesOnline}</dd>
              </div>
              <div>
                <dt>Realtime</dt>
                <dd>{props.overview.health.websocketReady ? 'ready' : 'mock shell'}</dd>
              </div>
            </dl>
          </section>

          <section className="panel events-panel">
            <div className="section-head compact">
              <h2>Recent events</h2>
              <span className="badge badge--ghost">timeline</span>
            </div>
            <EventFeed items={props.events} />
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
          <SessionList cards={props.agentCards} />
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
            <TaskColumn title="Blocked" items={blocked} />
          </div>
        </section>
      </section>
    </main>
  )
}

export default async function HomePage() {
  const data = await getDashboardData()

  return (
    <Dashboard
      overview={data.overview}
      agentCards={data.agentCards}
      tasks={data.tasks}
      events={data.events}
      rooms={data.rooms}
      websocketUrl={getWebsocketUrl(data.apiBaseUrl)}
    />
  )
}
