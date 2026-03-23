import { exec, execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)
const execFileAsync = promisify(execFile)
const OPENCLAW_CONTAINER = process.env.OPENCLAW_CONTAINER || 'openclaw-openclaw-gateway-1'

function parseJson(stdout) {
  const trimmed = stdout.trim()
  // Find first { or [
  const i = trimmed.indexOf('{')
  const j = trimmed.indexOf('[')
  const start = i >= 0 && j >= 0 ? Math.min(i, j) : Math.max(i, j)
  if (start < 0) throw new Error('No JSON found in output')
  return JSON.parse(trimmed.slice(start))
}

// Build docker exec args array — avoids shell quoting issues entirely
function buildDockerArgs(cmd) {
  return ['exec', '-e', 'NO_COLOR=1', OPENCLAW_CONTAINER, 'sh', '-c', cmd]
}

export async function openclawExec(cmd, { timeout = 45000, retries = 2 } = {}) {
  let lastError
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { stdout } = await execFileAsync(
        'docker',
        buildDockerArgs(cmd),
        { timeout, maxBuffer: 10 * 1024 * 1024 }
      )
      return parseJson(stdout)
    } catch (err) {
      lastError = err
      // If it's a JSON parse error (truncated output), retry
      if (err.message?.includes('JSON') && attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000))
        continue
      }
      // If the command itself failed (exit code), check if stdout has JSON
      if (err.stdout) {
        try { return parseJson(err.stdout) } catch {}
      }
      throw err
    }
  }
  throw lastError
}

export async function openclawExecRaw(cmd, { timeout = 45000 } = {}) {
  const { stdout } = await execFileAsync(
    'docker',
    buildDockerArgs(cmd),
    { timeout, maxBuffer: 10 * 1024 * 1024 }
  )
  return stdout.trim()
}

export { OPENCLAW_CONTAINER }
