import type {
  AgentCard,
  ApiError,
  ApiResponse,
  Event,
  GetAgentsResponse,
  GetEventsResponse,
  GetOverviewResponse,
  GetRoomsResponse,
  OverviewResponse,
  Placement,
  Room,
  Task,
  GetTasksResponse,
} from '@mission-control/contracts'

const DEFAULT_API_BASE_URL = 'http://127.0.0.1:4000'

function getApiBaseUrl() {
  return (process.env.MISSION_CONTROL_API_URL || process.env.NEXT_PUBLIC_MISSION_CONTROL_API_URL || DEFAULT_API_BASE_URL).replace(/\/$/, '')
}

async function requestJson<T>(path: string): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    cache: 'no-store',
    next: { revalidate: 0 },
  })

  const payload = (await response.json()) as ApiResponse<T> | ApiError

  if (!response.ok || !('data' in payload)) {
    const message = 'error' in payload ? payload.error.message : `Request failed for ${path}`
    throw new Error(message)
  }

  return payload.data
}

export async function getDashboardData(): Promise<{
  overview: OverviewResponse
  agentCards: AgentCard[]
  tasks: Task[]
  events: Event[]
  rooms: Room[]
  placements: Placement[]
  apiBaseUrl: string
}> {
  const [overview, agents, tasks, events, rooms] = await Promise.all([
    requestJson<GetOverviewResponse['data']>('/api/v1/overview'),
    requestJson<GetAgentsResponse['data']>('/api/v1/agents'),
    requestJson<GetTasksResponse['data']>('/api/v1/tasks'),
    requestJson<GetEventsResponse['data']>('/api/v1/events'),
    requestJson<GetRoomsResponse['data']>('/api/v1/rooms'),
  ])

  return {
    overview,
    agentCards: agents.items,
    tasks: tasks.items,
    events: events.items,
    rooms: rooms.rooms,
    placements: rooms.placements,
    apiBaseUrl: getApiBaseUrl(),
  }
}

export function getWebsocketUrl(apiBaseUrl: string) {
  const url = new URL(apiBaseUrl)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.pathname = '/ws/v1'
  url.search = ''
  return url.toString()
}

// --- Client-side mutation helpers ---

async function mutateJson<T>(apiBaseUrl: string, path: string, method: 'POST' | 'PATCH', body?: unknown): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })

  const payload = (await response.json()) as ApiResponse<T> | ApiError

  if (!response.ok || !('data' in payload)) {
    const message = 'error' in payload ? payload.error.message : `Request failed`
    throw new Error(message)
  }

  return payload.data
}

export async function createTask(apiBaseUrl: string, input: { title: string; description?: string; priority?: string; tags?: string[] }) {
  return mutateJson<{ task: Task }>(apiBaseUrl, '/api/v1/tasks', 'POST', input)
}

export async function updateTaskStatus(apiBaseUrl: string, id: string, patch: Record<string, unknown>) {
  return mutateJson<{ task: Task }>(apiBaseUrl, `/api/v1/tasks/${id}`, 'PATCH', patch)
}

export async function assignTask(apiBaseUrl: string, id: string, agentId: string) {
  return mutateJson<{ task: Task }>(apiBaseUrl, `/api/v1/tasks/${id}/assign`, 'POST', { agentId })
}

export async function retryTask(apiBaseUrl: string, id: string, reason?: string) {
  return mutateJson<{ task: Task }>(apiBaseUrl, `/api/v1/tasks/${id}/retry`, 'POST', { reason })
}

export async function sendSessionMessage(apiBaseUrl: string, id: string, message: string) {
  return mutateJson(apiBaseUrl, `/api/v1/sessions/${id}/message`, 'POST', { message })
}

export async function stopSession(apiBaseUrl: string, id: string, reason?: string) {
  return mutateJson(apiBaseUrl, `/api/v1/sessions/${id}/stop`, 'POST', { reason })
}

// --- Chat API ---

export type ChatAgent = {
  id: string
  name: string
  emoji: string | null
  model: string | null
  isDefault: boolean
}

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  ts: string
  sessionId?: string | null
  model?: string | null
  provider?: string | null
  durationMs?: number | null
  usage?: { input?: number; output?: number; total?: number } | null
}

export type ChatReply = {
  reply: string
  sessionId: string | null
  model: string | null
  provider: string | null
  durationMs: number | null
  usage: { input?: number; output?: number; total?: number } | null
}

export async function fetchChatAgents(apiBaseUrl: string): Promise<ChatAgent[]> {
  const response = await fetch(`${apiBaseUrl}/api/v1/chat/agents`, { cache: 'no-store' })
  const payload = await response.json()
  if (!response.ok || !('data' in payload)) throw new Error(payload.error?.message || 'Failed to list agents')
  return payload.data.agents
}

export async function fetchChatHistory(apiBaseUrl: string, agentId: string): Promise<ChatMessage[]> {
  const response = await fetch(`${apiBaseUrl}/api/v1/chat/${agentId}/history`, { cache: 'no-store' })
  const payload = await response.json()
  if (!response.ok || !('data' in payload)) throw new Error(payload.error?.message || 'Failed to fetch history')
  return payload.data.messages
}

export async function sendChatMessage(apiBaseUrl: string, agentId: string, message: string, sessionId?: string): Promise<ChatReply> {
  return mutateJson<ChatReply>(apiBaseUrl, `/api/v1/chat/${agentId}/message`, 'POST', { message, sessionId })
}

export async function clearChat(apiBaseUrl: string, agentId: string) {
  return mutateJson(apiBaseUrl, `/api/v1/chat/${agentId}/history`, 'POST')
}
