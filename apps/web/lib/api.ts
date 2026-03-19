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
