'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
import { ChatDrawer } from './chat-drawer'
import { SkillsPage } from './skills-page'
import { KanbanBoard } from './kanban-board'
import { UsagePage } from './usage-page'
import { CronPage } from './cron-page'
import { DoctorPage } from './doctor-page'
import { ActivityPage } from './activity-page'
import { MemoryPage } from './memory-page'
import { ChannelsPage } from './channels-page'
import {
  sendChatMessage,
  fetchChatAgents,
  type ChatAgent,
} from '../lib/api'

type DashboardProps = {
  overview: OverviewResponse
  agentCards: AgentCard[]
  tasks: Task[]
  events: Event[]
  rooms: Room[]
  websocketUrl: string
  apiBaseUrl: string
}

type DashboardState = Omit<DashboardProps, 'websocketUrl' | 'apiBaseUrl'> & {
  sessions: Session[]
}

type NavPage = 'office' | 'tasks' | 'sessions' | 'events' | 'infra' | 'skills' | 'usage' | 'cron' | 'doctor' | 'activity' | 'memory' | 'channels'

// Stable color per agent name
const SPRITE_PALETTES = [
  '#7c5cfc', '#3cb7e0', '#40d680', '#fc5c8c',
  '#f0a030', '#4c8cfc', '#e05050', '#b060e0',
]

const STATUS_DOT: Record<string, string> = {
  working: '#40d680', idle: '#888', waiting: '#f0c040',
  blocked: '#e05050', failed: '#e05050', offline: '#555',
}

function agentColor(index: number) { return SPRITE_PALETTES[index % SPRITE_PALETTES.length] }

