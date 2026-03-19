import type { AgentCard, Event, OverviewResponse, Room, Session, Task } from './domain'

export type WsEnvelope<T = unknown> = {
  type: string
  ts: string
  payload: T
}

export type ConnectionHelloPayload = {
  version: 'v1'
  serverTime: string
}

export type DashboardSnapshotPayload = {
  overview: OverviewResponse
  agents: AgentCard[]
  tasks: Task[]
  sessions: Session[]
  events: Event[]
  rooms: {
    rooms: Room[]
    placements: import('./domain').Placement[]
  }
}

export type AgentUpdatedPayload = AgentCard

export type SessionUpdatedPayload = {
  session: Session
}

export type TaskUpdatedPayload = {
  task: Task
}

export type EventCreatedPayload = {
  event: Event
}

export type HealthUpdatedPayload = {
  backendStatus: 'healthy' | 'degraded' | 'down'
  gatewayStatus: 'healthy' | 'degraded' | 'down' | 'unknown'
  nodesOnline: number
  lastSyncAt?: string | null
}

export type MissionControlWsEvent =
  | WsEnvelope<ConnectionHelloPayload>
  | WsEnvelope<DashboardSnapshotPayload>
  | WsEnvelope<AgentUpdatedPayload>
  | WsEnvelope<SessionUpdatedPayload>
  | WsEnvelope<TaskUpdatedPayload>
  | WsEnvelope<EventCreatedPayload>
  | WsEnvelope<HealthUpdatedPayload>
