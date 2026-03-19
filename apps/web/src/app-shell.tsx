import type { AgentCard, Event, OverviewResponse, Room, Task } from '@mission-control/contracts'

type AppShellProps = {
  overview: OverviewResponse
  agentCards: AgentCard[]
  tasks: Task[]
  events: Event[]
  rooms: Room[]
}

const statusTone = {
  idle: '#667085',
  working: '#38bdf8',
  waiting: '#f59e0b',
  blocked: '#ef4444',
  failed: '#dc2626',
  offline: '#6b7280',
} as const

function statCard(label: string, value: number | string) {
  return `<div class="card stat"><span class="eyebrow">${label}</span><strong>${value}</strong></div>`
}

function agentCard(card: AgentCard) {
  const taskTitle = card.currentTask?.title || 'No active task'
  const status = card.agent.status
  const color = statusTone[status]
  return `
    <article class="card agent-card" style="--accent:${color}">
      <div class="agent-head">
        <div>
          <h3>${card.agent.name}</h3>
          <p>${card.agent.role || card.agent.type}</p>
        </div>
        <span class="badge">${status}</span>
      </div>
      <div class="task-title">${taskTitle}</div>
      <div class="meta-row">
        <span>${card.currentSession?.runtime || 'system'}</span>
        <span>${card.agent.lastActivityAt.replace('T', ' ').replace('Z', ' UTC')}</span>
      </div>
    </article>
  `
}

function taskColumn(title: string, items: Task[]) {
  return `
    <section class="card task-column">
      <h3>${title}</h3>
      <div class="stack">
        ${items.map((task) => `<div class="task-item"><strong>${task.title}</strong><span>${task.priority}</span></div>`).join('') || '<p class="muted">Nothing here.</p>'}
      </div>
    </section>
  `
}

function roomSection(room: Room, agentCards: AgentCard[]) {
  return `
    <section class="room-section">
      <div class="section-head">
        <h2>${room.name}</h2>
        <span class="badge ghost">${room.kind}</span>
      </div>
      <div class="agent-grid">
        ${agentCards.map(agentCard).join('')}
      </div>
    </section>
  `
}

function eventList(items: Event[]) {
  return items
    .map(
      (event) => `
        <div class="event-row">
          <span class="event-kind">${event.kind}</span>
          <p>${event.message}</p>
          <time>${event.ts.replace('T', ' ').replace('Z', ' UTC')}</time>
        </div>
      `,
    )
    .join('')
}