function formatTimeAgo(value?: string | null) {
  if (!value) return ''
  const diff = Date.now() - new Date(value).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  return hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs / 24)}d ago`
}

function upsertById<T extends { id: string }>(items: T[], next: T) {
  const i = items.findIndex((x) => x.id === next.id)
  if (i === -1) return [next, ...items]
  const c = [...items]; c[i] = next; return c
}

function upsertAgentCard(items: AgentCard[], next: AgentCard) {
  const i = items.findIndex((x) => x.agent.id === next.agent.id)
  if (i === -1) return [next, ...items]
  const c = [...items]; c[i] = next; return c
}

// ===== Pixel Art Characters =====

function PixelChar({ color, status, label, big }: { color: string; status?: string; label?: string; big?: boolean }) {
  const dot = status ? STATUS_DOT[status] ?? '#555' : undefined
  const sz = big ? 1.3 : 1
  return (
    <div className="pchar" style={{ transform: `scale(${sz})` }}>
      {dot && <div className="pchar__dot" style={{ background: dot }} />}
      <div className="pchar__head" style={{ background: color }}>
        <div className="pchar__eyes" />
      </div>
      <div className="pchar__body" style={{ background: color }} />
      {label && <span className="pchar__label">{label}</span>}
    </div>
  )
}

function PixelDesk() {
  return (
    <div className="pdesk">
      <div className="pdesk__monitor"><div className="pdesk__screen" /></div>
      <div className="pdesk__surface" />
      <div className="pdesk__legs" />
    </div>
  )
}

// ===== Office Zone Components =====

function ZoneLabel({ text, icon }: { text: string; icon: string }) {
  return <div className="zone-label"><span>{icon}</span> {text}</div>
}

function WorkingZone({ agents, onAgentClick }: { agents: AgentCard[]; onAgentClick: (c: AgentCard) => void }) {
  return (
    <div className="zone zone--working">
      <ZoneLabel text="Working" icon="💻" />
      <div className="zone__floor">
        {/* Windows */}
        <div className="zone-windows">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="zone-window" />)}
        </div>
        <div className="zone__agents">
          {agents.map((card, i) => (
            <div key={card.agent.id} className="agent-at-desk" onClick={() => onAgentClick(card)} title={card.currentTask?.title ?? card.agent.name}>
              <PixelChar color={agentColor(i)} status={card.agent.status} label={card.agent.name.split(' ')[0]} />
              <PixelDesk />
            </div>
          ))}
          {agents.length === 0 && <p className="zone-empty">No one working</p>}
        </div>
      </div>
    </div>
  )
}

function RestZone({ agents, onAgentClick }: { agents: AgentCard[]; onAgentClick: (c: AgentCard) => void }) {
  return (
    <div className="zone zone--rest">
      <ZoneLabel text="Lounge" icon="☕" />
      <div className="zone__floor">
        {/* Couch */}
        <div className="pixel-couch" />
        <div className="zone__agents">
          {agents.map((card, i) => (
            <div key={card.agent.id} className="agent-standing" onClick={() => onAgentClick(card)} title={card.agent.name}>
              <PixelChar color={agentColor(i + 3)} status={card.agent.status} label={card.agent.name.split(' ')[0]} />
            </div>
          ))}
          {agents.length === 0 && <p className="zone-empty">Lounge is empty</p>}
        </div>
        {/* Decorations */}
        <div className="rest-decor">
          <div className="pixel-plant" />
          <div className="pixel-cooler2" />
        </div>
      </div>
    </div>
  )
}

function MeetingZone({ agents, onAgentClick }: { agents: AgentCard[]; onAgentClick: (c: AgentCard) => void }) {
  // Atlas review zone
  const atlas = agents.find((c) => c.agent.name.toLowerCase().includes('atlas'))
  const others = agents.filter((c) => c.agent.name.toLowerCase() !== 'atlas')

  return (
    <div className="zone zone--meeting">
      <ZoneLabel text="Review Room — Atlas" icon="🧭" />
      <div className="zone__floor">
        <div className="meeting-table">
          <div className="meeting-table__surface" />
          <div className="meeting-table__chairs">
            {atlas && (
              <div className="agent-standing agent-standing--lead" onClick={() => onAgentClick(atlas)} title="Atlas — Project Manager">
                <PixelChar color="#f0a030" status={atlas.agent.status} label="Atlas" big />
              </div>
            )}
            {!atlas && <div className="agent-standing"><PixelChar color="#f0a030" status="offline" label="Atlas" /></div>}
            {others.map((card, i) => (
              <div key={card.agent.id} className="agent-standing" onClick={() => onAgentClick(card)} title={card.agent.name}>
                <PixelChar color={agentColor(i + 5)} status={card.agent.status} label={card.agent.name.split(' ')[0]} />
              </div>
            ))}
          </div>
        </div>
        <div className="meeting-decor">
          <div className="pixel-whiteboard" />
        </div>
      </div>
    </div>
  )
}

type ChatBubble = { id: string; speaker: string; text: string; color: string; expiresAt: number }
type ChatLog = { id: string; speaker: string; text: string; color: string; ts: number }

function GatherZone({ agents, apiBaseUrl }: {
  agents: AgentCard[]
  apiBaseUrl: string
}) {
  const [bubbles, setBubbles] = useState<ChatBubble[]>([])
  const [chatLog, setChatLog] = useState<ChatLog[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [repliesLeft, setRepliesLeft] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const logRef = useRef<HTMLDivElement>(null)

  // Auto-expire bubbles
  useEffect(() => {
    const timer = setInterval(() => {
      setBubbles((prev) => prev.filter((b) => b.expiresAt > Date.now()))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Scroll log to bottom
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [chatLog])

  const addBubble = useCallback((speaker: string, text: string, color: string) => {
    const truncated = text.length > 100 ? text.slice(0, 97) + '...' : text
    setBubbles((prev) => [...prev, {
      id: `b_${Date.now()}_${Math.random()}`,
      speaker, text: truncated, color,
      expiresAt: Date.now() + 10000,
    }].slice(-15))
  }, [])

  const addLog = useCallback((speaker: string, text: string, color: string) => {
    setChatLog((prev) => [...prev, {
      id: `l_${Date.now()}_${Math.random()}`,
      speaker, text, color, ts: Date.now(),
    }].slice(-50))
  }, [])

  // Get unique agent IDs for broadcast
  const agentIds = agents.map((c) => {
    // Try to match to a chat agent id (lowercase first word)
    const name = c.agent.name.split(' ')[0].toLowerCase()
    return { card: c, chatId: name }
  })

  const handleSend = useCallback(async () => {
    if (!input.trim() || sending) return
    const text = input.trim()
    setInput('')
    setSending(true)

    // Master bubble + log
    addBubble('Master', text, '#ffd700')
    addLog('Master', text, '#ffd700')

    // Broadcast: send to all agents in parallel
    const targets = agentIds.length > 0 ? agentIds : [{ card: null, chatId: 'anthropic' }]
    setRepliesLeft(targets.length)

    const promises = targets.map(async ({ card, chatId }) => {
      try {
        const result = await sendChatMessage(apiBaseUrl, chatId, text)
        const name = card?.agent.name.split(' ')[0] ?? chatId
        const idx = agents.findIndex((a) => a.agent.id === card?.agent.id)
        const color = agentColor(idx >= 0 ? idx : 0)
        addBubble(name, result.reply, color)
        addLog(name, result.reply, color)
      } catch {
        const name = card?.agent.name.split(' ')[0] ?? chatId
        addLog(name, '(failed to respond)', '#e05050')
      } finally {
        setRepliesLeft((n) => n - 1)
      }
    })

    await Promise.allSettled(promises)
    setSending(false)
    inputRef.current?.focus()
  }, [input, sending, agentIds, apiBaseUrl, agents, addBubble, addLog])

  const getBubble = (name: string) => bubbles.filter((b) => b.speaker === name).slice(-1)[0]

  return (
    <div className="zone zone--gather zone--gather-full">
      <ZoneLabel text="Gathering Hall — Team Chat" icon="🏛️" />
      <div className="gather-layout">
        {/* Left: character floor */}
        <div className="gather-floor-area">
          <div className="gather-ring">
            {/* Master */}
            <div className="gather-char" onClick={() => inputRef.current?.focus()}>
              {getBubble('Master') && (
                <div className="speech-bubble" style={{ borderColor: '#ffd700' }}>{getBubble('Master')!.text}</div>
              )}
              <div className="agent-standing agent-standing--master">
                <PixelChar color="#ffd700" label="Master" big />
                <div className="master-crown">👑</div>
              </div>
            </div>

            {/* Agents */}
            {agents.map((card, i) => {
              const name = card.agent.name.split(' ')[0]
              const bubble = getBubble(name)
              return (
                <div key={card.agent.id} className="gather-char">
                  {bubble && (
                    <div className="speech-bubble" style={{ borderColor: agentColor(i) }}>{bubble.text}</div>
                  )}
                  <div className="agent-standing" title={name}>
                    <PixelChar color={agentColor(i)} status={card.agent.status} label={name} />
                  </div>
                </div>
              )
            })}
          </div>
          {/* Decorations */}
          <div className="gather-decor">
            <div className="pixel-tree-sm" /><div className="pixel-fountain" /><div className="pixel-tree-sm" />
          </div>
        </div>

        {/* Right: chat log */}
        <div className="gather-chatlog">
          <div className="gather-chatlog__header">Team Chat</div>
          <div className="gather-chatlog__messages" ref={logRef}>
            {chatLog.length === 0 && <p className="gather-chatlog__empty">Send a message to talk to all agents at once</p>}
            {chatLog.map((entry) => (
              <div key={entry.id} className="gather-chatlog__msg">
                <strong style={{ color: entry.color }}>{entry.speaker}</strong>
                <span>{entry.text}</span>
              </div>
            ))}
            {sending && <div className="gather-chatlog__msg gather-chatlog__msg--pending"><em>Waiting for {repliesLeft} {repliesLeft === 1 ? 'reply' : 'replies'}...</em></div>}
          </div>
          <form className="gather-chat__form" onSubmit={(e) => { e.preventDefault(); handleSend() }}>
            <input
              ref={inputRef}
              className="gather-chat__input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={sending ? `Waiting for ${repliesLeft} replies...` : 'Message all agents...'}
              disabled={sending}
            />
            <button type="submit" className="gather-chat__send" disabled={sending || !input.trim()}>
              {sending ? '...' : '↵'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ===== Office Floor =====

function OfficeFloor({ agentCards, onAgentClick, apiBaseUrl }: {
  agentCards: AgentCard[]
  onAgentClick: (c: AgentCard) => void
  apiBaseUrl: string
}) {
  const working = agentCards.filter((c) => c.agent.status === 'working' || c.agent.status === 'blocked')
  const idle = agentCards.filter((c) => c.agent.status === 'idle' || c.agent.status === 'offline')
  const waiting = agentCards.filter((c) => c.agent.status === 'waiting')

  return (
    <div className="office-floor">
      <div className="office-grid">
        <div className="office-row office-row--top">
          <WorkingZone agents={working} onAgentClick={onAgentClick} />
          <MeetingZone agents={waiting} onAgentClick={onAgentClick} />
          <RestZone agents={idle} onAgentClick={onAgentClick} />
        </div>
        <GatherZone agents={agentCards} apiBaseUrl={apiBaseUrl} />
      </div>
    </div>
  )
}


function InfraPanel({ overview, lastMessageAt }: { overview: OverviewResponse; lastMessageAt: string | null }) {
  return (
    <div className="side-panel-content">
      <div className="side-panel-header"><h2>Infrastructure</h2></div>
      <div className="infra-grid">
        {[
          ['Backend', overview.health.backendStatus, overview.health.backendStatus],
          ['Gateway', overview.health.gatewayStatus, overview.health.gatewayStatus],
          ['Nodes', String(overview.health.nodesOnline), undefined],
          ['WebSocket', overview.health.websocketReady ? 'Connected' : 'Reconnecting', overview.health.websocketReady ? 'healthy' : 'degraded'],
          ['Last sync', formatTimeAgo(overview.health.lastSyncAt || lastMessageAt), undefined],
        ].map(([label, value, status]) => (
          <div key={label} className="infra-item"><span className="infra-label">{label}</span><span className="infra-value" data-status={status}>{value}</span></div>
        ))}
      </div>
      <div className="side-panel-header" style={{ marginTop: 20 }}><h2>Stats</h2></div>
      <div className="infra-grid">
        {[['Agents', overview.stats.activeAgents], ['Sessions', overview.stats.activeSessions], ['Queued', overview.stats.queuedTasks], ['In progress', overview.stats.tasksInProgress], ['Blocked', overview.stats.blockedTasks]].map(([l, v]) => (
          <div key={String(l)} className="infra-item"><span className="infra-label">{l}</span><span className="infra-value">{v}</span></div>
        ))}
      </div>
    </div>
  )
}

function AgentDetail({ card, onClose, onChat }: { card: AgentCard; onClose: () => void; onChat: () => void }) {
  return (
    <div className="agent-detail-overlay" onClick={onClose}>
      <div className="agent-detail" onClick={(e) => e.stopPropagation()}>
        <div className="agent-detail__header"><h2>{card.agent.name}</h2><button onClick={onClose} className="agent-detail__close">✕</button></div>
        <div className="agent-detail__body">
          {[['Status', card.agent.status], ['Role', card.agent.role ?? card.agent.type], ['Runtime', card.currentSession?.runtime ?? 'none'],
            ['Model', card.currentSession?.model ?? 'default'], ['Task', card.currentTask?.title ?? 'None'], ['Session', card.currentSession?.label ?? 'None'],
            ['Last activity', formatTimeAgo(card.agent.lastActivityAt)],
          ].map(([label, value]) => (
            <div key={String(label)} className="agent-detail__row"><span>{label}</span><strong>{value}</strong></div>
          ))}
        </div>
        <div className="agent-detail__footer">
          <button className="action-btn action-btn--primary" onClick={onChat}>Chat with {card.agent.name.split(' ')[0]}</button>
        </div>
      </div>
    </div>
  )
}

function LiveActivity({ events }: { events: Event[] }) {
  const recent = events.slice(0, 8)
  return (
    <div className="live-activity">
      <div className="live-activity__header"><span>Live Activity</span><span className="live-activity__badge">Last hour</span></div>
      {recent.length === 0 ? (
        <div className="live-activity__empty"><p>No recent activity</p><p className="muted-sm">Events will appear here</p></div>
      ) : (
        <div className="live-activity__list">
          {recent.map((evt) => (
            <div key={evt.id} className="live-activity__item">
              <span className="live-activity__dot" data-severity={evt.severity} /><span>{evt.message}</span><time>{formatTimeAgo(evt.ts)}</time>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ===== Main Dashboard =====

export function DashboardLive(props: DashboardProps) {
  const [state, setState] = useState<DashboardState>({
    overview: props.overview, agentCards: props.agentCards, tasks: props.tasks,
    events: props.events, rooms: props.rooms,
    sessions: props.agentCards.map((c) => c.currentSession).filter(Boolean) as Session[],
  })
  const [lastMessageAt, setLastMessageAt] = useState<string | null>(props.overview.health.lastSyncAt ?? null)
  const [activePage, setActivePage] = useState<NavPage>('office')
  const [chatOpen, setChatOpen] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<AgentCard | null>(null)
  const [chatAgents, setChatAgents] = useState<ChatAgent[]>([])

  // Load chat agents for Kanban assignment
  useEffect(() => {
    fetchChatAgents(props.apiBaseUrl).then(setChatAgents).catch(() => {})
  }, [props.apiBaseUrl])

  // WebSocket
  useEffect(() => {
    let closed = false
    const ws = new WebSocket(props.websocketUrl)
    ws.addEventListener('message', (e) => {
      try {
        const msg = JSON.parse(e.data) as MissionControlWsEvent
        setLastMessageAt(msg.ts)
        if (msg.type === 'overview.snapshot') {
          const p = msg.payload as { overview: OverviewResponse; agents: AgentCard[]; tasks: Task[]; sessions: Session[]; events: Event[]; rooms: { rooms: Room[] } }
          setState({ overview: p.overview, agentCards: p.agents, tasks: p.tasks, events: p.events, rooms: p.rooms.rooms, sessions: p.sessions })
        } else if (msg.type === 'agent.updated') setState((c) => ({ ...c, agentCards: upsertAgentCard(c.agentCards, msg.payload as AgentCard) }))
        else if (msg.type === 'task.updated') { const p = msg.payload as { task: Task }; setState((c) => ({ ...c, tasks: upsertById(c.tasks, p.task) })) }
        else if (msg.type === 'session.updated') { const p = msg.payload as { session: Session }; setState((c) => ({ ...c, sessions: upsertById(c.sessions, p.session) })) }
        else if (msg.type === 'event.created') { const p = msg.payload as { event: Event }; setState((c) => ({ ...c, events: upsertById(c.events, p.event).slice(0, 20) })) }
        else if (msg.type === 'health.updated') {
          const p = msg.payload as HealthUpdatedPayload
          setState((c) => ({ ...c, overview: { ...c.overview, health: { ...c.overview.health, backendStatus: p.backendStatus, gatewayStatus: p.gatewayStatus, nodesOnline: p.nodesOnline, websocketReady: true, lastSyncAt: p.lastSyncAt ?? msg.ts } } }))
        }
      } catch {}
    })
    ws.addEventListener('close', () => { if (!closed) setState((c) => ({ ...c, overview: { ...c.overview, health: { ...c.overview.health, websocketReady: false } } })) })
    return () => { closed = true; ws.close() }
  }, [props.websocketUrl])

  const [chatTargetAgent, setChatTargetAgent] = useState<string | null>(null)

  const handleOpenChat = useCallback((agentId?: string) => {
    if (agentId) setChatTargetAgent(agentId)
    setChatOpen(true)
  }, [])

  const handleAgentClick = useCallback((card: AgentCard) => setSelectedAgent(card), [])
  const handleAgentChat = useCallback(() => {
    const agentId = selectedAgent?.agent.metadata?.providerAgentId || selectedAgent?.agent.id?.replace('agent_', '')
    setSelectedAgent(null)
    setChatTargetAgent(agentId || null)
    setChatOpen(true)
  }, [selectedAgent])

  const NAV_ITEMS: { id: NavPage; label: string; icon: string }[] = [
    { id: 'office', label: 'Office', icon: '🏢' }, { id: 'tasks', label: 'Tasks', icon: '📋' },
    { id: 'skills', label: 'Agents', icon: '🧩' }, { id: 'usage', label: 'Usage', icon: '📊' },
    { id: 'cron', label: 'Cron', icon: '⏰' }, { id: 'memory', label: 'Memory', icon: '🧠' },
    { id: 'activity', label: 'Activity', icon: '📡' }, { id: 'channels', label: 'Channels', icon: '📱' },
    { id: 'doctor', label: 'Doctor', icon: '🩺' }, { id: 'infra', label: 'Infra', icon: '🔧' },
  ]

  return (
    <div className="mc-layout">
      <aside className="mc-sidebar">
        <div className="mc-sidebar__brand"><span className="mc-sidebar__logo">🦞</span><span className="mc-sidebar__title">Mission Control</span></div>
        <nav className="mc-sidebar__nav">
          {NAV_ITEMS.map((item) => (
            <button key={item.id} className={`mc-nav-item${activePage === item.id ? ' mc-nav-item--active' : ''}`} onClick={() => setActivePage(item.id)}>
              <span className="mc-nav-item__icon">{item.icon}</span><span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="mc-sidebar__bottom">
          <button className="mc-nav-item mc-nav-item--chat" onClick={handleOpenChat}><span className="mc-nav-item__icon">💬</span><span>Chat</span></button>
          <div className="mc-sidebar__status"><span className={`mc-status-dot${state.overview.health.websocketReady ? ' mc-status-dot--live' : ''}`} /><span>{state.overview.health.websocketReady ? 'Connected' : 'Offline'}</span></div>
        </div>
      </aside>

      <main className="mc-main">
        <header className="mc-topbar">
          <button className="mc-start-chat" onClick={handleOpenChat}>+ Start Chat</button>
          <div className="mc-stats-bar">
            <span>{state.overview.stats.activeAgents} agents</span><span>{state.overview.stats.activeSessions} sessions</span>
            <span>{state.overview.stats.queuedTasks} queued</span><span>{state.overview.stats.blockedTasks} blocked</span>
          </div>
        </header>

        {activePage === 'office' && <OfficeFloor agentCards={state.agentCards} onAgentClick={handleAgentClick} apiBaseUrl={props.apiBaseUrl} />}
        {activePage === 'tasks' && <div className="mc-center-panel"><KanbanBoard tasks={state.tasks} agents={state.agentCards} chatAgents={chatAgents} apiBaseUrl={props.apiBaseUrl} /></div>}
        {activePage === 'infra' && <div className="mc-center-panel"><InfraPanel overview={state.overview} lastMessageAt={lastMessageAt} /></div>}
        {activePage === 'skills' && <div className="mc-center-panel"><SkillsPage apiBaseUrl={props.apiBaseUrl} /></div>}
        {activePage === 'usage' && <div className="mc-center-panel"><UsagePage apiBaseUrl={props.apiBaseUrl} /></div>}
        {activePage === 'cron' && <div className="mc-center-panel"><CronPage apiBaseUrl={props.apiBaseUrl} /></div>}
        {activePage === 'doctor' && <div className="mc-center-panel"><DoctorPage apiBaseUrl={props.apiBaseUrl} /></div>}
        {activePage === 'activity' && <div className="mc-center-panel"><ActivityPage apiBaseUrl={props.apiBaseUrl} events={state.events} /></div>}
        {activePage === 'memory' && <div className="mc-center-panel"><MemoryPage apiBaseUrl={props.apiBaseUrl} /></div>}
        {activePage === 'channels' && <div className="mc-center-panel"><ChannelsPage apiBaseUrl={props.apiBaseUrl} /></div>}
      </main>

      <aside className="mc-activity"><LiveActivity events={state.events} /></aside>

      {selectedAgent && <AgentDetail card={selectedAgent} onClose={() => setSelectedAgent(null)} onChat={handleAgentChat} />}
      <ChatDrawer apiBaseUrl={props.apiBaseUrl} open={chatOpen} onClose={() => { setChatOpen(false); setChatTargetAgent(null) }} defaultAgent={chatTargetAgent} />
    </div>
  )
}
