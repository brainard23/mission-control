import type { OverviewResponse } from '@mission-control/contracts'

export function AppShell(props: { overview?: OverviewResponse }) {
  return (
    <main>
      <header>
        <h1>Mission Control</h1>
        <p>Overview | Office | Sessions | Tasks | Events | Infra</p>
      </header>
      <section>
        <h2>Scaffold ready</h2>
        <p>The real Next.js UI should be added here next.</p>
        {props.overview ? <pre>{JSON.stringify(props.overview, null, 2)}</pre> : null}
      </section>
    </main>
  )
}
