import type { Agent, Event, Session, Task } from './domain'

export type WsEnvelope<T = unknown> = {
  type: string
  ts: string
  payload: T
}

export type ConnectionHelloPayload = {
  version: 'v1'
  serverTime: string
}

export type AgentUpdatedPayload = {
  agent: Agent
  currentSession?: Session | null
  currentTask?: Task | null
}

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
  | WsEnvelope<AgentUpdatedPayload>
  | WsEnvelope<SessionUpdatedPayload>
  | WsEnvelope<TaskUpdatedPayload>
  | WsEnvelope<EventCreatedPayload>
  | WsEnvelope<HealthUpdatedPayload>
