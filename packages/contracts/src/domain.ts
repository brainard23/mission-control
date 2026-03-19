export type AgentType = 'main' | 'subagent' | 'acp' | 'system'
export type AgentStatus = 'idle' | 'working' | 'waiting' | 'blocked' | 'failed' | 'offline'

export type SessionRuntime = 'main' | 'subagent' | 'acp'
export type SessionState = 'active' | 'paused' | 'done' | 'failed'

export type TaskStatus = 'queued' | 'in_progress' | 'waiting' | 'blocked' | 'done' | 'failed'
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'

export type EventSeverity = 'info' | 'warning' | 'error'
export type RoomKind = 'team' | 'workflow' | 'infra' | 'custom'

export type Agent = {
  id: string
  name: string
  type: AgentType
  role?: string | null
  capabilities: string[]
  status: AgentStatus
  roomId?: string | null
  currentSessionId?: string | null
  currentTaskId?: string | null
  lastActivityAt: string
  runtimeSource: 'openclaw'
  metadata?: Record<string, unknown>
}

export type Session = {
  id: string
  label?: string | null
  agentId: string
  runtime: SessionRuntime
  model?: string | null
  state: SessionState
  startedAt: string
  lastActivityAt: string
  currentTaskId?: string | null
  summary?: string | null
  metadata?: Record<string, unknown>
}

export type Task = {
  id: string
  title: string
  description?: string | null
  status: TaskStatus
  priority: TaskPriority
  assignedAgentId?: string | null
  sessionId?: string | null
  blockerReason?: string | null
  tags: string[]
  source: string
  createdBy?: string | null
  createdAt: string
  updatedAt: string
  completedAt?: string | null
  metadata?: Record<string, unknown>
}

export type Event = {
  id: string
  ts: string
  kind: string
  severity: EventSeverity
  message: string
  agentId?: string | null
  sessionId?: string | null
  taskId?: string | null
  metadata?: Record<string, unknown>
}

export type Room = {
  id: string
  name: string
  kind: RoomKind
  sortOrder: number
  metadata?: Record<string, unknown>
}

export type Placement = {
  id: string
  roomId: string
  agentId: string
  x: number
  y: number
  w: number
  h: number
  zIndex: number
  metadata?: Record<string, unknown>
}

export type TaskHistoryEntry = {
  id: string
  fromStatus?: TaskStatus | null
  toStatus?: TaskStatus | null
  message?: string | null
  actor?: string | null
  eventKind: string
  createdAt: string
  metadata?: Record<string, unknown>
}

export type AgentCard = {
  agent: Agent
  currentSession?: Session | null
  currentTask?: Task | null
  room?: Room | null
  placement?: Placement | null
}

export type SessionDetail = {
  session: Session
  agent: Agent
  currentTask?: Task | null
  recentEvents: Event[]
  availableActions: {
    canMessage: boolean
    canStop: boolean
  }
}

export type TaskDetail = {
  task: Task
  assignedAgent?: Agent | null
  session?: Session | null
  history: TaskHistoryEntry[]
  recentEvents: Event[]
  availableActions: {
    canAssign: boolean
    canRetry: boolean
    canMarkDone: boolean
  }
}

export type OverviewResponse = {
  stats: {
    activeAgents: number
    activeSessions: number
    queuedTasks: number
    tasksInProgress: number
    blockedTasks: number
    failedTasks: number
    staleAgents: number
    staleSessions: number
  }
  alerts: {
    id: string
    kind: string
    severity: EventSeverity
    message: string
    agentId?: string | null
    sessionId?: string | null
    taskId?: string | null
  }[]
  health: {
    backendStatus: 'healthy' | 'degraded' | 'down'
    gatewayStatus: 'healthy' | 'degraded' | 'down' | 'unknown'
    nodesOnline: number
    websocketReady: boolean
    lastSyncAt?: string | null
  }
  recentEvents: Event[]
}
