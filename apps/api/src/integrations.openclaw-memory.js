import { openclawExec, openclawExecRaw, OPENCLAW_CONTAINER } from './lib/openclaw-exec.js'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

// Map agent IDs to their workspace dirs
const WORKSPACE_MAP = {
  anthropic: '/home/node/.openclaw/workspace',
  jarvis: '/home/node/.openclaw/workspace-jarvis',
  atlas: '/home/node/.openclaw/workspace-atlas',
  leonardo: '/home/node/.openclaw/workspace-leonardo',
}

function getWorkspaceDir(agentId) {
  return WORKSPACE_MAP[agentId] || `/home/node/.openclaw/workspace-${agentId}`
}

export async function listMemoryFiles(agentId) {
  const dir = `${getWorkspaceDir(agentId)}/memory`
  try {
    const { stdout } = await execAsync(
      `docker exec ${OPENCLAW_CONTAINER} sh -c 'ls -1 ${dir}/*.md 2>/dev/null || true'`,
      { timeout: 10000 }
    )
    const files = stdout.trim().split('\n').filter(Boolean).map((path) => {
      const name = path.split('/').pop().replace('.md', '')
      return { name, path, date: name }
    })
    return files.sort((a, b) => b.name.localeCompare(a.name))
  } catch {
    return []
  }
}

export async function readMemoryFile(agentId, filename) {
  const dir = `${getWorkspaceDir(agentId)}/memory`
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '')
  try {
    const { stdout } = await execAsync(
      `docker exec ${OPENCLAW_CONTAINER} cat "${dir}/${safeName}.md"`,
      { timeout: 10000, maxBuffer: 1024 * 1024 }
    )
    return stdout
  } catch {
    return null
  }
}

export async function writeMemoryFile(agentId, filename, content) {
  const dir = `${getWorkspaceDir(agentId)}/memory`
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '')
  const escaped = content.replace(/'/g, "'\\''")
  await execAsync(
    `docker exec ${OPENCLAW_CONTAINER} sh -c 'cat > "${dir}/${safeName}.md" << '"'"'MEMEOF'"'"'\n${escaped}\nMEMEOF'`,
    { timeout: 10000 }
  )
}

export async function getMemoryStatus(agentId) {
  try {
    const statuses = await openclawExec('openclaw memory status --json')
    if (Array.isArray(statuses)) return statuses.find((s) => s.agentId === agentId) || statuses[0] || null
    return statuses
  } catch {
    return null
  }
}

export async function searchMemory(agentId, query) {
  try {
    const safeQuery = query.replace(/"/g, '\\"')
    const data = await openclawExec(`openclaw memory search "${safeQuery}" --json --max-results 20`, { timeout: 20000 })
    return data.results || []
  } catch {
    return []
  }
}

export async function reindexMemory() {
  try {
    await openclawExecRaw('openclaw memory index --force', { timeout: 60000 })
    return true
  } catch {
    return false
  }
}
