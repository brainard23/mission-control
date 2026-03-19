import { createServer } from 'node:http'
import { renderAppShell } from './app-shell.js'
import { overview, agentCards, tasks, events, rooms } from './mock-overview.js'

const port = Number(process.env.PORT || 3000)

const server = createServer((req, res) => {
  if ((req.url || '/') !== '/') {
    res.writeHead(404, { 'content-type': 'text/plain' })
    res.end('Not found')
    return
  }

  const html = renderAppShell({ overview, agentCards, tasks, events, rooms })
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
  res.end(html)
})

server.listen(port, () => {
  console.log(`Mission Control web listening on http://localhost:${port}`)
})