export function renderAppShell(props: AppShellProps) {
  const queued = props.tasks.filter((task) => task.status === 'queued')
  const inProgress = props.tasks.filter((task) => task.status === 'in_progress')
  const blocked = props.tasks.filter((task) => task.status === 'blocked')

  const officeMarkup = props.rooms
    .map((room) => roomSection(room, props.agentCards.filter((card) => card.room?.id === room.id)))
    .join('')

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Mission Control</title>
    <style>
      :root {
        --bg: oklch(0.17 0.02 260);
        --panel: oklch(0.23 0.02 260);
        --panel-2: oklch(0.27 0.02 260);
        --text: oklch(0.96 0.01 260);
        --muted: oklch(0.72 0.02 260);
        --border: oklch(0.34 0.02 260);
        --shadow: 0 12px 32px rgba(0,0,0,0.28);
        --radius: 18px;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Inter, system-ui, sans-serif;
        background:
          radial-gradient(circle at top, rgba(56,189,248,0.12), transparent 22%),
          linear-gradient(180deg, oklch(0.19 0.02 260), oklch(0.14 0.02 260));
        color: var(--text);
      }
      .page { max-width: 1440px; margin: 0 auto; padding: 24px; }
      .topbar {
        position: sticky; top: 0; z-index: 2;
        display: flex; justify-content: space-between; align-items: center;
        padding: 16px 20px; margin-bottom: 20px;
        backdrop-filter: blur(18px);
        background: rgba(15, 23, 42, 0.72);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 18px;
      }
      .topbar h1 { margin: 0; font-size: 1.4rem; }
      .topbar p, .muted { color: var(--muted); }
      .nav { display: flex; gap: 10px; flex-wrap: wrap; }
      .pill, .badge {
        display: inline-flex; align-items: center; justify-content: center;
        min-height: 32px; padding: 0 12px; border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.08);
        background: rgba(255,255,255,0.04);
        font-size: 0.85rem;
      }
      .badge.ghost { background: transparent; }
      .grid { display: grid; gap: 16px; }
      .stats { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
      .main-grid { grid-template-columns: 1.3fr 1fr; align-items: start; }
      .card {
        background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02));
        border: 1px solid rgba(255,255,255,0.08);
        box-shadow: var(--shadow);
        border-radius: var(--radius);
        padding: 18px;
      }
      .stat strong { display: block; margin-top: 10px; font-size: 1.8rem; }
      .eyebrow { color: var(--muted); font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.08em; }
      .section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
      .agent-grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
      .agent-card { border-left: 3px solid var(--accent); transition: transform 180ms ease, box-shadow 180ms ease; }
      .agent-card:hover { transform: translateY(-2px); }
      .agent-head { display: flex; justify-content: space-between; gap: 12px; align-items: start; }
      .agent-head h3, .section-head h2, .column-row h2 { margin: 0; }
      .agent-head p { margin: 6px 0 0; color: var(--muted); }
      .task-title { margin: 18px 0 10px; font-weight: 600; }
      .meta-row { display: flex; gap: 10px; color: var(--muted); font-size: 0.85rem; flex-wrap: wrap; }
      .two-col { display: grid; gap: 16px; grid-template-columns: 1fr 1fr; }
      .task-board { display: grid; gap: 16px; grid-template-columns: repeat(3, 1fr); }
      .task-column h3 { margin-top: 0; }
      .stack { display: flex; flex-direction: column; gap: 10px; }
      .task-item, .event-row {
        padding: 12px 14px;
        border-radius: 14px;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.06);
      }
      .task-item { display: flex; justify-content: space-between; gap: 12px; }
      .event-kind { color: #7dd3fc; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.08em; }
      .event-row p { margin: 8px 0; }
      .event-row time { color: var(--muted); font-size: 0.85rem; }
      .room-section + .room-section { margin-top: 18px; }
      @media (max-width: 980px) {
        .main-grid, .two-col, .task-board { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <div class="page">
      <header class="topbar">
        <div>
          <h1>OpenClaw Mission Control</h1>
          <p>Overview, Office, Sessions, Tasks, Events, Infra</p>
        </div>
        <nav class="nav" aria-label="Primary navigation">
          <span class="pill">Overview</span>
          <span class="pill">Office</span>
          <span class="pill">Sessions</span>
          <span class="pill">Tasks</span>
          <span class="pill">Events</span>
          <span class="pill">Infra</span>
        </nav>
      </header>

      <section class="grid stats">
        ${statCard('Active agents', props.overview.stats.activeAgents)}
        ${statCard('Active sessions', props.overview.stats.activeSessions)}
        ${statCard('Queued tasks', props.overview.stats.queuedTasks)}
        ${statCard('In progress', props.overview.stats.tasksInProgress)}
        ${statCard('Blocked', props.overview.stats.blockedTasks)}
        ${statCard('Failed', props.overview.stats.failedTasks)}
      </section>

      <section class="grid main-grid" style="margin-top: 16px;">
        <div class="card">
          <div class="section-head"><h2>Office View</h2><span class="badge ghost">live layout</span></div>
          ${officeMarkup}
        </div>
        <aside class="grid">
          <section class="card">
            <div class="section-head"><h2>Attention Needed</h2><span class="badge">alerts</span></div>
            <div class="stack">
              ${props.overview.alerts.map((alert) => `<div class="task-item"><strong>${alert.kind}</strong><span>${alert.message}</span></div>`).join('') || '<p class="muted">No active alerts.</p>'}
            </div>
          </section>
          <section class="card">
            <div class="section-head"><h2>Recent Events</h2><span class="badge ghost">timeline</span></div>
            <div class="stack">${eventList(props.events)}</div>
          </section>
        </aside>
      </section>

      <section class="grid two-col" style="margin-top: 16px;">
        <section class="card">
          <div class="section-head"><h2>Sessions</h2><span class="badge ghost">active contexts</span></div>
          <div class="stack">
            ${props.agentCards.filter((card) => card.currentSession).map((card) => `
              <div class="task-item">
                <strong>${card.currentSession?.label}</strong>
                <span>${card.currentSession?.runtime} · ${card.currentSession?.model || 'default'}</span>
              </div>
            `).join('')}
          </div>
        </section>
        <section class="card">
          <div class="section-head"><h2>Task Board</h2><span class="badge ghost">kanban</span></div>
          <div class="task-board">
            ${taskColumn('Queued', queued)}
            ${taskColumn('In Progress', inProgress)}
            ${taskColumn('Blocked', blocked)}
          </div>
        </section>
      </section>
    </div>
  </body>
</html>`
}
