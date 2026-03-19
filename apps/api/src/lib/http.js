import { parse } from 'node:url'

export function createApp() {
  const routes = []

  function add(method, path, handler) {
    routes.push({ method, path, handler })
  }

  function match(method, pathname) {
    for (const route of routes) {
      if (route.method !== method) continue

      const routeParts = route.path.split('/').filter(Boolean)
      const pathParts = pathname.split('/').filter(Boolean)
      if (routeParts.length !== pathParts.length) continue

      const params = {}
      let ok = true
      for (let i = 0; i < routeParts.length; i += 1) {
        const routePart = routeParts[i]
        const pathPart = pathParts[i]
        if (routePart.startsWith(':')) {
          params[routePart.slice(1)] = pathPart
          continue
        }
        if (routePart !== pathPart) {
          ok = false
          break
        }
      }
      if (ok) return { route, params }
    }
    return null
  }

  async function handle(req, res) {
    const method = req.method || 'GET'
    const { pathname, query } = parse(req.url || '/', true)
    const found = match(method, pathname || '/')
    if (!found) {
      return json(res, 404, { error: { code: 'NOT_FOUND', message: 'Route not found' } })
    }

    const body = await readBody(req)
    const request = { params: found.params, query, body, method, pathname: pathname || '/' }
    return found.route.handler(request, res)
  }

  return {
    get(path, handler) {
      add('GET', path, handler)
    },
    post(path, handler) {
      add('POST', path, handler)
    },
    patch(path, handler) {
      add('PATCH', path, handler)
    },
    handle,
  }
}

export function json(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(payload))
}

export async function readBody(req) {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      if (!body) return resolve({})
      try {
        resolve(JSON.parse(body))
      } catch {
        resolve({})
      }
    })
  })
}
