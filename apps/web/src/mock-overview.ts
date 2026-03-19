import type { OverviewResponse, AgentCard, Session, Task, Event, Room, Placement } from '@mission-control/contracts'

export const rooms: Room[] = [
  { id: 'room_eng', name: 'Engineering', kind: 'team', sortOrder: 1 },
  { id: 'room_auto', name: 'Automation Bay', kind: 'workflow', sortOrder: 2 },
]

export const placements: Placement[] = [
  { id: 'place_1', roomId: 'room_eng', agentId: 'agent_reviewer', x: 0, y: 0, w: 1, h: 1, zIndex: 0 },
  { id: 'place_2', roomId: 'room_eng', agentId: 'agent_builder', x: 1, y: 0, w: 1, h: 1, zIndex: 0 },
  { id: 'place_3', roomId: 'room_auto', agentId: 'agent_cron', x: 0, y: 0, w: 1, h: 1, zIndex: 0 },
]

export const sessions: Session[] = [
  {
    id: 'sess_review_1',
    label: 'review-pr-123',
    agentId: 'agent_reviewer',
    runtime: 'subagent',
    model: 'claude',
    state: 'active',
    startedAt: '2026-03-19T07:00:00Z',
    lastActivityAt: '2026-03-19T07:30:00Z',
    currentTaskId: 'task_review_pr',
    summary: 'Reviewing API and schema updates',
  },
  {
    id: 'sess_build_1',
    label: 'fix-auth-edge-case',
    agentId: 'agent_builder',
    runtime: 'acp',
    model: 'codex',
    state: 'active',
    startedAt: '2026-03-19T07:02:00Z',
    lastActivityAt: '2026-03-19T07:28:00Z',
    currentTaskId: 'task_auth_fix',
    summary: 'Blocked on missing browser login state',
  },
]

export const tasks: Task[] = [
  {
    id: 'task_review_pr',
    title: 'Review PR #123',
    description: 'Review API contract changes for Mission Control',
    status: 'in_progress',
    priority: 'high',
    assignedAgentId: 'agent_reviewer',
    sessionId: 'sess_review_1',
    tags: ['review', 'api'],
    source: 'manual',
    createdAt: '2026-03-19T06:58:00Z',
    updatedAt: '2026-03-19T07:30:00Z',
  },
  {
    id: 'task_auth_fix',
    title: 'Fix auth edge case',
    description: 'Investigate auth flow issue in browser relay setup',
    status: 'blocked',
    priority: 'urgent',
    assignedAgentId: 'agent_builder',
    sessionId: 'sess_build_1',
    blockerReason: 'Awaiting browser login state',
    tags: ['auth', 'browser'],
    source: 'manual',
    createdAt: '2026-03-19T07:00:00Z',
    updatedAt: '2026-03-19T07:28:00Z',
  },
  {
    id: 'task_floor_ui',
    title: 'Design Office View cards',
    description: 'Create first pass on Office View table cards',
    status: 'queued',
    priority: 'normal',
    tags: ['ui', 'office'],
    source: 'manual',
    createdAt: '2026-03-19T07:10:00Z',
    updatedAt: '2026-03-19T07:10:00Z',
  },
]

export const events: Event[] = [
  {
    id: 'evt_1',
    ts: '2026-03-19T07:30:00Z',
    kind: 'task.updated',
    severity: 'info',
    message: 'Review PR #123 is in progress',
    agentId: 'agent_reviewer',
    sessionId: 'sess_review_1',
    taskId: 'task_review_pr',
  },
  {
    id: 'evt_2',
    ts: '2026-03-19T07:28:00Z',
    kind: 'task.blocked',
    severity: 'warning',
    message: 'Fix auth edge case blocked: Awaiting browser login state',
    agentId: 'agent_builder',
    sessionId: 'sess_build_1',
    taskId: 'task_auth_fix',
  },
]

export const agentCards: AgentCard[] = [
  {
    agent: {
      id: 'agent_reviewer',
      name: 'Reviewer',
      type: 'subagent',
      role: 'Code Review',
      capabilities: ['review', 'debug'],
      status: 'working',
      roomId: 'room_eng',
      currentSessionId: 'sess_review_1',
      currentTaskId: 'task_review_pr',
      lastActivityAt: '2026-03-19T07:30:00Z',
      runtimeSource: 'openclaw',
    },
    currentSession: sessions[0],
    currentTask: tasks[0],
    room: rooms[0],
    placement: placements[0],
  },
  {
    agent: {
      id: 'agent_builder',
      name: 'Builder',
      type: 'acp',
      role: 'Implementation',
      capabilities: ['build', 'refactor'],
      status: 'blocked',
      roomId: 'room_eng',
      currentSessionId: 'sess_build_1',
      currentTaskId: 'task_auth_fix',
      lastActivityAt: '2026-03-19T07:28:00Z',
      runtimeSource: 'openclaw',
    },
    currentSession: sessions[1],
    currentTask: tasks[1],
    room: rooms[0],
    placement: placements[1],
  },
  {
    agent: {
      id: 'agent_cron',
      name: 'Cron Runner',
      type: 'system',
      role: 'Scheduled Automation',
      capabilities: ['schedule'],
      status: 'idle',
      roomId: 'room_auto',
      currentSessionId: null,
      currentTaskId: null,
      lastActivityAt: '2026-03-19T07:15:00Z',
      runtimeSource: 'openclaw',
    },
    currentSession: null,
    currentTask: null,
    room: rooms[1],
    placement: placements[2],
  },
]

export const overview: OverviewResponse = {
  stats: {
    activeAgents: 3,
    activeSessions: 2,
    queuedTasks: 1,
    tasksInProgress: 1,
    blockedTasks: 1,
    failedTasks: 0,
    staleAgents: 0,
    staleSessions: 0,
  },
  alerts: [
    {
      id: 'alert_task_auth_fix',
      kind: 'blocked_task',
      severity: 'warning',
      message: 'Fix auth edge case is blocked awaiting browser login state',
      taskId: 'task_auth_fix',
      agentId: 'agent_builder',
      sessionId: 'sess_build_1',
    },
  ],
  health: {
    backendStatus: 'healthy',
    gatewayStatus: 'unknown',
    nodesOnline: 0,
    websocketReady: false,
    lastSyncAt: new Date().toISOString(),
  },
  recentEvents: events,
}
