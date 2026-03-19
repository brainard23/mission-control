import { DashboardLive } from './dashboard-live'
import { getDashboardData, getWebsocketUrl } from '../lib/api'

export default async function HomePage() {
  const data = await getDashboardData()

  return (
    <DashboardLive
      overview={data.overview}
      agentCards={data.agentCards}
      tasks={data.tasks}
      events={data.events}
      rooms={data.rooms}
      websocketUrl={getWebsocketUrl(data.apiBaseUrl)}
      apiBaseUrl={data.apiBaseUrl}
    />
  )
}
