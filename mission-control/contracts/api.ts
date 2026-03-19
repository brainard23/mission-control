import type { TaskPriority, TaskStatus, Agent, AgentCard, Event, OverviewResponse, Placement, Room, Session, SessionDetail, Task, TaskDetail } from './domain'

export type ApiResponse<T> = {
  data: T
  meta?: {
    requestId?: string
    nextCursor?: string | null
  }
}

export type ApiError = {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

export type CreateTaskRequest = {
  title: string
  description?: string
  priority?: TaskPriority
  tags?: string[]
  assignedAgentId?: string
  metadata?: Record<string, unknown>
}

export type UpdateTaskRequest = {
  title?: string
  description?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  blockerReason?: string | null
  tags?: string[]
  metadata?: Record<string, unknown>
}

export type AssignTaskRequest = {
  agentId: string
}

export type RetryTaskRequest = {
  reason?: string
}

export type SendSessionMessageRequest = {
  message: string
}

export type StopSessionRequest = {
  reason?: string
}

export type CreateRoomRequest = {
  name: string
  kind?: 'team' | 'workflow' | 'infra' | 'custom'
  sortOrder?: number
  metadata?: Record<string, unknown>
}

export type UpdatePlacementRequest = {
  x?: number
  y?: number
  w?: number
  h?: number
  zIndex?: number
}

export type GetOverviewResponse = ApiResponse<OverviewResponse>
export type GetAgentsResponse = ApiResponse<{ items: AgentCard[] }>
export type GetAgentResponse = ApiResponse<{
  agent: Agent
  currentSession?: Session | null
  currentTask?: Task | null
  room?: Room | null
  placement?: Placement | null
  recentEvents: Event[]
}>
export type GetSessionsResponse = ApiResponse<{ items: Session[] }>
export type GetSessionResponse = ApiResponse<SessionDetail>
export type GetTasksResponse = ApiResponse<{ items: Task[] }>
export type GetTaskResponse = ApiResponse<TaskDetail>
export type GetEventsResponse = ApiResponse<{ items: Event[] }>
export type GetRoomsResponse = ApiResponse<{ rooms: Room[]; placements: Placement[] }>
export type GetHealthResponse = ApiResponse<{
  backendStatus: 'healthy' | 'degraded' | 'down'
  gatewayStatus: 'healthy' | 'degraded' | 'down' | 'unknown'
  nodesOnline: number
  sync: {
    lastSyncAt?: string | null
    adapterFailures: number
  }
  websocketReady: boolean
}>
export type CreateTaskResponse = ApiResponse<{ task: Task }>
export type UpdateTaskResponse = ApiResponse<{ task: Task }>
export type AssignTaskResponse = ApiResponse<{ task: Task }>
export type RetryTaskResponse = ApiResponse<{ task: Task }>
export type SendSessionMessageResponse = ApiResponse<{ accepted: boolean; sessionId: string; auditId?: string }>
export type StopSessionResponse = ApiResponse<{ accepted: boolean; sessionId: string; auditId?: string }>
